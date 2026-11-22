// Real login cookies and HTTP routes, backed by a disposable PostgreSQL schema.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import bcrypt from 'bcryptjs';
const source = process.env.TEST_POSTGRES === '1' ? '../src' : '../dist';
const extension = process.env.TEST_POSTGRES === '1' ? 'ts' : 'js';
const { sequelize } = await import(`${source}/db/sequelize.${extension}`);
const schema = `multiplayer_test_${randomUUID().replaceAll('-', '')}`;
sequelize.options.define.schema = schema;
const { User } = await import(`${source}/models/user.${extension}`);
const { Lobby } = await import(`${source}/models/lobby.${extension}`);
const { LobbyMember } = await import(`${source}/models/lobbyMember.${extension}`);
const { Session } = await import(`${source}/models/session.${extension}`);
const { GameHand } = await import(`${source}/models/gameHand.${extension}`);
const { TableGame } = await import(`${source}/models/tableGame.${extension}`);
const { authRouter } = await import(`${source}/modules/auth/auth.routes.${extension}`);
const { tablesRouter } = await import(`${source}/modules/tables/tables.routes.${extension}`);
const { sharedGameRouter } = await import(`${source}/modules/shared-game/routes.${extension}`);
let server;
try {
  await sequelize.createSchema(schema);
  for (const model of [User, Lobby, LobbyMember, Session, GameHand, TableGame]) {
    assert.equal(model.getTableName().schema, schema);
    await model.sync();
  }
  const password = 'TestPlay123!';
  const passwordHash = await bcrypt.hash(password, 4);
  const users = await Promise.all(['host', 'alice', 'late'].map(username => User.create({ username, email: `${username}@example.test`, passwordHash, role: 'player', balance: 5000 })));
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'isolated-multiplayer-test-secret', resave: false, saveUninitialized: false }));
  app.use('/api/auth', authRouter);
  app.use('/api/lobbies', tablesRouter, sharedGameRouter);
  app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const host = request.agent(server), alice = request.agent(server), late = request.agent(server), hostTab = request.agent(server);
  for (const [agent, user] of [[host, users[0]], [alice, users[1]], [late, users[2]], [hostTab, users[0]]]) {
    const login = await agent.post('/api/auth/login').send({ email: user.email, password }).expect(200);
    assert.equal(login.body.user.userId, user.userId);
  }
  const settings = { name: 'Multiplayer acceptance', maxPlayers: 3, startingMoney: 500, minBet: 5, maxBet: 25, botsEnabled: false, isPrivate: false, autoIncr: false, increaseAmount: 10, increaseEveryHands: 15 };
  const created = await host.post('/api/lobbies').send(settings).expect(201);
  const id = created.body.lobbyId;
  assert(Number.isSafeInteger(id));
  const endpoint = `/api/lobbies/${id}/game`;
  await request(server).post(`${endpoint}/state`).send({ userId: users[0].userId }).expect(401);
  await late.post(`${endpoint}/state`).send({}).expect(403);
  await late.get(`${endpoint}/history`).expect(403);
  // Solo play remains available; a player who arrives mid-hand waits safely.
  const solo = (await host.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(solo.phase, 'betting');
  assert.equal(solo.balance, 500);
  const joined = (await alice.post(`/api/lobbies/${id}/join`).send({}).expect(200)).body;
  assert.equal(joined.waitingForNextHand, true);
  const waiting = (await alice.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(waiting.roundId, solo.roundId);
  assert.equal(waiting.seats.find(seat => seat.isYou).inRound, false);
  assert.deepEqual(waiting.own.cards.cards, []);
  await host.post(`${endpoint}/leave`).send({ roundId: solo.roundId }).expect(200);
  async function finishResultsPause() {
    const saved = await TableGame.findByPk(id);
    const state = structuredClone(saved.state);
    assert.equal(state.round.phase, 'completed');
    state.round.deadline = Date.now() - 1;
    await saved.update({ state });
  }
  await finishResultsPause();
  const shared = (await host.post(`${endpoint}/state`).send({}).expect(200)).body;
  const roundId = shared.roundId;
  assert.notEqual(roundId, solo.roundId);
  assert.equal(shared.seats.filter(seat => seat.inRound).length, 2);
  // Deterministic fixture: two different outcomes against exactly the same dealer.
  const stored = await TableGame.findByPk(id);
  const state = structuredClone(stored.state);
  const hostCards = ['AS', 'KS', 'QS', 'JS', '10S'];
  const aliceCards = ['2C', '4D', '6H', '8C', '9D'];
  const dealerCards = ['QC', 'QH', '3S', '5D', '7C'];
  state.round.dealer = dealerCards;
  state.round.players.find(player => player.id === `u${users[0].userId}`).cards = hostCards;
  state.round.players.find(player => player.id === `u${users[1].userId}`).cards = aliceCards;
  assert.equal(new Set([...hostCards, ...aliceCards, ...dealerCards]).size, 15);
  await stored.update({ state });
  await Promise.all([
    host.post(`${endpoint}/ante`).send({ roundId, ante: 5 }).expect(200),
    hostTab.post(`${endpoint}/ante`).send({ roundId, ante: 5 }).expect(200),
    alice.post(`${endpoint}/ante`).send({ roundId, ante: 5 }).expect(200),
  ]);
  const hostView = (await host.post(`${endpoint}/state`).send({}).expect(200)).body;
  const aliceView = (await alice.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(hostView.roundId, aliceView.roundId);
  assert.equal(hostView.deadline, aliceView.deadline);
  assert.equal(hostView.phase, 'deciding');
  assert.equal(hostView.balance, 495); assert.equal(aliceView.balance, 495);
  assert.deepEqual(hostView.dealer, aliceView.dealer);
  assert.deepEqual(hostView.dealer.cards, ['QC']);
  assert.equal(hostView.dealer.rank, null);
  assert.deepEqual(hostView.own.cards.cards, hostCards);
  assert.deepEqual(aliceView.own.cards.cards, aliceCards);
  for (const card of aliceCards) assert(!JSON.stringify(hostView).includes(`"${card}"`));
  for (const card of hostCards) assert(!JSON.stringify(aliceView).includes(`"${card}"`));
  assert.equal(hostView.seats.find(seat => !seat.isYou).cardCount, 5);
  // Simulate a dropped browser, then reload it during the same decision window.
  const reconnectState = structuredClone((await TableGame.findByPk(id)).state);
  reconnectState.seats.find(seat => seat.id === `u${users[1].userId}`).lastSeen = Date.now() - 60000;
  await stored.update({ state: reconnectState });
  const disconnectedView = (await host.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(disconnectedView.seats.find(seat => seat.id === `u${users[1].userId}`).online, false);
  const reloaded = (await alice.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(reloaded.roundId, roundId);
  assert.deepEqual(reloaded.own.cards.cards, aliceCards);
  assert.equal(reloaded.own.ante, 5);
  assert.equal(reloaded.balance, 495);
  assert.equal(reloaded.seats.find(seat => seat.isYou).online, true);
  assert.equal(reloaded.deadline, aliceView.deadline);
  // A forged body identity cannot act for another player.
  await host.post(`${endpoint}/action`).send({ roundId, action: 'raise', userId: users[1].userId }).expect(200);
  await hostTab.post(`${endpoint}/action`).send({ roundId, action: 'raise' }).expect(200);
  const pending = (await alice.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(pending.own.action, null);
  assert.equal(pending.dealer.cards.length, 1);
  assert(pending.seats.every(seat => seat.net === null));
  assert.deepEqual((await host.get(`${endpoint}/history`).expect(200)).body, []);
  await late.post(`/api/lobbies/${id}/join`).send({}).expect(200);
  const lateView = (await late.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(lateView.seats.find(seat => seat.isYou).inRound, false);
  await late.post(`${endpoint}/ante`).send({ roundId, ante: 5 }).expect(409);
  const aliceResult = (await alice.post(`${endpoint}/action`).send({ roundId, action: 'raise' }).expect(200)).body;
  const hostResult = (await host.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.equal(hostResult.phase, 'completed'); assert.equal(aliceResult.phase, 'completed');
  assert.deepEqual(hostResult.dealer.cards, dealerCards); assert.deepEqual(aliceResult.dealer.cards, dealerCards);
  assert.equal(hostResult.own.result.net, 1005); assert.equal(hostResult.balance, 1505);
  assert.equal(aliceResult.own.result.net, -15); assert.equal(aliceResult.balance, 485);
  assert.equal(hostResult.seats.find(seat => seat.id === `u${users[1].userId}`).net, -15);
  const hostHistory = (await host.get(`${endpoint}/history`).expect(200)).body;
  const aliceHistory = (await alice.get(`${endpoint}/history`).expect(200)).body;
  assert.equal(hostHistory.length, 1); assert.equal(aliceHistory.length, 1);
  assert.deepEqual(hostHistory[0].playerCards, hostCards); assert.deepEqual(aliceHistory[0].playerCards, aliceCards);
  await hostTab.post(`${endpoint}/action`).send({ roundId, action: 'raise' }).expect(200);
  assert.equal(await GameHand.count({ where: { sessionId: roundId } }), 2);
  for (const user of users) { await user.reload(); assert.equal(user.balance, '5000.00'); }
  await finishResultsPause();
  const next = (await late.post(`${endpoint}/state`).send({}).expect(200)).body;
  assert.notEqual(next.roundId, roundId);
  assert.equal(next.roundNumber, shared.roundNumber + 1);
  assert.equal(next.seats.filter(seat => seat.inRound).length, 3);
  // A second table has its own round, membership and bankroll.
  const other = (await host.post('/api/lobbies').send({ ...settings, name: 'Independent table' }).expect(201)).body;
  const otherView = (await host.post(`/api/lobbies/${other.lobbyId}/game/state`).send({}).expect(200)).body;
  assert.notEqual(otherView.roundId, next.roundId); assert.equal(otherView.balance, 500);
  await alice.post(`/api/lobbies/${other.lobbyId}/game/state`).send({}).expect(403);
  // Host controls use the same lock as decisions, admission and settlement.
  const controls = (await host.post('/api/lobbies').send({ ...settings, name: 'Host controls acceptance', maxPlayers: 4, botsEnabled: true }).expect(201)).body;
  const controlsId = controls.lobbyId;
  const controlsPath = `/api/lobbies/${controlsId}/game`;
  await host.post(`${controlsPath}/state`).send({}).expect(200);
  await alice.post(`/api/lobbies/${controlsId}/join`).send({}).expect(200);
  await alice.post(`${controlsPath}/state`).send({}).expect(200);
  await Promise.all([host, hostTab].map(agent => agent.post(`${controlsPath}/bots`).send({ requestId: 'host-controls-bot-one' }).expect(200)));
  await host.post(`${controlsPath}/bots`).send({ requestId: 'host-controls-bot-two' }).expect(200);
  await alice.post(`${controlsPath}/remove-bot`).send({ seatId: 'bot1' }).expect(403);
  const immediate = (await host.post(`${controlsPath}/remove-bot`).send({ seatId: 'bot1' }).expect(200)).body;
  assert(!immediate.seats.some(seat => seat.id === 'bot1'));
  assert.equal(immediate.botCount, 1);
  await host.post(`${controlsPath}/remove-bot`).send({ seatId: 'bot1' }).expect(200); // Safe lost-response retry.
  async function expireControlsPhase() {
    const row = await TableGame.findByPk(controlsId);
    const state = structuredClone(row.state);
    state.round.deadline = Date.now() - 1;
    await row.update({ state });
    return (await host.post(`${controlsPath}/state`).send({}).expect(200)).body;
  }
  await expireControlsPhase();
  const controlRound = await expireControlsPhase();
  assert.equal(controlRound.phase, 'betting');
  assert.equal(controlRound.seats.filter(seat => seat.inRound).length, 3);
  await host.post(`${controlsPath}/ante`).send({ roundId: controlRound.roundId, ante: 5 }).expect(200);
  const controlsDeal = (await alice.post(`${controlsPath}/ante`).send({ roundId: controlRound.roundId, ante: 5 }).expect(200)).body;
  assert.equal(controlsDeal.phase, 'deciding');
  const pendingRemoval = (await host.post(`${controlsPath}/remove-bot`).send({ seatId: 'bot2' }).expect(200)).body;
  assert.equal(pendingRemoval.seats.find(seat => seat.id === 'bot2').removalPending, true);
  assert.deepEqual(pendingRemoval.dealer, controlsDeal.dealer);
  await alice.post(`${controlsPath}/transfer-host`).send({ seatId: `u${users[1].userId}` }).expect(403);
  await host.post(`${controlsPath}/transfer-host`).send({ seatId: 'bot2' }).expect(409);
  await host.post(`${controlsPath}/transfer-host`).send({ seatId: 'u99999999' }).expect(409);
  const transferred = (await host.post(`${controlsPath}/transfer-host`).send({ seatId: `u${users[1].userId}` }).expect(200)).body;
  assert.equal(transferred.isHost, false);
  assert.equal(transferred.seats.find(seat => seat.id === `u${users[1].userId}`).isHost, true);
  await host.post(`${controlsPath}/bots`).send({ requestId: 'former-host-denied' }).expect(403);
  await host.post(`${controlsPath}/remove-bot`).send({ seatId: 'bot2' }).expect(403);
  const aliceHost = (await alice.post(`${controlsPath}/state`).send({}).expect(200)).body;
  assert.equal(aliceHost.isHost, true);
  await host.post(`${controlsPath}/action`).send({ roundId: controlRound.roundId, action: 'raise' }).expect(200);
  await alice.post(`${controlsPath}/leave`).send({ roundId: controlRound.roundId }).expect(200);
  const inherited = (await host.post(`${controlsPath}/state`).send({}).expect(200)).body;
  assert.equal(inherited.isHost, true);
  assert.equal(inherited.phase, 'completed');
  assert.equal(await GameHand.count({ where: { sessionId: controlRound.roundId } }), 3); // Includes removed bot.
  const controlsNext = await expireControlsPhase();
  assert(!controlsNext.seats.some(seat => seat.id === 'bot2'));
  assert.equal(controlsNext.botCount, 0);
  // A new bot gets a fresh identity; removed bots cannot be resurrected by a retry.
  const replacement = (await host.post(`${controlsPath}/bots`).send({ requestId: 'host-controls-replacement' }).expect(200)).body;
  assert.equal(replacement.seats.find(seat => seat.bot).id, 'bot3');
  await host.post(`${controlsPath}/remove-bot`).send({ seatId: 'bot2' }).expect(200);
  assert.equal((await host.post(`${controlsPath}/state`).send({}).expect(200)).body.botCount, 1);
  // An absent host hands control to a connected human without changing the round.
  const stale = await TableGame.findByPk(controlsId);
  const absent = structuredClone(stale.state);
  absent.seats.find(seat => seat.userId === users[0].userId).lastSeen = Date.now() - 16000;
  await stale.update({ state: absent });
  const reconnectHost = (await alice.post(`${controlsPath}/state`).send({}).expect(200)).body;
  assert.equal(reconnectHost.isHost, true);
  assert.equal(reconnectHost.roundId, controlsNext.roundId);
  assert.equal((await host.post(`${controlsPath}/state`).send({}).expect(200)).body.isHost, false);
  console.log('Passed multiplayer story: real independent logins, solo and late join, shared dealer/deadline, private hands, identity isolation, independent payouts, idempotent tabs, history, automatic next round, safe bot removal, manual and automatic host transfer.');
} finally {
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); });
  await sequelize.dropSchema(schema, { cascade: true });
  await sequelize.close();
}
