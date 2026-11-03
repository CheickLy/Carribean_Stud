import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { authRouter } from '../src/modules/auth/auth.routes.js';
import { supportRouter } from '../src/modules/support/support.routes.js';
import { SupportTicket } from '../src/models/supportTicket.js';
import { User } from '../src/models/user.js';

const app = express();
app.use(express.json());
app.use(session({ secret: 'support-test', resave: false, saveUninitialized: false, store: new session.MemoryStore() }));
app.use('/api/auth', authRouter);
app.use('/api/support-tickets', supportRouter);

const account = {
  userId: 1, username: 'reefadmin', email: 'admin@example.com',
  passwordHash: bcrypt.hashSync('Password123!', 4), role: 'admin',
  isBanned: false, isGuest: false, balance: '500.00', avatar: 'wave',
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(User, 'findOne').mockResolvedValue(account as unknown as User);
  vi.spyOn(User, 'findByPk').mockResolvedValue(account as unknown as User);
});

describe('admin support tickets', () => {
  it('requires a session for reading and updating', async () => {
    expect((await request(app).get('/api/support-tickets')).status).toBe(401);
    expect((await request(app).patch('/api/support-tickets/1').send({ status: 'resolved', resolutionNote: 'Done' })).status).toBe(401);
  });

  it('rejects a signed-in player', async () => {
    const player = { ...account, role: 'player' };
    vi.spyOn(User, 'findOne').mockResolvedValue(player as unknown as User);
    vi.spyOn(User, 'findByPk').mockResolvedValue(player as unknown as User);
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email: player.email, password: 'Password123!' })).status).toBe(200);
    expect((await agent.get('/api/support-tickets')).status).toBe(403);
    expect((await agent.patch('/api/support-tickets/1').send({ status: 'resolved', resolutionNote: 'Done' })).status).toBe(403);
  });

  it('lets an admin list and update a ticket, but rejects bad status', async () => {
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email: account.email, password: 'Password123!' })).status).toBe(200);
    const ticket = {
      ticketId: 7, subject: 'Table issue', message: 'Could not join', status: 'open',
      resolutionNote: null, createdAt: new Date('2026-10-30T12:00:00Z'),
      get: (field: string) => field === 'user' ? { username: 'marina', email: 'marina@example.com' } : null,
      update: vi.fn(async function (this: typeof ticket, values: { status: string; resolutionNote: string }) {
        this.status = values.status; this.resolutionNote = values.resolutionNote;
      }),
    };
    vi.spyOn(SupportTicket, 'findAll').mockResolvedValue([ticket] as unknown as SupportTicket[]);
    vi.spyOn(SupportTicket, 'findByPk').mockResolvedValue(ticket as unknown as SupportTicket);
    const list = await agent.get('/api/support-tickets');
    expect(list.status).toBe(200);
    expect(list.body[0].subject).toBe('Table issue');
    expect(list.body[0].player.email).toBe('marina@example.com');
    expect((await agent.patch('/api/support-tickets/7').send({ status: 'invalid', resolutionNote: '' })).status).toBe(400);
    const saved = await agent.patch('/api/support-tickets/7').send({ status: 'resolved', resolutionNote: 'Fixed the table' });
    expect(saved.status).toBe(200);
    expect(saved.body.status).toBe('resolved');
    expect(saved.body.resolutionNote).toBe('Fixed the table');
  });

  it('lists a ticket with no player and returns 404 when the update cannot be reread', async () => {
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email: account.email, password: 'Password123!' })).status).toBe(200);
    const ticket = {
      ticketId: 8, subject: 'Missing player', message: 'Gone', status: 'open',
      resolutionNote: null, createdAt: new Date('2026-10-30T12:00:00Z'),
      get: () => null,
      update: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(SupportTicket, 'findAll').mockResolvedValue([ticket] as unknown as SupportTicket[]);
    const list = await agent.get('/api/support-tickets');
    expect(list.status).toBe(200);
    expect(list.body[0].player).toBeNull();

    vi.spyOn(SupportTicket, 'findByPk')
      .mockResolvedValueOnce(ticket as unknown as SupportTicket)
      .mockResolvedValueOnce(null);
    const saved = await agent.patch('/api/support-tickets/8').send({ status: 'open', resolutionNote: null });
    expect(saved.status).toBe(404);
  });

  it('forwards a ticket list failure', async () => {
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send({ email: account.email, password: 'Password123!' })).status).toBe(200);
    vi.spyOn(SupportTicket, 'findAll').mockRejectedValue(new Error('db down'));

    expect((await agent.get('/api/support-tickets')).status).toBe(500);
  });
});
