import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const service = vi.hoisted(() => ({ sharedTable: vi.fn(), handHistory: vi.fn() }));
vi.mock('../src/modules/shared-game/service.js', () => service);
import { sharedGameRouter } from '../src/modules/shared-game/routes.js';
import { GameError } from '../src/modules/shared-game/engine.js';
function app(userId?: number) {
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.session = { userId } as any; next(); });
  app.use('/api/lobbies', sharedGameRouter);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(500).json({ error: error.message }); });
  return app;
}
beforeEach(() => { vi.resetAllMocks(); service.sharedTable.mockResolvedValue({ phase: 'betting' }); service.handHistory.mockResolvedValue([]); });
describe('shared-game HTTP boundary', () => {
  it('requires authentication and valid IDs', async () => {
    expect((await request(app()).post('/api/lobbies/1/game/state').send({})).status).toBe(401);
    expect((await request(app(7)).post('/api/lobbies/bad/game/state').send({})).status).toBe(400);
    expect((await request(app(1.5)).post('/api/lobbies/1/game/state').send({})).status).toBe(401);
    expect((await request(app(7)).post('/api/lobbies/0/game/state').send({})).status).toBe(400);
    expect(service.sharedTable).not.toHaveBeenCalled();
  });
  it('uses the session identity and sends no-cache views', async () => {
    const response = await request(app(7)).post('/api/lobbies/1/game/ante').send({ userId: 99, roundId: 8, ante: 10 });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.sharedTable).toHaveBeenCalledWith(1, 7, { kind: 'ante', roundId: 8, amount: 10 });
  });
  it('rejects malformed actions, missing round IDs and incorrect methods', async () => {
    expect((await request(app(7)).post('/api/lobbies/1/game/action').send({ roundId: 8, action: 'win' })).status).toBe(400);
    expect((await request(app(7)).post('/api/lobbies/1/game/action').send({ action: 'raise' })).status).toBe(400);
    expect((await request(app(7)).get('/api/lobbies/1/game/state')).status).toBe(405);
    expect(service.sharedTable).not.toHaveBeenCalled();
  });
  it('supports heartbeat, leave, and private history', async () => {
    await request(app(7)).post('/api/lobbies/1/game/state').send({});
    expect(service.sharedTable).toHaveBeenLastCalledWith(1, 7, { kind: 'heartbeat', buyIn: false });
    await request(app(7)).post('/api/lobbies/1/game/state').send({ buyIn: true });
    expect(service.sharedTable).toHaveBeenLastCalledWith(1, 7, { kind: 'heartbeat', buyIn: true });
    await request(app(7)).post('/api/lobbies/1/game/leave').send({ roundId: null });
    expect(service.sharedTable).toHaveBeenLastCalledWith(1, 7, { kind: 'leave', roundId: null });
    const response = await request(app(7)).get('/api/lobbies/1/game/history?userId=99');
    expect(response.body).toEqual([]);
    expect(service.handHistory).toHaveBeenCalledWith(1, 7);
  });
  it('accepts an empty heartbeat without requiring a JSON body parser', async () => {
    const bare = express();
    bare.use((req, _res, next) => { req.session = { userId: 7 } as any; next(); });
    bare.use('/api/lobbies', sharedGameRouter);
    expect((await request(bare).post('/api/lobbies/1/game/state')).status).toBe(200);
    expect(service.sharedTable).toHaveBeenCalledWith(1, 7, { kind: 'heartbeat', buyIn: false });
  });
  it('returns service authorization and stale-round errors', async () => {
    service.sharedTable.mockRejectedValueOnce(new GameError(403, 'Join first'));
    expect((await request(app(7)).post('/api/lobbies/1/game/state').send({})).status).toBe(403);
    service.sharedTable.mockRejectedValueOnce(new GameError(409, 'Hand ended'));
    const response = await request(app(7)).post('/api/lobbies/1/game/action').send({ roundId: 8, action: 'raise' });
    expect(response.status).toBe(409); expect(response.body.error).toBe('Hand ended');
  });
  it('forwards unexpected storage failures to error handling', async () => {
    service.sharedTable.mockRejectedValueOnce(new Error('Storage unavailable'));
    const response = await request(app(7)).post('/api/lobbies/1/game/state').send({});
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Storage unavailable');
  });
  it('validates bot request IDs and preserves the session identity', async () => {
    expect((await request(app(7)).post('/api/lobbies/1/game/bots').send({ requestId: 'x' })).status).toBe(400);
    const response = await request(app(7)).post('/api/lobbies/1/game/bots').send({ requestId: 'bot-request-123', userId: 99 });
    expect(response.status).toBe(200);
    expect(service.sharedTable).toHaveBeenLastCalledWith(1, 7, { kind: 'add-bot', requestId: 'bot-request-123' });
  });
  it('validates host-control targets and takes authorization from the session', async () => {
    for (const [operation, seatId] of [['remove-bot', 'u7'], ['remove-bot', '../bot1'], ['transfer-host', 3]]) {
      expect((await request(app(7)).post(`/api/lobbies/1/game/${operation}`).send({ seatId })).status).toBe(400);
    }
    expect(service.sharedTable).not.toHaveBeenCalled();
    await request(app(7)).post('/api/lobbies/1/game/remove-bot').send({ seatId: 'bot2', userId: 99 }).expect(200);
    expect(service.sharedTable).toHaveBeenLastCalledWith(1, 7, { kind: 'remove-bot', seatId: 'bot2' });
    await request(app(7)).post('/api/lobbies/1/game/transfer-host').send({ seatId: 'u8' }).expect(200);
    expect(service.sharedTable).toHaveBeenLastCalledWith(1, 7, { kind: 'transfer-host', seatId: 'u8' });
  });

});
