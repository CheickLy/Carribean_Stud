import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ user: vi.fn(), adverts: vi.fn(), advert: vi.fn(), offer: vi.fn(), create: vi.fn(), clickClaims: vi.fn(), clickClaim: vi.fn(), createClick: vi.fn(), rewardCount: vi.fn(), rewardCreate: vi.fn(), watchCreate: vi.fn(), watchFind: vi.fn(), watchUpdate: vi.fn(), transaction: vi.fn(), random: vi.fn() }));
vi.mock('../src/db/sequelize.js', () => ({ sequelize: { transaction: db.transaction, random: db.random } }));
vi.mock('../src/models/user.js', () => ({ User: { findByPk: db.user } }));
vi.mock('../src/models/advert.js', () => ({ Advert: { findAll: db.adverts, findByPk: db.advert, findOne: db.offer, create: db.create } }));
vi.mock('../src/models/advertClickClaim.js', () => ({ AdvertClickClaim: { findAll: db.clickClaims, findOne: db.clickClaim, create: db.createClick } }));
vi.mock('../src/models/advertRewardClaim.js', () => ({ AdvertRewardClaim: { count: db.rewardCount, create: db.rewardCreate } }));
vi.mock('../src/models/advertWatchSession.js', () => ({ AdvertWatchSession: { create: db.watchCreate, findOne: db.watchFind, update: db.watchUpdate } }));
import { claimClick, getClickOffer } from '../src/modules/adverts/click.service.js';
import { startWatch, completeWatch, invalidateWatch } from '../src/modules/adverts/watch.service.js';
import { createAdvert, updateAdvert, deleteAdvert, listAdverts } from '../src/modules/adverts/adverts.service.js';
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
let user: any, advert: any, watch: any;
beforeEach(() => {
  vi.resetAllMocks();
  user = { balance: '525.00', increment: vi.fn(), reload: vi.fn() };
  advert = { advertId: 1, isActive: true, trigger: 'watch', videoUrl: '/video.mp4', requiredWatchSeconds: 30, chipReward: 25, eligibilityLimit: 1, destinationUrl: 'https://example.test', startsAt: new Date(Date.now() - 100000), endsAt: new Date(Date.now() + 100000), get: vi.fn(() => ({ advertId: 1 })), update: vi.fn(), destroy: vi.fn() };
  watch = { sessionId: 'session1', advertId: 1, startedAt: new Date(Date.now() - 31000), expiresAt: new Date(Date.now() + 100000), update: vi.fn() };
  db.transaction.mockImplementation(callback => callback(transaction)); db.user.mockResolvedValue(user); db.adverts.mockResolvedValue([advert]); db.advert.mockResolvedValue(advert); db.offer.mockResolvedValue(advert); db.watchFind.mockResolvedValue(watch); db.watchCreate.mockImplementation(async input => input); db.rewardCount.mockResolvedValue(0); db.clickClaims.mockResolvedValue([]); db.clickClaim.mockResolvedValue(null);
});
describe('advert reward integrity', () => {
  it.each([null, { isBanned: true }])('rejects ineligible click accounts %j', async account => {
    db.user.mockResolvedValue(account);
    await expect(getClickOffer(7)).rejects.toThrow('not eligible');
    await expect(claimClick(7, 1)).rejects.toThrow('not eligible');
    expect(db.createClick).not.toHaveBeenCalled();
  });
  it('prefers an unclaimed click offer and marks a repeat offer as claimed', async () => {
    const second = { ...advert, advertId: 2, get: () => ({ advertId: 2 }) };
    db.adverts.mockResolvedValue([advert, second]); db.clickClaims.mockResolvedValue([{ advertId: 1 }]);
    expect(await getClickOffer(7)).toEqual({ advert: { advertId: 2 }, claimed: false });
    db.clickClaims.mockResolvedValue([{ advertId: 1 }, { advertId: 2 }]);
    expect(await getClickOffer(7)).toEqual({ advert: { advertId: 1 }, claimed: true });
    db.adverts.mockResolvedValue([]); expect(await getClickOffer(7)).toBeNull();
  });
  it('locks the player and campaign, pays once, and returns no reward for a retry', async () => {
    expect(await claimClick(7, 1)).toEqual({ destinationUrl: advert.destinationUrl, reward: 25, balance: '525.00', claimed: false });
    expect(db.user).toHaveBeenCalledWith(7, { transaction, lock: 'UPDATE' });
    expect(db.createClick).toHaveBeenCalledWith({ userId: 7, advertId: 1, reward: 25 }, { transaction });
    expect(user.increment).toHaveBeenCalledOnce();
    db.clickClaim.mockResolvedValue({});
    expect((await claimClick(7, 1)).reward).toBe(0);
    expect(user.increment).toHaveBeenCalledOnce();
    db.offer.mockResolvedValue(null); await expect(claimClick(7, 1)).rejects.toThrow('no longer available');
  });
  it.each([null, { isBanned: true }, { isGuest: true }])('requires a registered eligible account to start watching: %j', async account => {
    db.user.mockResolvedValue(account); await expect(startWatch(7)).rejects.toThrow('registered');
    expect(db.watchCreate).not.toHaveBeenCalled();
  });
  it('starts an eligible timed watch session and skips exhausted offers', async () => {
    const result = await startWatch(7);
    expect(result?.sessionId).toEqual(expect.any(String));
    expect(db.watchCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, advertId: 1, expiresAt: expect.any(Date) }));
    db.rewardCount.mockResolvedValue(1); expect(await startWatch(7)).toBeNull();
    db.adverts.mockResolvedValue([]); expect(await startWatch(7)).toBeNull();
  });
  it.each([null, { invalidatedAt: new Date() }, { completedAt: new Date() }])('rejects a missing, abandoned, or replayed watch session: %j', async session => {
    db.watchFind.mockResolvedValue(session); await expect(completeWatch(7, 'session1', true)).rejects.toThrow('no longer valid');
    expect(db.rewardCreate).not.toHaveBeenCalled();
  });
  it.each([
    { isActive: false }, { trigger: 'click' }, { videoUrl: null }, { requiredWatchSeconds: 0 },
    { startsAt: new Date(Date.now() + 100000) }, { endsAt: new Date(Date.now() - 100000) },
  ])('rejects changed or expired campaigns without crediting: %j', async change => {
    Object.assign(advert, change); await expect(completeWatch(7, 'session1', true)).rejects.toThrow('no longer eligible');
    expect(user.increment).not.toHaveBeenCalled();
  });
  it('rejects a deleted campaign, expired session, early completion, and exhausted reward', async () => {
    db.advert.mockResolvedValueOnce(null); await expect(completeWatch(7, 'session1', true)).rejects.toThrow('no longer eligible');
    watch.expiresAt = new Date(Date.now() - 1); await expect(completeWatch(7, 'session1', true)).rejects.toThrow('no longer eligible');
    watch.expiresAt = new Date(Date.now() + 100000);
    await expect(completeWatch(7, 'session1', false)).rejects.toThrow('Keep watching');
    watch.startedAt = new Date(); await expect(completeWatch(7, 'session1', true)).rejects.toThrow('Keep watching');
    watch.startedAt = new Date(Date.now() - 31000); db.user.mockResolvedValueOnce(null);
    await expect(completeWatch(7, 'session1', true)).rejects.toThrow('not found');
    db.rewardCount.mockResolvedValue(1); await expect(completeWatch(7, 'session1', true)).rejects.toThrow('limit reached');
    expect(db.rewardCreate).not.toHaveBeenCalled();
  });
  it('settles a completed watch atomically and binds abandoned sessions to their owner', async () => {
    expect(await completeWatch(7, 'session1', true)).toEqual({ reward: 25, balance: '525.00' });
    expect(db.watchFind).toHaveBeenCalledWith({ where: { sessionId: 'session1', userId: 7 }, transaction, lock: 'UPDATE' });
    expect(watch.update).toHaveBeenCalledWith({ completedAt: expect.any(Date) }, { transaction });
    expect(user.increment).toHaveBeenCalledWith('balance', { by: 25, transaction });
    await invalidateWatch(7, 'session1');
    expect(db.watchUpdate).toHaveBeenCalledWith({ invalidatedAt: expect.any(Date) }, { where: { sessionId: 'session1', userId: 7, completedAt: null, invalidatedAt: null } });
  });
  it('passes advert storage changes through and handles missing campaigns', async () => {
    await listAdverts(); expect(db.adverts).toHaveBeenCalledWith({ order: [['createdAt', 'DESC']] });
    const input = { title: 'New campaign' }; await createAdvert(input as any); expect(db.create).toHaveBeenCalledWith(input);
    expect(await updateAdvert(1, input)).toBe(advert); expect(advert.update).toHaveBeenCalledWith(input);
    expect(await deleteAdvert(1)).toBe(true); expect(advert.destroy).toHaveBeenCalledOnce();
    db.advert.mockResolvedValue(null); expect(await updateAdvert(1, input)).toBeNull(); expect(await deleteAdvert(1)).toBe(false);
  });
});
