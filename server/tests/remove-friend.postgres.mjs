// Uses temporary tables in a unique schema; application records are untouched.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sequelize } from '../dist/db/sequelize.js';
const schema = `friend_test_${randomUUID().replaceAll('-', '')}`;
sequelize.options.define.schema = schema;
const { User } = await import('../dist/models/user.js');
const { Friendship } = await import('../dist/models/friendship.js');
const { Lobby } = await import('../dist/models/lobby.js');
const { LobbyMember } = await import('../dist/models/lobbyMember.js');
const { getFriends, removeFriendship } = await import('../dist/modules/friends/friends.service.js');
try {
  await sequelize.createSchema(schema);
  for(const model of [User, Friendship, Lobby, LobbyMember]) {
    assert.equal(model.getTableName().schema, schema); await model.sync();
  }
  const users = await Promise.all(['alice','bob','outsider'].map(username => User.create({ username, email: `${username}@example.test`, passwordHash: 'unused', role: 'player' })));
  const [alice,bob,outsider] = users;
  const lobby = await Lobby.create({ hostId: alice.userId, name: 'Unchanged membership' });
  await LobbyMember.bulkCreate([alice,bob].map(user => ({ lobbyId: lobby.lobbyId, userId: user.userId })));
  const seatsBefore = (await LobbyMember.findAll({ raw: true })).sort((a,b) => a.userId - b.userId);
  // Either participant can remove the shared connection.
  for(const remover of [alice,bob]) {
    const row = await Friendship.create({ userId: alice.userId, friendId: bob.userId, status: 'accepted' });
    assert.equal((await getFriends(alice.userId)).length,1);
    assert.equal((await getFriends(bob.userId)).length,1);
    await removeFriendship(outsider.userId,row.friendshipId);
    assert.ok(await Friendship.findByPk(row.friendshipId));
    await Promise.all([removeFriendship(remover.userId,row.friendshipId),removeFriendship(remover.userId,row.friendshipId)]);
    await removeFriendship(remover.userId,row.friendshipId);
    assert.deepEqual(await getFriends(alice.userId),[]);
    assert.deepEqual(await getFriends(bob.userId),[]);
    assert.deepEqual((await LobbyMember.findAll({ raw: true })).sort((a,b) => a.userId - b.userId),seatsBefore);
    assert.ok(await Lobby.findByPk(lobby.lobbyId));
  }
  const pending = await Friendship.create({ userId: alice.userId, friendId: bob.userId, status: 'pending' });
  await removeFriendship(alice.userId,pending.friendshipId);
  assert.ok(await Friendship.findByPk(pending.friendshipId));
  console.log('Passed: either participant removes both lists, outsider cannot remove, concurrent/repeated removal is harmless, pending requests and table membership stay unchanged.');
} finally { await sequelize.dropSchema(schema,{cascade:true}); await sequelize.close(); }
