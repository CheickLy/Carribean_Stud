import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/user.js';

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
        createdAt: createdAt.toISOString(),
      },
    ]);
    expect(response.body[0].passwordHash).toBeUndefined();
  });
});
