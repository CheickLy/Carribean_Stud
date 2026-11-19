import { Op, type Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { Lobby } from '../../models/lobby.js';
import { LobbyMember } from '../../models/lobbyMember.js';
import { User } from '../../models/user.js';
import { Session } from '../../models/session.js';
import { GameHand } from '../../models/gameHand.js';
import { TableGame } from '../../models/tableGame.js';
import { advance, applyCommand, cents, GameError, money, newRound, tableView, type Command, type Settings, type Table } from './engine.js';
export type TableCommand = Command | { kind: 'add-bot'; requestId: string };

function settingsFor(lobby: Lobby): Settings {
  const settings = { name: lobby.name, min: cents(lobby.minBet), max: cents(lobby.maxBet), starting: cents(lobby.startingMoney), maxPlayers: lobby.maxPlayers, bots: lobby.botsEnabled, allowBets: lobby.allowBets, autoIncr: lobby.autoIncr, increase: cents(lobby.increaseAmount), every: lobby.increaseEveryHands };
  if (settings.min <= 0 || settings.max < settings.min || settings.starting <= 0 || (settings.autoIncr && (settings.every <= 0 || settings.increase <= 0))) throw new GameError(409, 'This table needs valid bet limits and starting chips before play.');
  return settings;
}
async function saveProgress(table: Table, transaction: Transaction) {
  // Called only when an existing round advances to deciding/completed.
  const round = table.round!;
  await Session.update({ status: round.phase, dealerCards: JSON.stringify(round.dealer) }, { where: { sessionId: round.id }, transaction });
  if (round.phase !== 'completed') return;
  for (const player of round.players) if (player.result) {
    const seat = table.seats.find(seat => seat.id === player.id)!;
    await GameHand.create({ sessionId: round.id, userId: seat.userId, playerLabel: seat.name, playerCards: JSON.stringify(player.cards), anteBet: money(player.ante), callBet: player.action === 'raise' ? money(player.ante * 2) : 0, payout: money(player.result.returned), netChange: money(player.result.net), outcome: player.result.message }, { transaction });
  }
}

// All table reads and mutations serialize on the same lobby row as admissions.
// Settlement, bankrolls, phase changes, and history commit in one transaction.
export async function sharedTable(lobbyId: number, userId: number | null, command?: TableCommand, at?: number) {
  const response = await sequelize.transaction(async transaction => {
    const lobby = await Lobby.findByPk(lobbyId, { transaction, lock: transaction.LOCK.UPDATE });
    const now = at ?? Date.now();
    if (!lobby || !lobby.isActive) throw new GameError(404, 'Table not found.');
    const settings = settingsFor(lobby);
    const members = await LobbyMember.findAll({ where: { lobbyId }, transaction });
    const ids = [...new Set([lobby.hostId, ...members.map(member => member.userId)])];
    if (userId !== null && !ids.includes(userId)) throw new GameError(403, 'Join this table before playing.');
    const users = await User.findAll({ where: { userId: { [Op.in]: ids } }, transaction });
    const caller = users.find(user => user.userId === userId);
    if (userId !== null && (!caller || caller.isBanned)) throw new GameError(403, 'This account cannot play.');
    const stored = await TableGame.findByPk(lobbyId, { transaction });
    const table: Table = stored ? structuredClone(stored.state) : { seats: [], round: null, handsPlayed: 0 };
    table.botCount ??= table.seats.filter(seat => seat.bot).length;
    table.botRequests ??= [];
    for (const user of users.filter(user => !user.isBanned)) {
      const seat = table.seats.find(seat => seat.userId === user.userId);
      if (seat) seat.name = user.isGuest ? 'Guest' : user.username;
      else table.seats.push({ id: `u${user.userId}`, userId: user.userId, name: user.isGuest ? 'Guest' : user.username, bot: false, balance: settings.starting, lastSeen: 0, active: false });
    }
    // Removed/banned users cannot continue a round or keep the table waiting.
    const allowed = new Set(users.filter(user => !user.isBanned).map(user => user.userId));
    for (const seat of table.seats) if (!seat.bot && !allowed.has(seat.userId!)) {
      seat.active = false;
      const player = table.round?.players.find(player => player.id === seat.id);
      if (player && !player.action) { if (player.ante) player.action = 'fold'; else player.skipped = true; }
    }
    // First expire old deadlines. Late requests must never revive an old hand.
    const oldPhase = table.round?.phase;
    let changed = advance(table, now);
    if (changed || table.round?.phase !== oldPhase) await saveProgress(table, transaction);
    let error: GameError | undefined;
    const own = table.seats.find(seat => seat.userId === userId);
    if (command && own) {
      try {
        if (command.kind === 'add-bot') {
          if (userId !== lobby.hostId) throw new GameError(403, 'Only the host can add bots.');
          if (!settings.bots) throw new GameError(403, 'Bots are disabled for this lobby.');
          if (!table.botRequests.includes(command.requestId)) {
            if (ids.length + table.botCount >= settings.maxPlayers) throw new GameError(409, 'There are no available seats for a bot.');
            table.botCount++;
            table.botRequests.push(command.requestId);
            table.botRequests = table.botRequests.slice(-100);
            const botId = `bot${table.botCount}`;
            if (!table.seats.some(seat => seat.id === botId)) table.seats.push({ id: botId, userId: null, name: `Reef Bot ${table.botCount}`, bot: true, balance: settings.starting, lastSeen: now, active: true });
          }
          own.lastSeen = now;
        } else applyCommand(table, own, command, now);
      }
      catch (cause) { if (cause instanceof GameError) error = cause; else throw cause; }
    }
    const phaseBefore = table.round?.phase;
    changed = advance(table, now);
    if (changed || table.round?.phase !== phaseBefore) await saveProgress(table, transaction);
    if (!table.round || (table.round.phase === 'completed' && now >= table.round.deadline)) {
      // Bots occupy only seats not reserved for human lobby members.
      const humans = table.seats.filter(seat => !seat.bot && allowed.has(seat.userId!));
      const previousBots = table.seats.filter(seat => seat.bot);
      table.seats = humans;
      table.botCount = settings.bots ? Math.min(table.botCount, Math.max(0, settings.maxPlayers - ids.length)) : 0;
      // Preserve bankrolls, including bots just added during this request.
      const savedBots = stored?.state.seats.filter(seat => seat.bot) ?? [];
      for (let index = 0; index < table.botCount; index++) {
        const id = `bot${index + 1}`;
        const previous = previousBots.find(seat => seat.id === id) ?? savedBots.find(seat => seat.id === id);
        table.seats.push(previous ?? { id, userId: null, name: `Reef Bot ${index + 1}`, bot: true, balance: settings.starting, lastSeen: now, active: true });
      }
      const round = newRound(table, settings, 0, now);
      if (round) {
        const session = await Session.create({ lobbyId, status: 'betting', dealerCards: null }, { transaction });
        round.id = session.sessionId;
      }
    }
    if (stored) await stored.update({ state: table }, { transaction });
    else await TableGame.create({ lobbyId, state: table }, { transaction });
    const view = userId !== null ? { ...tableView(table, settings, userId, now), isHost: userId === lobby.hostId, botCount: table.botCount, canAddBot: settings.bots && userId === lobby.hostId && ids.length + table.botCount < settings.maxPlayers } : null;
    return { view, error };
  });
  // Commit timer advancement even when a late or duplicate conflicting action is rejected.
  if (response.error) throw response.error;
  return response.view;
}

export async function handHistory(lobbyId: number, userId: number) {
  // Authorization and current account status use the same gate as gameplay.
  await sharedTable(lobbyId, userId);
  const sessions = await Session.findAll({ where: { lobbyId, status: 'completed' }, attributes: ['sessionId', 'dealerCards', 'createdAt'], order: [['sessionId', 'DESC']] });
  if (!sessions.length) return [];
  const hands = await GameHand.findAll({ where: { userId, sessionId: { [Op.in]: sessions.map(session => session.sessionId) }, anteBet: { [Op.ne]: null } }, order: [['handId', 'DESC']], limit: 20 });
  return hands.map(hand => {
    const session = sessions.find(session => session.sessionId === hand.sessionId)!;
    return { handId: hand.handId, roundId: hand.sessionId, playedAt: session.createdAt, playerCards: JSON.parse(hand.playerCards!), dealerCards: JSON.parse(session.dealerCards!), ante: Number(hand.anteBet), raise: Number(hand.callBet), returned: Number(hand.payout), net: Number(hand.netChange), message: hand.outcome };
  });
}

export function startTableClock() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const tables = await TableGame.findAll({ attributes: ['lobbyId'] });
      for (const table of tables) {
        try { await sharedTable(table.lobbyId, null); }
        catch (error) { if (!(error instanceof GameError)) console.error('Table clock failed', error); }
      }
    } catch (error) { console.error('Table clock unavailable', error); }
    finally { running = false; }
  }, 1000);
  timer.unref();
  return () => clearInterval(timer);
}
