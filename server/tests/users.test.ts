import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/user.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/users', () => {
  it('returns users without password hashes', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    vi.spyOn(User, 'findAll').mockResolvedValue([
      {
        get: () => ({
          userId: 1,
          username: 'ada',
          email: 'ada@example.com',
          role: 'player',
          topupCount: 0,
          isGuest: false,
          isBanned: false,
          balance: '0.00',
          avatar: 'wave',
          createdAt,
        }),
      },
    ] as unknown as User[]);

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        userId: 1,
        username: 'ada',
        email: 'ada@example.com',
        role: 'player',
        topupCount: 0,
        isGuest: false,
        isBanned: false,
        balance: '0.00',
        avatar: 'wave',
        createdAt: createdAt.toISOString(),
      },
    ]);
    expect(response.body[0].passwordHash).toBeUndefined();
  });

  it('forwards a database error', async () => {
    vi.spyOn(User, 'findAll').mockRejectedValue(new Error('db down'));

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/users/:userId/ban', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  function mockUser(isBanned: boolean) {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce({ update } as unknown as User)
      .mockResolvedValueOnce({
        get: () => ({
          userId: 2,
          username: 'marina',
          email: 'marina@example.com',
          role: 'player',
          topupCount: 4,
          isGuest: false,
          isBanned,
          balance: '250.00',
          avatar: 'turtle',
          createdAt,
        }),
      } as unknown as User);

    return update;
  }

  it('sets the ban flag', async () => {
    const update = mockUser(true);

    const response = await request(app)
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ isBanned: true });
    expect(response.body.isBanned).toBe(true);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('clears the ban flag', async () => {
    const update = mockUser(false);

    const response = await request(app)
      .patch('/api/users/2/ban')
      .send({ isBanned: false });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ isBanned: false });
    expect(response.body.isBanned).toBe(false);
  });

  it('returns 404 when the user does not exist', async () => {
    vi.spyOn(User, 'findByPk').mockResolvedValue(null);

    const response = await request(app)
      .patch('/api/users/99/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(404);
  });

  it('returns 400 when the ban flag is missing', async () => {
    const findByPk = vi.spyOn(User, 'findByPk');

    const response = await request(app).patch('/api/users/2/ban').send({});

    expect(response.status).toBe(400);
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-numeric user id', async () => {
    const response = await request(app)
      .patch('/api/users/abc/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-positive user id', async () => {
    const response = await request(app)
      .patch('/api/users/0/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(400);
  });

  it('returns 400 when the ban flag is not a boolean', async () => {
    const response = await request(app)
      .patch('/api/users/2/ban')
      .send({ isBanned: 'true' });

    expect(response.status).toBe(400);
  });

  it('returns 404 when the user disappears after the update', async () => {
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce({
        update: vi.fn().mockResolvedValue(undefined),
      } as unknown as User)
      .mockResolvedValueOnce(null);

    const response = await request(app)
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(404);
  });

  it('forwards a database error', async () => {
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      update: vi.fn().mockRejectedValue(new Error('db down')),
    } as unknown as User);

    const response = await request(app)
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(500);
  });
});
