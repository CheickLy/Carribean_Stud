import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { User } from '../src/models/user.js';

const adminCaller = {
  userId: 1,
  username: 'alex',
  email: 'alex@example.com',
  role: 'admin',
  isBanned: false,
} as unknown as User;

beforeEach(() => {
  vi.restoreAllMocks();
});

async function loginAs(user: { userId: number; role: string; isBanned?: boolean }) {
  vi.spyOn(User, 'findOne').mockResolvedValueOnce({
    userId: user.userId,
    username: 'alex',
    email: 'alex@example.com',
    passwordHash: bcrypt.hashSync('Password123!', 4),
    role: user.role,
    isBanned: user.isBanned ?? false,
  } as unknown as User);

  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/login')
    .send({ email: 'alex@example.com', password: 'Password123!' });
  expect(login.status).toBe(200);
  return agent;
}

describe('GET /api/users', () => {
  it('returns users without password hashes', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

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

    const response = await agent.get('/api/users');

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

  it('rejects an anonymous caller', async () => {
    const findAll = vi.spyOn(User, 'findAll');

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required.');
    expect(findAll).not.toHaveBeenCalled();
  });

  it('rejects a player', async () => {
    const agent = await loginAs({ userId: 2, role: 'player' });
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      userId: 2,
      role: 'player',
      isBanned: false,
    } as unknown as User);
    const findAll = vi.spyOn(User, 'findAll');

    const response = await agent.get('/api/users');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin access required.');
    expect(findAll).not.toHaveBeenCalled();
  });

  it('rejects a banned admin', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      userId: 1,
      role: 'admin',
      isBanned: true,
    } as unknown as User);

    const response = await agent.get('/api/users');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('This account is disabled');
  });

  it('forwards a database error', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);
    vi.spyOn(User, 'findAll').mockRejectedValue(new Error('db down'));

    const response = await agent.get('/api/users');

    expect(response.status).toBe(500);
  });
});

describe('PATCH /api/users/:userId/ban', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  function mockUser(isBanned: boolean) {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
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
          createdAt,
        }),
      } as unknown as User);

    return update;
  }

  it('sets the ban flag', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const update = mockUser(true);

    const response = await agent
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ isBanned: true });
    expect(response.body.isBanned).toBe(true);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('clears the ban flag', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const update = mockUser(false);

    const response = await agent
      .patch('/api/users/2/ban')
      .send({ isBanned: false });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ isBanned: false });
    expect(response.body.isBanned).toBe(false);
  });

  it('returns 404 when the user does not exist', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(null);

    const response = await agent
      .patch('/api/users/99/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(404);
  });

  it('returns 400 when the ban flag is missing', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

    const response = await agent.patch('/api/users/2/ban').send({});

    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-numeric user id', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

    const response = await agent
      .patch('/api/users/abc/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-positive user id', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

    const response = await agent
      .patch('/api/users/0/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(400);
  });

  it('returns 400 when the ban flag is not a boolean', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

    const response = await agent
      .patch('/api/users/2/ban')
      .send({ isBanned: 'true' });

    expect(response.status).toBe(400);
  });

  it('returns 404 when the user disappears after the update', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce({
        update: vi.fn().mockResolvedValue(undefined),
      } as unknown as User)
      .mockResolvedValueOnce(null);

    const response = await agent
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(404);
  });

  it('forwards a database error', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce({
        update: vi.fn().mockRejectedValue(new Error('db down')),
      } as unknown as User);

    const response = await agent
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(500);
  });

  it('rejects an anonymous caller', async () => {
    const findByPk = vi.spyOn(User, 'findByPk');

    const response = await request(app)
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(401);
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('rejects a player', async () => {
    const agent = await loginAs({ userId: 2, role: 'player' });
    const update = vi.fn();
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      userId: 2,
      role: 'player',
      isBanned: false,
      update,
    } as unknown as User);

    const response = await agent
      .patch('/api/users/2/ban')
      .send({ isBanned: true });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin access required.');
    expect(update).not.toHaveBeenCalled();
  });
});
