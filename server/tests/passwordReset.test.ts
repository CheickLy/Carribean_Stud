import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { authRouter } from '../src/modules/auth/auth.routes.js';
import { User } from '../src/models/user.js';
import { PasswordResetToken } from '../src/models/passwordResetToken.js';
import { sequelize } from '../src/db/sequelize.js';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);
beforeEach(() => { vi.restoreAllMocks(); });
describe('Password reset', () => {
  it.each([{}, { email: 123 }, { email: '   ' }])('requires an email: %j', async body => {
    expect((await request(app).post('/auth/forgot-password').send(body)).status).toBe(400);
  });
  it('replaces old links and stores only a hash of the new token', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({ userId: 7 } as User);
    const destroy = vi.spyOn(PasswordResetToken, 'destroy').mockResolvedValue(1);
    const create = vi.spyOn(PasswordResetToken, 'create').mockResolvedValue({} as any);
    const response = await request(app).post('/auth/forgot-password').send({ email: ' Person@Example.com ' });
    expect(response.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'person@example.com', isGuest: false } });
    const token = new URL(response.body.resetPath, 'http://localhost').searchParams.get('token')!;
    expect(destroy).toHaveBeenCalledWith({ where: { userId: 7, usedAt: null } });
    expect(create).toHaveBeenCalledWith({ userId: 7, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: expect.any(Date), usedAt: null });
    expect((create.mock.calls[0][0] as any).expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('does not reveal unknown users or storage failures', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const unknown = await request(app).post('/auth/forgot-password').send({ email: 'unknown@example.com' });
    vi.mocked(User.findOne).mockRejectedValue(new Error('offline'));
    const failed = await request(app).post('/auth/forgot-password').send({ email: 'known@example.com' });
    expect(failed.status).toBe(200);
    expect(failed.body).toEqual(unknown.body);
    expect(failed.body.resetPath).toBeUndefined();
  });
  it.each([{}, { token: 123, password: 'Password123' }, { token: 'abc', password: 123 }, { token: 'abc', password: 'short' }, { token: 'abc', password: 'x'.repeat(73) }])('rejects invalid reset input %j', async body => {
    expect((await request(app).post('/auth/reset-password').send(body)).status).toBe(400);
  });
  it('rejects expired or already used tokens', async () => {
    vi.spyOn(PasswordResetToken, 'findOne').mockResolvedValue(null);
    expect((await request(app).post('/auth/reset-password').send({ token: 'expired', password: 'Password123' })).status).toBe(400);
  });
  it('changes the password and consumes the token in one transaction', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(PasswordResetToken, 'findOne').mockResolvedValue({ userId: 7, update } as any);
    const transaction = { id: 'test-transaction' };
    vi.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => callback(transaction));
    vi.spyOn(User, 'update').mockResolvedValue([1]);
    const response = await request(app).post('/auth/reset-password').send({ token: 'valid', password: 'NewPassword123' });
    expect(response.status).toBe(200);
    const values = vi.mocked(User.update).mock.calls[0][0] as any;
    expect(await bcrypt.compare('NewPassword123', values.passwordHash)).toBe(true);
    expect(User.update).toHaveBeenCalledWith({ passwordHash: expect.any(String) }, { where: { userId: 7 }, transaction });
    expect(update).toHaveBeenCalledWith({ usedAt: expect.any(Date) }, { transaction });
  });
  it('reports reset storage failures', async () => {
    vi.spyOn(PasswordResetToken, 'findOne').mockRejectedValue(new Error('offline'));
    expect((await request(app).post('/auth/reset-password').send({ token: 'valid', password: 'Password123' })).status).toBe(500);
  });
});
