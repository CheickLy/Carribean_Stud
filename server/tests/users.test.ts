import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { UniqueConstraintError } from 'sequelize';
import { app } from '../src/app.js';
import { sequelize } from '../src/db/sequelize.js';
import { GameHand } from '../src/models/gameHand.js';
import { Lobby } from '../src/models/lobby.js';
import { LobbyMember } from '../src/models/lobbyMember.js';
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
          avatar: 'wave',
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
        avatar: 'wave',
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
          avatar: 'turtle',
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

describe('PATCH /api/users/:userId', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  function playerRow(update = vi.fn().mockResolvedValue(undefined)) {
    return {
      userId: 2,
      username: 'marina',
      email: 'marina@example.com',
      role: 'player',
      topupCount: 4,
      isGuest: false,
      isBanned: false,
      balance: '250.00',
      avatar: 'turtle',
      createdAt,
      update,
    } as unknown as User;
  }

  it('saves a new username and email', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(playerRow(update));
    vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    const response = await agent
      .patch('/api/users/2')
      .send({ username: ' marina_2 ', email: 'Marina2@Example.com' });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      username: 'marina_2',
      email: 'marina2@example.com',
    });
    expect(response.body.username).toBe('marina_2');
    expect(response.body.email).toBe('marina2@example.com');
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate username or email', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const update = vi.fn();
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(playerRow(update));
    vi.spyOn(User, 'findOne').mockResolvedValueOnce({ userId: 3 } as User);

    const response = await agent
      .patch('/api/users/2')
      .send({ username: 'julian', email: 'julian@example.com' });

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a username that fails the registry rules', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(playerRow());

    const response = await agent
      .patch('/api/users/2')
      .send({ username: 'no', email: 'marina@example.com' });

    expect(response.status).toBe(400);
  });

  it('maps a unique constraint failure to a conflict', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const update = vi.fn().mockRejectedValue(new UniqueConstraintError({}));
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(playerRow(update));
    vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    const response = await agent
      .patch('/api/users/2')
      .send({ username: 'marina', email: 'marina@example.com' });

    expect(response.status).toBe(409);
  });

  it('refuses edits to the signed-in admin or another admin', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

    const self = await agent
      .patch('/api/users/1')
      .send({ username: 'reefadmin', email: 'admin@example.com' });
    const other = await agent
      .patch('/api/users/8')
      .send({ username: 'otheradmin', email: 'other@example.com' });

    expect(self.status).toBe(403);
    expect(other.status).toBe(403);
  });

  it('rejects a player', async () => {
    const agent = await loginAs({ userId: 2, role: 'player' });
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      userId: 2,
      role: 'player',
      isBanned: false,
    } as unknown as User);

    const response = await agent
      .patch('/api/users/3')
      .send({ username: 'marina', email: 'marina@example.com' });

    expect(response.status).toBe(403);
  });

  it('returns 400 for a partial body and 404 when the account is missing', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(null);

    const partial = await agent.patch('/api/users/2').send({ username: 'marina' });
    const missing = await agent
      .patch('/api/users/44')
      .send({ username: 'marina', email: 'marina@example.com' });

    expect(partial.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});

describe('DELETE /api/users/:userId', () => {
  function armDelete(target: User | null) {
    vi.spyOn(sequelize, 'transaction').mockImplementation(async (callback) => {
      if (typeof callback !== 'function') return undefined;
      return callback({} as never);
    });
    vi.spyOn(GameHand, 'update').mockResolvedValue([1] as never);
    vi.spyOn(Lobby, 'findAll').mockResolvedValue([] as never);
    vi.spyOn(sequelize, 'query').mockResolvedValue([[], null] as never);
    vi.spyOn(User, 'findByPk')
      .mockResolvedValueOnce(adminCaller)
      .mockResolvedValueOnce(target);
  }

  it('removes the row, anonymizes hands, and drops login sessions', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const destroy = vi.fn().mockResolvedValue(undefined);
    armDelete({ userId: 2, role: 'player', destroy } as unknown as User);
    vi.mocked(sequelize.query).mockResolvedValue([
      [{ sid: 'sid-2', data: JSON.stringify({ userId: 2 }) }],
      null,
    ] as never);

    const response = await agent.delete('/api/users/2');

    expect(response.status).toBe(204);
    expect(GameHand.update).toHaveBeenCalledWith(
      { playerLabel: 'Deleted player', userId: null },
      expect.objectContaining({ where: { userId: 2 } }),
    );
    expect(sequelize.query).toHaveBeenCalledWith(
      'DELETE FROM "Sessions" WHERE sid IN (:sids)',
      expect.objectContaining({ replacements: { sids: ['sid-2'] } }),
    );
    expect(destroy).toHaveBeenCalled();
  });

  it('gives a hosted table to another player', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const destroy = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    armDelete({ userId: 2, role: 'player', destroy } as unknown as User);
    vi.spyOn(Lobby, 'findAll').mockResolvedValue([{ lobbyId: 4, update }] as never);
    vi.spyOn(LobbyMember, 'findOne').mockResolvedValue({ userId: 9 } as LobbyMember);

    const response = await agent.delete('/api/users/2');

    expect(response.status).toBe(204);
    expect(update).toHaveBeenCalledWith({ hostId: 9 }, expect.any(Object));
  });

  it('refuses to delete an admin account', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const destroy = vi.fn();
    armDelete({ userId: 8, role: 'admin', destroy } as unknown as User);

    const response = await agent.delete('/api/users/8');

    expect(response.status).toBe(403);
    expect(destroy).not.toHaveBeenCalled();
  });

  it('returns 404 when the user does not exist', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    armDelete(null);

    const response = await agent.delete('/api/users/99');

    expect(response.status).toBe(404);
  });

  it('refuses to delete the signed-in admin', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    vi.spyOn(User, 'findByPk').mockResolvedValue(adminCaller);

    const response = await agent.delete('/api/users/1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('You cannot delete your own account');
  });

  it('ignores unreadable sessions and removes a table with no other player', async () => {
    const agent = await loginAs({ userId: 1, role: 'admin' });
    const destroy = vi.fn().mockResolvedValue(undefined);
    const destroyLobby = vi.fn().mockResolvedValue(undefined);
    armDelete({ userId: 2, role: 'player', destroy } as unknown as User);
    vi.spyOn(Lobby, 'findAll').mockResolvedValue([
      { lobbyId: 4, destroy: destroyLobby },
    ] as never);
    vi.spyOn(LobbyMember, 'findOne').mockResolvedValue(null);
    vi.mocked(sequelize.query).mockResolvedValue([
      [
        { sid: 'bad', data: '{not-json' },
        { sid: 'obj', data: { userId: 2 } },
        { sid: 'other', data: JSON.stringify({ userId: 9 }) },
      ],
      null,
    ] as never);

    const response = await agent.delete('/api/users/2');

    expect(response.status).toBe(204);
    expect(destroyLobby).toHaveBeenCalled();
    expect(sequelize.query).toHaveBeenCalledWith(
      'DELETE FROM "Sessions" WHERE sid IN (:sids)',
      expect.objectContaining({ replacements: { sids: ['obj'] } }),
    );
  });
});
