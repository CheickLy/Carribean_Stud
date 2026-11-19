// Isolated PostgreSQL schema; never changes application records.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const source = process.env.TEST_POSTGRES === '1' ? '../src' : '../dist';
const extension = process.env.TEST_POSTGRES === '1' ? 'ts' : 'js';
const { sequelize } = await import(`${source}/db/sequelize.${extension}`);
const schema = `shared_test_${randomUUID().replaceAll('-', '')}`;
sequelize.options.define.schema = schema;
const { User } = await import(`${source}/models/user.${extension}`);
const { Lobby } = await import(`${source}/models/lobby.${extension}`);
const { LobbyMember } = await import(`${source}/models/lobbyMember.${extension}`);
const { Session } = await import(`${source}/models/session.${extension}`);
const { GameHand } = await import(`${source}/models/gameHand.${extension}`);
const { TableGame } = await import(`${source}/models/tableGame.${extension}`);
const { sharedTable, handHistory, startTableClock } = await import(`${source}/modules/shared-game/service.${extension}`);
try {
  await sequelize.createSchema(schema);
  for (const model of [User, Lobby, LobbyMember, Session, GameHand, TableGame]) { assert.equal(model.getTableName().schema, schema); await model.sync(); }
  const [host, alice, outsider] = await Promise.all(['host', 'alice', 'outsider'].map(username => User.create({ username, email: `${username}@example.test`, passwordHash: 'unused', role: 'player', balance: '5000' })));
  const lobby = await Lobby.create({ hostId: host.userId, name: 'Shared test', minBet: 10, maxBet: 50, startingMoney: 1000, maxPlayers: 3, botsEnabled: false });
  await LobbyMember.create({ lobbyId: lobby.lobbyId, userId: alice.userId });
  const id = lobby.lobbyId;
  const now = Date.now();
  // First player starts a betting round. A second arrival must wait for its end.
  const first = await sharedTable(id, host.userId, { kind: 'heartbeat' }, now);
  const waiting = await sharedTable(id, alice.userId, { kind: 'heartbeat' }, now + 1);
  assert.equal(waiting.seats.find(seat => seat.isYou).status, 'waiting for next hand');
  await assert.rejects(sharedTable(id, outsider.userId, { kind: 'heartbeat' }, now + 2), /Join this table/);
  await sharedTable(id, null, undefined, now + 20001);
  await sharedTable(id, host.userId, { kind: 'heartbeat' }, now + 26000);
  await sharedTable(id, alice.userId, { kind: 'heartbeat' }, now + 26000);
  const betting = await sharedTable(id, host.userId, { kind: 'heartbeat' }, now + 28002);
  const roundId = betting.roundId;
  assert.notEqual(roundId, first.roundId);
  assert.equal(betting.minBet, 10);
  assert.equal(betting.maxBet, 50);
  assert.equal(betting.balance, 1000);
  assert.equal(betting.seats.filter(seat => seat.status === 'betting').length, 2);
  // Concurrent requests use independent database transactions and the lobby lock.
  await Promise.all([1, 2, 3].map(() => sharedTable(id, host.userId, { kind: 'ante', roundId, amount: 10 }, now + 29000)));
  const deciding = await sharedTable(id, alice.userId, { kind: 'ante', roundId, amount: 10 }, now + 29001);
  assert.equal(deciding.phase, 'deciding');
  const hostView = await sharedTable(id, host.userId, { kind: 'heartbeat' }, now + 29002);
  assert.equal(hostView.balance, 990);
  assert.equal(hostView.dealer.cards.length, 1);
  assert.deepEqual(deciding.dealer, hostView.dealer);
  assert.equal(hostView.own.cards.cards.length, 5);
  assert.equal(deciding.own.cards.cards.length, 5);
  assert(!JSON.stringify(hostView.seats).includes('cards'));
  const persisted = await TableGame.findByPk(id);
  assert.equal(new Set([...persisted.state.round.dealer, ...persisted.state.round.players.flatMap(player => player.cards)]).size, 15);
  const choices = await Promise.allSettled([
    sharedTable(id, host.userId, { kind: 'action', roundId, action: 'raise' }, now + 30000),
    sharedTable(id, host.userId, { kind: 'action', roundId, action: 'fold' }, now + 30000),
  ]);
  assert.equal(choices.filter(result => result.status === 'fulfilled').length, 1);
  const savedAction = (await TableGame.findByPk(id)).state.round.players.find(player => player.id === `u${host.userId}`).action;
  const completed = await sharedTable(id, alice.userId, { kind: 'action', roundId, action: 'fold' }, now + 30001);
  assert.equal(completed.phase, 'completed');
  assert.equal(completed.dealer.cards.length, 5);
  const beforeRetry = (await TableGame.findByPk(id)).state.seats.find(seat => seat.userId === host.userId).balance;
  await Promise.all([1, 2, 3].map(() => sharedTable(id, host.userId, { kind: 'action', roundId, action: savedAction }, now + 30002)));
  assert.equal(await GameHand.count({ where: { sessionId: roundId } }), 2);
  assert.equal((await TableGame.findByPk(id)).state.seats.find(seat => seat.userId === host.userId).balance, beforeRetry);
  const history = await handHistory(id, host.userId);
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].playerCards, hostView.own.cards.cards);
  await host.reload(); assert.equal(host.balance, '5000.00');
  // Load persisted state after a results interval: next hand starts without a deal request.
  const next = await sharedTable(id, host.userId, { kind: 'heartbeat' }, now + 38000);
  assert.equal(next.phase, 'betting');
  assert.notEqual(next.roundId, roundId);
  await assert.rejects(sharedTable(id, host.userId, { kind: 'action', roundId, action: 'raise' }, now + 38001), /ended/);
  // Timer alone closes betting and folds a missing decision, even with no browser polling.
  await sharedTable(id, host.userId, { kind: 'ante', roundId: next.roundId, amount: 10 }, now + 39000);
  await sharedTable(id, null, undefined, now + 100000);
  assert.equal((await TableGame.findByPk(id)).state.round.phase, 'completed');
  assert.equal(await GameHand.count({ where: { sessionId: next.roundId, userId: host.userId } }), 1);
  // A separate bot-enabled table uses actual wall-clock advancement without clients.
  const botLobby = await Lobby.create({ hostId: host.userId, name: 'Bot table', minBet: 5, maxBet: 25, startingMoney: 200, maxPlayers: 6, botsEnabled: true });
  const botStart = await sharedTable(botLobby.lobbyId, host.userId, { kind: 'heartbeat' });
  assert.equal(botStart.seats.filter(seat => seat.bot).length, 5);
  const botDeal = await sharedTable(botLobby.lobbyId, host.userId, { kind: 'ante', roundId: botStart.roundId, amount: 5 });
  assert.equal(botDeal.phase, 'deciding');
  const pending = await TableGame.findByPk(botLobby.lobbyId);
  const interrupted = structuredClone(pending.state);
  assert.equal(new Set([...interrupted.round.dealer, ...interrupted.round.players.flatMap(player => player.cards)]).size, 35);
  interrupted.round.deadline = Date.now() - 1;
  await pending.update({ state: interrupted });
  const stop = startTableClock();
  try {
    await new Promise(resolve => setTimeout(resolve, 1600));
    assert.equal((await TableGame.findByPk(botLobby.lobbyId)).state.round.phase, 'completed');
    assert.equal(await GameHand.count({ where: { sessionId: botStart.roundId } }), 6);
  } finally { stop(); }
  await host.update({ isBanned: true });
  await assert.rejects(sharedTable(id, host.userId, { kind: 'heartbeat' }), /cannot play/);
  await host.update({ isBanned: false });
  // A failed history write must roll back the action and its bankroll changes.
  const rollbackLobby = await Lobby.create({ hostId: host.userId, name: 'Atomic history', minBet: 5, maxBet: 25, startingMoney: 200, maxPlayers: 2, autoIncr: true, increaseAmount: 5, increaseEveryHands: 1 });
  const rollbackStart = await sharedTable(rollbackLobby.lobbyId, host.userId, { kind: 'heartbeat' });
  assert.deepEqual(await handHistory(rollbackLobby.lobbyId, host.userId), []);
  await sharedTable(rollbackLobby.lobbyId, host.userId, { kind: 'ante', roundId: rollbackStart.roundId, amount: 5 });
  const originalCreate = GameHand.create;
  GameHand.create = async () => { throw new Error('Injected history failure'); };
  try {
    await assert.rejects(sharedTable(rollbackLobby.lobbyId, host.userId, { kind: 'action', roundId: rollbackStart.roundId, action: 'raise' }), /Injected history/);
  } finally { GameHand.create = originalCreate; }
  const afterFailure = await TableGame.findByPk(rollbackLobby.lobbyId);
  assert.equal(afterFailure.state.seats[0].balance, 19500);
  assert.equal(afterFailure.state.round.players[0].action, null);
  assert.equal(await GameHand.count({ where: { sessionId: rollbackStart.roundId } }), 0);
  await sharedTable(rollbackLobby.lobbyId, host.userId, { kind: 'action', roundId: rollbackStart.roundId, action: 'fold' });
  const increased = await sharedTable(rollbackLobby.lobbyId, host.userId, { kind: 'heartbeat' }, Date.now() + 8000);
  assert.equal(increased.minBet, 10); assert.equal(increased.maxBet, 30);
  assert.equal(increased.balance, 195);
  // Unexpected internal failures must propagate and roll back rather than being
  // treated as ordinary rejected player commands.
  const faultyCommand = { kind: 'ante', roundId: increased.roundId, get amount() { throw new Error('Unexpected command failure'); } };
  await assert.rejects(sharedTable(rollbackLobby.lobbyId, host.userId, faultyCommand, Date.now() + 8001), /Unexpected command failure/);
  assert.equal((await TableGame.findByPk(rollbackLobby.lobbyId)).state.seats[0].balance, 19500);
  await sharedTable(rollbackLobby.lobbyId, host.userId, { kind: 'ante', roundId: increased.roundId, amount: 10 }, Date.now() + 8001);
  await host.update({ isBanned: true });
  await sharedTable(rollbackLobby.lobbyId, null, undefined, Date.now() + 8002);
  const bannedFold = (await TableGame.findByPk(rollbackLobby.lobbyId)).state.round;
  assert.equal(bannedFold.phase, 'completed');
  assert.equal(bannedFold.players[0].action, 'fold');
  // Repeated reconciliation must not attempt a second fold or payout.
  await sharedTable(rollbackLobby.lobbyId, null, undefined, Date.now() + 8003);
  await host.update({ isBanned: false });
  const guest = await User.create({ username: 'guest_player', email: 'guest@example.test', passwordHash: 'unused', role: 'player', isGuest: true });
  const guestLobby = await Lobby.create({ hostId: guest.userId, name: 'Guest game', minBet: 5, maxBet: 25, startingMoney: 200, maxPlayers: 2 });
  const guestView = await sharedTable(guestLobby.lobbyId, guest.userId, { kind: 'heartbeat' });
  assert.equal(guestView.seats[0].name, 'Guest');
  assert.equal((await sharedTable(guestLobby.lobbyId, guest.userId, { kind: 'heartbeat' })).seats[0].name, 'Guest');
  // Timer reconciliation folds a removed member without waiting for their browser.
  await LobbyMember.destroy({ where: { lobbyId: id, userId: alice.userId } });
  await sharedTable(id, null);
  const paused = await Lobby.create({ hostId: host.userId, name: 'Paused table', minBet: 5, maxBet: 25, startingMoney: 200, maxPlayers: 2, allowBets: false });
  const pausedView = await sharedTable(paused.lobbyId, host.userId, { kind: 'heartbeat' });
  assert.equal(pausedView.phase, 'waiting'); assert.equal(pausedView.roundId, null);
  await sharedTable(paused.lobbyId, host.userId, { kind: 'leave', roundId: null });
  await paused.update({ isActive: false });
  await assert.rejects(sharedTable(paused.lobbyId, host.userId, { kind: 'heartbeat' }), /not found/);
  const invalid = await Lobby.create({ hostId: host.userId, name: 'Invalid limits', minBet: 0, maxBet: 0, startingMoney: 200, maxPlayers: 2 });
  await assert.rejects(sharedTable(invalid.lobbyId, host.userId, { kind: 'heartbeat' }), /valid bet limits/);
  for (const values of [{ minBet: 10, maxBet: 5 }, { minBet: 5, maxBet: 25, startingMoney: 0 }, { minBet: 5, maxBet: 25, startingMoney: 200, autoIncr: true, increaseEveryHands: 0 }, { increaseEveryHands: 1, increaseAmount: 0 }]) {
    await invalid.update(values);
    await assert.rejects(sharedTable(invalid.lobbyId, host.userId, { kind: 'heartbeat' }), /valid bet limits/);
  }
  console.log('Passed: shared dealer, private cards, table bankroll and limits, mid-hand admission, concurrent antes/actions, one-time settlement/history, automatic progression and offline timeout.');
} finally { await sequelize.dropSchema(schema, { cascade: true }); await sequelize.close(); }
