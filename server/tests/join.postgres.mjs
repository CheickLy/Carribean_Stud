// Run after npm run build. Uses temporary tables in a unique schema, never app tables.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sequelize } from '../dist/db/sequelize.js';
const schema = `join_test_${randomUUID().replaceAll('-', '')}`;
sequelize.options.define.schema = schema;
const { User } = await import('../dist/models/user.js');
const { Lobby } = await import('../dist/models/lobby.js');
const { LobbyMember } = await import('../dist/models/lobbyMember.js');
const { Session } = await import('../dist/models/session.js');
const { LobbyInvitation } = await import('../dist/models/lobbyInvitation.js');
const { joinLobby } = await import('../dist/modules/tables/join.service.js');
const { getLobbyDetails } = await import('../dist/modules/tables/tables.service.js');
const { respondToLobbyInvitation } = await import('../dist/modules/invitations/invitations.service.js');
const models = [User, Lobby, LobbyMember, Session, LobbyInvitation];
try {
  await sequelize.createSchema(schema);
  for (const model of models) {
    assert.equal(model.getTableName().schema, schema);
    await model.sync();
  }
  const players = await Promise.all(['host', 'alice', 'bob'].map(username => User.create({ username, email: `${username}@example.test`, passwordHash: 'unused', role: 'player', balance: '500.00' })));
  const [host, alice, bob] = players;
  async function table() { return Lobby.create({ hostId: host.userId, name: 'Concurrent join test', maxPlayers: 2, startingMoney: 200 }); }
  const lobby = await table();
  const results = await Promise.allSettled([joinLobby(lobby.lobbyId, alice.userId), joinLobby(lobby.lobbyId, bob.userId)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
  assert.equal(await LobbyMember.count({ where: { lobbyId: lobby.lobbyId } }), 1);
  const winner = results[0].status === 'fulfilled' ? alice : bob;
  const retries = await Promise.all([joinLobby(lobby.lobbyId, winner.userId), joinLobby(lobby.lobbyId, winner.userId)]);
  assert.ok(retries.every(result => result.alreadyJoined));
  await winner.reload();
  assert.equal(winner.balance, '500.00');

  const mixedLobby = await table();
  const invitation = await LobbyInvitation.create({ lobbyId: mixedLobby.lobbyId, senderId: host.userId, recipientId: bob.userId, status: 'pending' });
  const mixed = await Promise.allSettled([joinLobby(mixedLobby.lobbyId, alice.userId), respondToLobbyInvitation(bob.userId, invitation.invitationId, 'accept')]);
  assert.equal(mixed.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(await LobbyMember.count({ where: { lobbyId: mixedLobby.lobbyId } }), 1);

  const playingLobby = await table();
  const hand = await Session.create({ lobbyId: playingLobby.lobbyId, status: 'in_progress' });
  assert.equal((await joinLobby(playingLobby.lobbyId, alice.userId)).waitingForNextHand, true);
  assert.equal((await getLobbyDetails(playingLobby.lobbyId, alice.userId)).waitingForNextHand, true);
  await hand.update({ status: 'completed' });
  assert.equal((await getLobbyDetails(playingLobby.lobbyId, alice.userId)).waitingForNextHand, false);
  await Session.create({ lobbyId: playingLobby.lobbyId, status: 'in_progress' });
  assert.equal((await getLobbyDetails(playingLobby.lobbyId, alice.userId)).waitingForNextHand, false);
  console.log('Passed: simultaneous joins, mixed invitation/direct joins, idempotent retries, unchanged balance, and next-hand eligibility.');
} finally {
  await sequelize.dropSchema(schema, { cascade: true });
  await sequelize.close();
}
