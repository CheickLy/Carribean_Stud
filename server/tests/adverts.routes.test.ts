import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), advert: vi.fn(), createAdvert: vi.fn(), deleteAdvert: vi.fn(), listAdverts: vi.fn(), updateAdvert: vi.fn(), claimClick: vi.fn(), getClickOffer: vi.fn(), completeWatch: vi.fn(), invalidateWatch: vi.fn(), startWatch: vi.fn() }));
vi.mock('../src/models/user.js', () => ({ User: { findByPk: mocks.user } }));
vi.mock('../src/models/advert.js', () => ({ Advert: { findByPk: mocks.advert } }));
vi.mock('../src/modules/adverts/adverts.service.js', () => mocks);
vi.mock('../src/modules/adverts/click.service.js', () => mocks);
vi.mock('../src/modules/adverts/watch.service.js', () => mocks);
import { advertsRouter } from '../src/modules/adverts/adverts.routes.js';
import { clickRouter } from '../src/modules/adverts/click.routes.js';
import { watchRouter } from '../src/modules/adverts/watch.routes.js';
const valid = { title: 'Sponsor offer', creative: 'A sponsor message', destinationUrl: 'https://example.test/', trigger: 'click', chipReward: 25, eligibilityLimit: 1, startsAt: '2026-01-01', endsAt: '2027-01-01', isActive: true };
function app(userId: number | undefined = 7) {
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.session = { userId } as any; next(); });
  app.use('/adverts', advertsRouter); app.use('/click', clickRouter); app.use('/watch', watchRouter);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: error.message }));
  return app;
}
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ role: 'admin' }); mocks.advert.mockResolvedValue(valid); mocks.createAdvert.mockResolvedValue({ advertId: 1 }); mocks.updateAdvert.mockResolvedValue({ advertId: 1 }); mocks.deleteAdvert.mockResolvedValue(true); mocks.listAdverts.mockResolvedValue([]); });
describe('advert administration boundary', () => {
  it.each(['get', 'post', 'patch', 'delete'] as const)('requires an authenticated admin for %s', async method => {
    const path = method === 'get' || method === 'post' ? '/adverts' : '/adverts/1';
    expect((await request(app(0))[method](path).send(valid)).status).toBe(401);
    for (const user of [null, { role: 'player' }, { role: 'admin', isBanned: true }]) {
      mocks.user.mockResolvedValue(user);
      expect((await request(app())[method](path).send(valid)).status).toBe(403);
    }
    expect(mocks.createAdvert).not.toHaveBeenCalled();
  });
  it('lists, creates, partially updates, and deletes advertisements', async () => {
    await request(app()).get('/adverts').expect(200, []);
    await request(app()).post('/adverts').send({ ...valid, title: '  Sponsor offer  ' }).expect(201);
    expect(mocks.createAdvert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sponsor offer', videoUrl: null, startsAt: expect.any(Date) }));
    await request(app()).patch('/adverts/1').send({ isActive: false }).expect(200);
    expect(mocks.updateAdvert).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: false, title: valid.title }));
    const watch = { ...valid, trigger: 'watch', videoUrl: 'https://example.test/video.mp4', requiredWatchSeconds: 30 };
    await request(app()).post('/adverts').send(watch).expect(201);
    await request(app()).patch('/adverts/1').send(watch).expect(200);
    await request(app()).delete('/adverts/1').expect(204);
  });
  it.each([
    { title: null }, { title: 'x' }, { title: 'x'.repeat(151) }, { creative: null }, { creative: '' }, { creative: 'x'.repeat(5001) },
    { destinationUrl: 'invalid' }, { destinationUrl: 'http://example.test' }, { destinationUrl: 'https://user@example.test' }, { destinationUrl: 'https://:pass@example.test' },
    { trigger: 'other' }, { chipReward: 1.5 }, { chipReward: 0 }, { eligibilityLimit: 1.5 }, { eligibilityLimit: 0 }, { isActive: 'yes' },
    { trigger: 'watch', videoUrl: null }, { trigger: 'watch', videoUrl: ' ' }, { trigger: 'watch', videoUrl: 'video', requiredWatchSeconds: 1.5 }, { trigger: 'watch', videoUrl: 'video', requiredWatchSeconds: 0 },
    { startsAt: '' }, { endsAt: '' }, { startsAt: 'bad' }, { endsAt: 'bad' }, { endsAt: valid.startsAt },
  ])('rejects invalid create and update settings: %j', async change => {
    await request(app()).post('/adverts').send({ ...valid, ...change }).expect(400);
    await request(app()).patch('/adverts/1').send(change).expect(400);
    expect(mocks.createAdvert).not.toHaveBeenCalled(); expect(mocks.updateAdvert).not.toHaveBeenCalled();
  });
  it.each(['patch', 'delete'] as const)('validates %s IDs and missing records', async method => {
    await request(app())[method]('/adverts/nope').send({}).expect(400);
    await request(app())[method]('/adverts/0').send({}).expect(400);
    mocks.advert.mockResolvedValue(null); mocks.deleteAdvert.mockResolvedValue(false);
    await request(app())[method]('/adverts/99').send({}).expect(404);
  });
  it.each(['get', 'post', 'patch', 'delete'] as const)('forwards storage failures for %s', async method => {
    mocks.user.mockRejectedValue(new Error('Storage unavailable'));
    await request(app())[method](method === 'get' || method === 'post' ? '/adverts' : '/adverts/1').send(valid).expect(500);
  });
});
describe('player advert boundary', () => {
  it('requires session identity on click and watch routes', async () => {
    await request(app(0)).get('/click/offer').expect(401);
    await request(app(0)).post('/watch/start').expect(401);
  });
  it('returns eligible offers, claims, and missing or failed offers', async () => {
    await request(app()).get('/click/offer').expect(404);
    mocks.getClickOffer.mockResolvedValue({ advert: valid });
    await request(app()).get('/click/offer').expect(200);
    mocks.claimClick.mockResolvedValue({ reward: 25 });
    await request(app()).post('/click/1/claim').send({ userId: 99 }).expect(200);
    expect(mocks.claimClick).toHaveBeenCalledWith(7, 1);
    for (const id of ['bad', '0']) await request(app()).post(`/click/${id}/claim`).expect(400);
    mocks.claimClick.mockRejectedValue(new Error('Unavailable'));
    await request(app()).post('/click/1/claim').expect(400);
    mocks.getClickOffer.mockRejectedValue(new Error('Storage'));
    await request(app()).get('/click/offer').expect(500);
  });
  it('validates watch completion, keeps identity authoritative, and supports exit', async () => {
    await request(app()).post('/watch/start').expect(404);
    mocks.startWatch.mockResolvedValue({ sessionId: 'watch1' });
    await request(app()).post('/watch/start').expect(201);
    for (const sessionId of [null, '']) await request(app()).post('/watch/complete').send({ sessionId }).expect(400);
    mocks.completeWatch.mockResolvedValue({ reward: 25 });
    await request(app()).post('/watch/complete').send({ sessionId: 'watch1', userId: 99, videoCompleted: true }).expect(200);
    expect(mocks.completeWatch).toHaveBeenCalledWith(7, 'watch1', true);
    await request(app()).post('/watch/complete').send({ sessionId: 'watch1', videoCompleted: 'true' }).expect(200);
    expect(mocks.completeWatch).toHaveBeenLastCalledWith(7, 'watch1', false);
    await request(app()).post('/watch/exit').send({}).expect(204);
    expect(mocks.invalidateWatch).not.toHaveBeenCalled();
    await request(app()).post('/watch/exit').send({ sessionId: 'watch1' }).expect(204);
    expect(mocks.invalidateWatch).toHaveBeenCalledWith(7, 'watch1');
    mocks.completeWatch.mockRejectedValue(new Error('Too early'));
    await request(app()).post('/watch/complete').send({ sessionId: 'watch1' }).expect(400);
    mocks.startWatch.mockRejectedValue(new Error('Storage')); mocks.invalidateWatch.mockRejectedValue(new Error('Storage'));
    await request(app()).post('/watch/start').expect(500);
    await request(app()).post('/watch/exit').send({ sessionId: 'watch1' }).expect(500);
  });
});
