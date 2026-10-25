
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import bcrypt from 'bcryptjs';

import { authRouter } from '../src/modules/auth/auth.routes.js';
import { User } from '../src/models/user.js';

// Isolated test app: no PostgreSQL session store.
const app = express();

app.use(express.json());

app.use(
  session({
    secret: 'test-only-session-secret',
    resave: false,
    saveUninitialized: false,
    store: new session.MemoryStore(),
    cookie: { httpOnly: true },
  }),
);

app.use('/api/auth', authRouter);

// Fake user with a real bcrypt password hash.
const testUser = {
  userId: 2,
  username: 'marina',
  email: 'marina@example.com',
  passwordHash: bcrypt.hashSync('Password123!', 4),
  role: 'player',
  balance: '250.00',
  isBanned: false,
};

beforeEach(() => {
  vi.restoreAllMocks();

  vi.spyOn(User, 'findOne').mockResolvedValue(
    testUser as unknown as User,
  );

  vi.spyOn(User, 'findByPk').mockResolvedValue(
    testUser as unknown as User,
  );
});

describe('ReefRoyale authentication (S1)', () => {
  it('logs in with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'marina@example.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.user.username).toBe('marina');
    expect(response.body.user.role).toBe('player');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects an incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'marina@example.com',
        password: 'WrongPassword123',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      'Invalid email or password',
    );
  });

  it('rejects an unknown email address', async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown@example.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(401);
  });

  it('rejects missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marina@example.com' });

    expect(response.status).toBe(400);
  });

  it('rejects unauthenticated access to /me', async () => {
    const response = await request(app)
      .get('/api/auth/me');

    expect(response.status).toBe(401);
  });

  it('maintains the session after login', async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: 'marina@example.com',
        password: 'Password123!',
      });

    expect(loginResponse.status).toBe(200);

    const meResponse = await agent.get('/api/auth/me');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.username).toBe('marina');
  });

  it('logs out and invalidates the session', async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: 'marina@example.com',
        password: 'Password123!',
      });

    expect(loginResponse.status).toBe(200);

    const logoutResponse = await agent
      .post('/api/auth/logout');

    expect(logoutResponse.status).toBe(200);

    const meResponse = await agent.get('/api/auth/me');

    expect(meResponse.status).toBe(401);
  });

  it('rejects banned users', async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce({
      ...testUser,
      isBanned: true,
    } as unknown as User);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'marina@example.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(403);
  });
});
