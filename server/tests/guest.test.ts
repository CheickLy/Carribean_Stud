import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { User } from '../src/models/user.js';
import { authRouter } from '../src/modules/auth/auth.routes.js';

const app = express();
app.use(express.json());
app.use(session({
  secret: 'guest-auth-test-only', resave: false, saveUninitialized: false,
  store: new session.MemoryStore()
}));
app.use('/api/auth', authRouter);

const users = new Map<number, any>();
let nextId = 10;

beforeEach(() => {
  vi.restoreAllMocks();
  users.clear();
  nextId = 10;
  vi.spyOn(User, 'findByPk').mockImplementation(async (id) => users.get(Number(id)) ?? null);
  vi.spyOn(User, 'findOne').mockResolvedValue(null);
  vi.spyOn(User, 'create').mockImplementation(async (values: any) => {
    const user: any = { ...values, userId: nextId++ };
    user.update = vi.fn(async (changes: any) => {
      Object.assign(user, changes);
      return user;
    });
    users.set(user.userId, user);
    return user;
  });
});

describe('Guest account flow', () => {
  it('starts a guest with exactly 500 chips and keeps the session', async () => {
    const agent = request.agent(app);
    const started = await agent.post('/api/auth/guest');
    expect(started.status).toBe(201);
    expect(started.body.user.isGuest).toBe(true);
    expect(started.body.user.balance).toBe('500.00');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.isGuest).toBe(true);
    expect(me.body.user.balance).toBe('500.00');
  });

  it('does not refill an existing guest when guest play is clicked again', async () => {
    const agent = request.agent(app);
    const first = await agent.post('/api/auth/guest');
    const stored = users.get(first.body.user.userId);
    stored.balance = '275.00';
    const again = await agent.post('/api/auth/guest');
    expect(again.status).toBe(200);
    expect(again.body.user.balance).toBe('275.00');
    expect(User.create).toHaveBeenCalledTimes(1);
  });

  it('converts a guest to a player without losing chips or changing user ID', async () => {
    const agent = request.agent(app);
    const guest = await agent.post('/api/auth/guest');
    const stored = users.get(guest.body.user.userId);
    stored.balance = '735.00';

    const registered = await agent.post('/api/auth/register').send({
      username: 'saved_guest', email: 'saved@example.com',
      password: 'Password123!'
    });
    expect(registered.status).toBe(201);
    expect(registered.body.user.userId).toBe(guest.body.user.userId);
    expect(registered.body.user.isGuest).toBe(false);
    expect(registered.body.user.balance).toBe('735.00');
    expect(User.create).toHaveBeenCalledTimes(1);

    const current = await agent.get('/api/auth/me');
    expect(current.body.user.balance).toBe('735.00');
    expect(current.body.user.isGuest).toBe(false);
  });

  it('does not refill a registered player after clicking guest play', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/guest');
    await agent.post('/api/auth/register').send({
      username: 'playerone', email: 'player@example.com',
      password: 'Password123!'
    });
    const again = await agent.post('/api/auth/guest');
    expect(again.status).toBe(200);
    expect(again.body.user.isGuest).toBe(false);
    expect(User.create).toHaveBeenCalledTimes(1);
  });

  it('restores converted player chips after logging out and back in', async () => {
    const agent = request.agent(app);
    const started = await agent.post('/api/auth/guest');
    users.get(started.body.user.userId).balance = '925.00';
    const registered = await agent.post('/api/auth/register').send({
      username: 'returning_player', email: 'returning@example.com',
      password: 'Password123!'
    });
    expect(registered.status).toBe(201);
    const stored = users.get(started.body.user.userId);
    vi.mocked(User.findOne).mockResolvedValue(stored as User);
    await agent.post('/api/auth/logout');
    const login = await agent.post('/api/auth/login').send({
      email: 'returning@example.com', password: 'Password123!'
    });
    expect(login.status).toBe(200);
    expect(login.body.user.balance).toBe('925.00');
    expect((await agent.get('/api/auth/me')).body.user.balance).toBe('925.00');
  });

  it('invalidates the guest session on logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/guest');
    expect((await agent.post('/api/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
