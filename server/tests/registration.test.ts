import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { UniqueConstraintError } from 'sequelize';

import { authRouter } from '../src/modules/auth/auth.routes.js';
import { User } from '../src/models/user.js';


const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const validRegistration = {
  username: 'testplayer01',
  email: 'testplayer01@example.com',
  password: 'TestPassword123!',
};

const createdUser = {
  userId: 4,
  username: 'testplayer01',
  email: 'testplayer01@example.com',
  role: 'player',
  balance: '0.00',
};

beforeEach(() => {
  vi.restoreAllMocks();

  vi.spyOn(User, 'findOne').mockResolvedValue(null);

  vi.spyOn(User, 'create').mockResolvedValue(
    createdUser as User,
  );
});

describe('POST /api/auth/register (S4)', () => {
  it('registers a new player successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      'Registration successful',
    );
    expect(response.body.user.username).toBe('testplayer01');
    expect(response.body.user.role).toBe('player');
    expect(response.body.user.balance).toBe('0.00');
  });

  it('never returns a password hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration);

    expect(response.status).toBe(201);
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.user.password).toBeUndefined();
  });

  it('hashes the password before saving it', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration);

    expect(response.status).toBe(201);

    expect(User.create).toHaveBeenCalledOnce();

    const savedData = vi.mocked(User.create).mock.calls[0][0];

    expect(savedData.passwordHash).not.toBe(
      validRegistration.password,
    );

    expect(
      await bcrypt.compare(
        validRegistration.password,
        savedData.passwordHash!,
      ),
    ).toBe(true);
  });

  it('assigns the player role instead of admin', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        role: 'admin',
        balance: '999999.00',
      });

    expect(response.status).toBe(201);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'player',
        balance: '0.00',
        isGuest: false,
        isBanned: false,
      }),
    );
  });

  it('rejects a duplicate email', async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce(
      createdUser as User,
    );

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        username: 'differentplayer',
      });

    expect(response.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate username', async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce(
      createdUser as User,
    );

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        email: 'different@example.com',
      });

    expect(response.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects missing required fields', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        email: 'not-an-email',
      });

    expect(response.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects a username shorter than 3 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        username: 'ab',
      });

    expect(response.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 8 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('normalizes email addresses', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        email: '  TESTPLAYER01@EXAMPLE.COM  ',
      });

    expect(response.status).toBe(201);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'testplayer01@example.com',
      }),
    );
  });

  it('handles a database uniqueness conflict', async () => {
    vi.mocked(User.create).mockRejectedValueOnce(
      new UniqueConstraintError({
        errors: [],
      }),
    );

    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration);

    expect(response.status).toBe(409);
  });
});
