import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { User } from '../src/models/user.js';
import { Friendship } from '../src/models/friendship.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Friends API with login sessions', () => {
  it('requires login to send a friend request', async () => {
    const create = vi.spyOn(Friendship, 'create');
    const response = await request(app)
      .post('/api/friends/requests')
      .send({ username: 'friend' });
    expect(response.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('uses the logged-in user to send and accept a friend request', async () => {
    const passwordHash = bcrypt.hashSync('Password123!', 4);
    vi.spyOn(User, 'findOne')
      .mockResolvedValueOnce({ userId: 1, username: 'sender', passwordHash } as User)
      .mockResolvedValueOnce({ userId: 2, username: 'friend' } as User)
      .mockResolvedValueOnce({ userId: 2, username: 'friend', passwordHash } as User);
    const save = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(Friendship, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ friendshipId: 7, status: 'pending', save } as unknown as Friendship);
    const create = vi.spyOn(Friendship, 'create').mockResolvedValue({
      friendshipId: 7, status: 'pending',
    } as Friendship);
    const sender = request.agent(app);
    const login = await sender.post('/api/auth/login')
      .send({ email: 'sender@example.com', password: 'Password123!' });
    expect(login.status).toBe(200);
    const sent = await sender.post('/api/friends/requests')
      .send({ username: 'friend', userId: 999 });
    expect(sent.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ userId: 1, friendId: 2, status: 'pending' });
    expect(sent.body).toEqual({ friendshipId: 7, recipientId: 2, recipientUsername: 'friend', status: 'pending' });

    const recipient = request.agent(app);
    expect((await recipient.post('/api/auth/login')
      .send({ email: 'friend@example.com', password: 'Password123!' })).status).toBe(200);
    const accepted = await recipient.patch('/api/friends/requests/7').send({ action: 'accept' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('accepted');
    expect(Friendship.findOne).toHaveBeenLastCalledWith({
      where: { friendshipId: 7, friendId: 2, status: 'pending' },
    });
    expect(save).toHaveBeenCalledOnce();
    await sender.post('/api/auth/logout');
    expect((await sender.post('/api/friends/requests').send({ username: 'friend' })).status).toBe(401);
  });
});
