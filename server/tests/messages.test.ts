import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { messagesRouter } from '../src/modules/messages/messages.routes.js';
import { Friendship } from '../src/models/friendship.js';
import { FriendMessage } from '../src/models/friendMessage.js';
import { User } from '../src/models/user.js';

function app(userId?: number) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.session = { userId } as typeof req.session; next(); });
  app.use('/messages', messagesRouter);
  return app;
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(Friendship, 'findOne').mockResolvedValue({ friendshipId: 1 } as Friendship);
  vi.spyOn(User, 'findByPk').mockResolvedValue({ userId: 2 } as User);
  vi.spyOn(FriendMessage, 'create').mockResolvedValue({ get: () => ({ messageId: 9, message: 'Hello' }) } as any);
  vi.spyOn(FriendMessage, 'update').mockResolvedValue([1]);
  vi.spyOn(FriendMessage, 'findAll').mockResolvedValue([{ messageId: 9, message: 'Hello' }] as any);
});
describe('Private messages', () => {
  it('requires authentication for reading and sending', async () => {
    expect((await request(app()).get('/messages/2')).status).toBe(401);
    expect((await request(app()).post('/messages/2').send({ message: 'Hi' })).status).toBe(401);
    expect(FriendMessage.create).not.toHaveBeenCalled();
  });
  it.each(['bad', '0', '-1', '1.5', '9007199254740992'])('rejects invalid recipient %s', async id => {
    expect((await request(app(1)).get(`/messages/${id}`)).status).toBe(400);
    expect((await request(app(1)).post(`/messages/${id}`).send({ message: 'Hi' })).status).toBe(400);
    expect(Friendship.findOne).not.toHaveBeenCalled();
  });
  it.each([undefined, 123, '', '   ', 'x'.repeat(501)])('rejects invalid message %s', async message => {
    expect((await request(app(1)).post('/messages/2').send({ message })).status).toBe(400);
    expect(FriendMessage.create).not.toHaveBeenCalled();
  });
  it('trims messages and uses the session sender', async () => {
    const response = await request(app(1)).post('/messages/2').send({ message: ' Hello ', senderId: 99 });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ messageId: 9, message: 'Hello' });
    expect(FriendMessage.create).toHaveBeenCalledWith({ senderId: 1, recipientId: 2, message: 'Hello', readAt: null });
    expect(Friendship.findOne).toHaveBeenCalledWith({ where: { status: 'accepted', [Op.or]: [{ userId: 1, friendId: 2 }, { userId: 2, friendId: 1 }] } });
  });
  it('marks incoming messages read and returns both directions in chronological order', async () => {
    const response = await request(app(1)).get('/messages/2');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ messageId: 9, message: 'Hello' }]);
    expect(FriendMessage.update).toHaveBeenCalledWith({ readAt: expect.any(Date) }, { where: { senderId: 2, recipientId: 1, readAt: null } });
    expect(FriendMessage.findAll).toHaveBeenCalledWith({ where: { [Op.or]: [{ senderId: 1, recipientId: 2 }, { senderId: 2, recipientId: 1 }] }, order: [['createdAt', 'ASC'], ['messageId', 'ASC']] });
  });
  it('denies former friends access to messages', async () => {
    vi.mocked(Friendship.findOne).mockResolvedValue(null);
    expect((await request(app(1)).get('/messages/2')).status).toBe(403);
    expect((await request(app(1)).post('/messages/2').send({ message: 'Hi' })).status).toBe(403);
    expect(FriendMessage.update).not.toHaveBeenCalled();
    expect(FriendMessage.create).not.toHaveBeenCalled();
  });
  it('rejects a recipient who no longer exists', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(null);
    const response = await request(app(1)).post('/messages/2').send({ message: 'Hi' });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Friend not found.');
  });
  it('handles unexpected storage failures', async () => {
    vi.mocked(Friendship.findOne).mockRejectedValue('offline');
    expect((await request(app(1)).get('/messages/2')).body.error).toBe('Could not load messages.');
    expect((await request(app(1)).post('/messages/2').send({ message: 'Hi' })).body.error).toBe('Could not send message.');
  });
});
