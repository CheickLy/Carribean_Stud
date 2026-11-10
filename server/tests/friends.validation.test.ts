import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { friendsRouter } from '../src/modules/friends/friends.routes.js';
import * as service from '../src/modules/friends/friends.service.js';
vi.mock('../src/modules/friends/friends.service.js', () => ({
  sendFriendRequest: vi.fn(), getFriends: vi.fn(), getPendingRequests: vi.fn(),
  respondToFriendRequest: vi.fn(), removeFriendship: vi.fn(),
}));
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.session = { userId: 42 } as typeof req.session; next(); });
app.use('/friends', friendsRouter);
beforeEach(() => vi.resetAllMocks());
describe('Friends route validation and failures', () => {
  it.each([{}, { username: 12 }, { username: ' ' }])('rejects invalid usernames %j', async body => {
    expect((await request(app).post('/friends/requests').send(body)).status).toBe(400);
    expect(service.sendFriendRequest).not.toHaveBeenCalled();
  });
  it('returns friends and pending requests for the session user', async () => {
    vi.mocked(service.getFriends).mockResolvedValue([{ userId: 7, username: 'Alice' }] as any);
    vi.mocked(service.getPendingRequests).mockResolvedValue([{ friendshipId: 3 }] as any);
    expect((await request(app).get('/friends')).body).toEqual([{ userId: 7, username: 'Alice' }]);
    expect((await request(app).get('/friends/requests')).body).toEqual([{ friendshipId: 3 }]);
    expect(service.getFriends).toHaveBeenCalledWith(42);
    expect(service.getPendingRequests).toHaveBeenCalledWith(42);
  });
  it('reports failures loading lists', async () => {
    vi.mocked(service.getFriends).mockRejectedValue(new Error('offline'));
    vi.mocked(service.getPendingRequests).mockRejectedValue(new Error('offline'));
    expect((await request(app).get('/friends')).status).toBe(500);
    expect((await request(app).get('/friends/requests')).status).toBe(500);
  });
  it.each(['bad', '0', '-1', '1.5'])('rejects invalid friendship ID %s', async id => {
    expect((await request(app).patch(`/friends/requests/${id}`).send({ action: 'accept' })).status).toBe(400);
    expect((await request(app).delete(`/friends/${id}`)).status).toBe(400);
    expect(service.removeFriendship).not.toHaveBeenCalled();
    expect(service.respondToFriendRequest).not.toHaveBeenCalled();
  });
  it('rejects unsupported actions', async () => {
    expect((await request(app).patch('/friends/requests/1').send({ action: 'approve' })).status).toBe(400);
  });
  it('removes a friendship using the session identity', async () => {
    vi.mocked(service.removeFriendship).mockResolvedValue({ message: 'Removed' });
    const response = await request(app).delete('/friends/3');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Removed');
    expect(service.removeFriendship).toHaveBeenCalledWith(42, 3);
  });
  it.each([new Error('Not allowed'), 'unexpected'])('handles rejected operations: %s', async error => {
    vi.mocked(service.sendFriendRequest).mockRejectedValue(error);
    vi.mocked(service.respondToFriendRequest).mockRejectedValue(error);
    vi.mocked(service.removeFriendship).mockRejectedValue(error);
    const responses = await Promise.all([
      request(app).post('/friends/requests').send({ username: 'Alice' }),
      request(app).patch('/friends/requests/3').send({ action: 'reject' }),
      request(app).delete('/friends/3'),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(error instanceof Error ? error.message : 'Request failed.');
    }
  });
});
