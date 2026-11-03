import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { messagesRouter } from '../src/modules/messages/messages.routes.js';
import { FriendMessage } from '../src/models/friendMessage.js';
import { Friendship } from '../src/models/friendship.js';
import { User } from '../src/models/user.js';

const app = express();
app.use(express.json());
app.use(session({ secret: 'messages-test', resave: false, saveUninitialized: false, store: new session.MemoryStore() }));
app.post('/test-login', (req, res) => { req.session.userId = 1; res.sendStatus(204); });
app.use('/api/messages', messagesRouter);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(Friendship, 'findOne').mockResolvedValue({ status: 'accepted' } as Friendship);
  vi.spyOn(User, 'findByPk').mockResolvedValue({ userId: 2, username: 'marina' } as User);
  vi.spyOn(FriendMessage, 'create').mockResolvedValue({ get: () => ({ messageId: 4, message: 'Hello' }) } as unknown as FriendMessage);
  vi.spyOn(FriendMessage, 'update').mockResolvedValue([1]);
  vi.spyOn(FriendMessage, 'findAll').mockResolvedValue([{ messageId: 4, message: 'Hello' }] as FriendMessage[]);
});

describe('friend messages', () => {
  it('requires a session and a valid friend and message', async () => {
    expect((await request(app).get('/api/messages/2')).status).toBe(401);
    const agent = request.agent(app);
    await agent.post('/test-login');
    expect((await agent.get('/api/messages/nope')).status).toBe(400);
    expect((await agent.post('/api/messages/2').send({ message: ' ' })).status).toBe(400);
    expect((await agent.post('/api/messages/2').send({ message: 'x'.repeat(501) })).status).toBe(400);
  });

  it('sends to accepted friends and loads the conversation', async () => {
    const agent = request.agent(app);
    await agent.post('/test-login');
    const sent = await agent.post('/api/messages/2').send({ message: ' Hello ' });
    expect(sent.status).toBe(201);
    expect(FriendMessage.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hello', recipientId: 2 }));
    const conversation = await agent.get('/api/messages/2');
    expect(conversation.status).toBe(200);
    expect(conversation.body[0].message).toBe('Hello');
    expect(FriendMessage.update).toHaveBeenCalled();
  });

  it('does not show or send messages to non-friends', async () => {
    vi.spyOn(Friendship, 'findOne').mockResolvedValue(null);
    const agent = request.agent(app);
    await agent.post('/test-login');
    expect((await agent.get('/api/messages/2')).status).toBe(403);
    expect((await agent.post('/api/messages/2').send({ message: 'Hello' })).status).toBe(403);
  });

  it('does not send to an account that no longer exists', async () => {
    vi.spyOn(User, 'findByPk').mockResolvedValue(null);
    const agent = request.agent(app);
    await agent.post('/test-login');
    expect((await agent.post('/api/messages/2').send({ message: 'Hello' })).status).toBe(403);
  });
});
