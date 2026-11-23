import { Op, type Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { Lobby } from '../../models/lobby.js';
import { LobbyMember } from '../../models/lobbyMember.js';
import { User } from '../../models/user.js';
import { Session } from '../../models/session.js';
import { GameHand } from '../../models/gameHand.js';
import { TableGame } from '../../models/tableGame.js';
import { OFFLINE_MS, advance, applyCommand, cents, GameError, money, newRound, tableView, type Command, type Seat, type Settings, type Table } from './engine.js';
export type TableCommand = Command | { kind: 'add-bot'; requestId: string } | { kind: 'remove-bot'; seatId: string } | { kind: 'transfer-host'; seatId: string };
export type TableCashOut = { cashedOut: true; returned: number; accountBalance: number };

function handOpen(table: Table, seat: Seat) {
  const round = table.round;
  const player = round?.players.find(player => player.id === seat.id);
  return Boolean(round && round.phase !== 'completed' && player && !player.skipped && player.ante && !player.result);
}

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
    table.pendingBotRemovals ??= [];
    table.cashedOutUserIds ??= [];
    table.nextBotNumber ??= Math.max(0, ...table.seats.filter(seat => seat.bot).map(seat => Number(seat.id.replace('bot', '')) || 0)) + 1;
    const credited = new Map<number, number>();
    const cashOutSeat = async (seat: Seat) => {
      if (seat.bot || seat.userId == null || seat.cashedOut) return;
      const locked = await User.findByPk(seat.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) throw new GameError(403, 'This account cannot play.');
      const returned = seat.balance;
      const next = cents(locked.balance) + returned;
      await locked.update({ balance: (next / 100).toFixed(2) }, { transaction });
      seat.balance = 0;
      seat.pendingCashOut = false;
      seat.cashedOut = true;
      credited.set(seat.userId, (credited.get(seat.userId) ?? 0) + returned);
      if (!table.cashedOutUserIds!.includes(seat.userId)) table.cashedOutUserIds!.push(seat.userId);
      await LobbyMember.destroy({ where: { lobbyId, userId: seat.userId }, transaction });
    };
    const dropCashedSeats = () => {
      table.seats = table.seats.filter(seat => !seat.cashedOut);
      table.botCount = table.seats.filter(seat => seat.bot).length;
    };
    const transferHost = async (nextHostId: number) => {
      // Keep the former host's membership and bankroll when ownership changes.
      await LobbyMember.findOrCreate({ where: { lobbyId, userId: lobby.hostId }, transaction });
      await lobby.update({ hostId: nextHostId }, { transaction });
    };
    for (const user of users.filter(user => !user.isBanned)) {
      const seat = table.seats.find(seat => seat.userId === user.userId);
      if (seat) seat.name = user.isGuest ? 'Guest' : user.username;
    }
    if (caller && userId !== null) {
      const existing = table.seats.find(seat => seat.userId === userId);
      const rebuy = command?.kind === 'heartbeat' && command.buyIn === true;
      if (existing) existing.name = caller.isGuest ? 'Guest' : caller.username;
      else if (rebuy || !table.cashedOutUserIds.includes(userId)) {
        const locked = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!locked) throw new GameError(403, 'This account cannot play.');
        if (cents(locked.balance) < settings.starting) throw new GameError(403, `You need ${money(settings.starting).toLocaleString()} chips to play at this table.`);
        await locked.update({ balance: ((cents(locked.balance) - settings.starting) / 100).toFixed(2) }, { transaction });
        table.cashedOutUserIds = table.cashedOutUserIds.filter(id => id !== userId);
        table.seats.push({ id: `u${userId}`, userId, name: locked.isGuest ? 'Guest' : locked.username, bot: false, balance: settings.starting, lastSeen: 0, active: false });
      }
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
    let leaveSettled = false;
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
            const botNumber = table.nextBotNumber++;
            const botId = `bot${botNumber}`;
            table.seats.push({ id: botId, userId: null, name: `Reef Bot ${botNumber}`, bot: true, balance: settings.starting, lastSeen: now, active: true });
          }
          own.lastSeen = now;
        } else if (command.kind === 'remove-bot') {
          if (userId !== lobby.hostId) throw new GameError(403, 'Only the host can remove bots.');
          const bot = table.seats.find(seat => seat.id === command.seatId);
          if (bot && !bot.bot) throw new GameError(400, 'Only bots can be removed.');
          if (bot && !table.pendingBotRemovals.includes(bot.id)) table.pendingBotRemovals.push(bot.id);
          own.lastSeen = now;
        } else if (command.kind === 'transfer-host') {
          if (userId !== lobby.hostId) throw new GameError(403, 'Only the host can transfer hosting.');
          const target = table.seats.find(seat => seat.id === command.seatId);
          if (!target || target.bot || target.id === own.id || !target.active || now - target.lastSeen >= OFFLINE_MS || !allowed.has(target.userId!)) throw new GameError(409, 'Choose another connected player.');
          await transferHost(target.userId!);
          own.lastSeen = now;
        } else applyCommand(table, own, command, now);
        if (command.kind === 'leave') {
          if (handOpen(table, own)) own.pendingCashOut = true;
          else leaveSettled = true;
        }
      }
      catch (cause) { if (cause instanceof GameError) error = cause; else throw cause; }
    }
    const hostSeat = table.seats.find(seat => seat.userId === lobby.hostId);
    if (hostSeat && (!allowed.has(lobby.hostId) || (hostSeat.lastSeen > 0 && (!hostSeat.active || now - hostSeat.lastSeen >= OFFLINE_MS)))) {
      const successor = table.seats.find(seat => !seat.bot && seat.userId !== lobby.hostId && allowed.has(seat.userId!) && seat.active && now - seat.lastSeen < OFFLINE_MS);
      if (successor) await transferHost(successor.userId!);
    }
    if (leaveSettled && own && !error) await cashOutSeat(own);
    // A bot already dealt into a hand must finish it before its seat is freed.
    table.seats = table.seats.filter(seat => !table.pendingBotRemovals!.includes(seat.id) || Boolean(table.round?.players.some(player => player.id === seat.id)));
    table.botCount = table.seats.filter(seat => seat.bot).length;
    const phaseBefore = table.round?.phase;
    changed = advance(table, now);
    if (changed || table.round?.phase !== phaseBefore) await saveProgress(table, transaction);
    for (const seat of [...table.seats]) if (seat.pendingCashOut && !handOpen(table, seat)) await cashOutSeat(seat);
    dropCashedSeats();
    if (!table.round || (table.round.phase === 'completed' && now >= table.round.deadline)) {
      for (const seat of [...table.seats]) if (!seat.bot && seat.userId != null && !allowed.has(seat.userId)) await cashOutSeat(seat);
      dropCashedSeats();
      // Bots occupy only seats not reserved for human lobby members.
      const humans = table.seats.filter(seat => !seat.bot && allowed.has(seat.userId!));
      const previousBots = table.seats.filter(seat => seat.bot && !table.pendingBotRemovals!.includes(seat.id));
      const bots = settings.bots ? previousBots.slice(0, Math.max(0, settings.maxPlayers - ids.length)) : [];
      table.seats = [...humans, ...bots];
      table.botCount = bots.length;
      table.pendingBotRemovals = [];
      const round = newRound(table, settings, 0, now);
      if (round) {
        const session = await Session.create({ lobbyId, status: 'betting', dealerCards: null }, { transaction });
        round.id = session.sessionId;
      }
    }
    if (stored) await stored.update({ state: table }, { transaction });
    else await TableGame.create({ lobbyId, state: table }, { transaction });
    const callerSeat = userId == null ? undefined : table.seats.find(seat => seat.userId === userId);
    if (userId != null && !callerSeat) {
      const account = await User.findByPk(userId, { transaction });
      const view: TableCashOut = { cashedOut: true, returned: money(credited.get(userId) ?? 0), accountBalance: money(cents(account!.balance)) };
      return { view, error };
    }
    const publicView = callerSeat ? tableView(table, settings, userId!, now) : null;
    const view = publicView ? { ...publicView, cashOutPending: Boolean(callerSeat?.pendingCashOut), seats: publicView.seats.map(seat => ({ ...seat, isHost: seat.id === `u${lobby.hostId}`, removalPending: table.pendingBotRemovals!.includes(seat.id) })), isHost: userId === lobby.hostId, botCount: table.botCount, canAddBot: settings.bots && userId === lobby.hostId && ids.length + table.botCount < settings.maxPlayers } : null;
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
