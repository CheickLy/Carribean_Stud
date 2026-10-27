import express from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../src/models/user.js';
import { usersRouter } from '../src/modules/users/users.routes.js';

function makeApp(userId?: number) {
  const app = express();
  app.use(express.json());

  if (userId) {
    app.use(((req, _res, next) => {
      req.session = { userId } as typeof req.session;
      next();
    }) as RequestHandler);
  }

  app.use('/api/users', usersRouter);
  return app;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Change avatar (S18)', () => {
  it('lists the supported avatar choices', async () => {
    const response = await request(makeApp()).get('/api/users/avatars');

    expect(response.status).toBe(200);
    expect(response.body.avatars).toContain('wave');
    expect(response.body.avatars).toContain('turtle');
  });

  it('requires a logged-in user', async () => {
    const response = await request(makeApp())
      .patch('/api/users/me/avatar')
      .send({ avatar: 'turtle' });

    expect(response.status).toBe(401);
  });

  it('rejects an unsupported avatar without changing the user', async () => {
    const findByPk = vi.spyOn(User, 'findByPk');

    const response = await request(makeApp(7))
      .patch('/api/users/me/avatar')
      .send({ avatar: 'custom-picture' });

    expect(response.status).toBe(400);
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('saves a supported avatar for the logged-in user', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      userId: 7,
      username: 'marina',
      avatar: 'wave',
      update,
    } as unknown as User);

    const response = await request(makeApp(7))
      .patch('/api/users/me/avatar')
      .send({ avatar: 'dolphin' });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ avatar: 'dolphin' });
    expect(response.body.user).toEqual({
      userId: 7,
      username: 'marina',
      avatar: 'dolphin',
    });
  });

  it('lets a player change an avatar while admin routes stay closed', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(User, 'findByPk').mockResolvedValue({
      userId: 7,
      username: 'marina',
      role: 'player',
      isBanned: false,
      avatar: 'wave',
      update,
    } as unknown as User);
    const findAll = vi.spyOn(User, 'findAll');
    const app = makeApp(7);

    const avatar = await request(app)
      .patch('/api/users/me/avatar')
      .send({ avatar: 'dolphin' });
    const list = await request(app).get('/api/users');

    expect(avatar.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ avatar: 'dolphin' });
    expect(list.status).toBe(403);
    expect(list.body.error).toBe('Admin access required.');
    expect(findAll).not.toHaveBeenCalled();
  });
});
