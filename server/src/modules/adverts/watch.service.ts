import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { Advert } from '../../models/advert.js';
import { AdvertRewardClaim } from '../../models/advertRewardClaim.js';
import { AdvertWatchSession } from '../../models/advertWatchSession.js';
import { User } from '../../models/user.js';
import { sequelize } from '../../db/sequelize.js';

function activeWatchWhere(now: Date) {
  return { isActive: true, trigger: 'watch' as const, videoUrl: { [Op.ne]: null }, requiredWatchSeconds: { [Op.gt]: 0 }, startsAt: { [Op.lte]: now }, endsAt: { [Op.gt]: now } };
}

export async function startWatch(userId: number) {
  const user = await User.findByPk(userId);
  if (!user || user.isBanned || user.isGuest) throw new Error('A registered player account is required');
  const now = new Date();
  const adverts = await Advert.findAll({ where: activeWatchWhere(now), order: sequelize.random() });
  for (const advert of adverts) {
    const claimed = await AdvertRewardClaim.count({ where: { userId, advertId: advert.advertId } });
    if (claimed < (advert.eligibilityLimit ?? 0)) {
      const sessionId = crypto.randomUUID();
      const duration = advert.requiredWatchSeconds!;
      const session = await AdvertWatchSession.create({ sessionId, userId, advertId: advert.advertId, startedAt: now, expiresAt: new Date(now.getTime() + Math.max(duration * 4, 300) * 1000) });
      return { sessionId: session.sessionId, advert: advert.get({ plain: true }) };
    }
  }
  return null;
}

export async function completeWatch(userId: number, sessionId: string, videoCompleted: boolean) {
  return sequelize.transaction(async transaction => {
    const session = await AdvertWatchSession.findOne({ where: { sessionId, userId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!session || session.invalidatedAt || session.completedAt) throw new Error('Watch session is no longer valid');
    const advert = await Advert.findByPk(session.advertId, { transaction, lock: transaction.LOCK.UPDATE });
    const now = new Date();
    if (!advert || !advert.isActive || advert.trigger !== 'watch' || !advert.videoUrl || !advert.requiredWatchSeconds || now > session.expiresAt || now < advert.startsAt || now >= advert.endsAt) throw new Error('Advert session is no longer eligible');
    if (!videoCompleted || now.getTime() - session.startedAt.getTime() < advert.requiredWatchSeconds * 1000) throw new Error('Keep watching until the advert is complete');
    const player = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!player) throw new Error('Player account not found');
    const claimed = await AdvertRewardClaim.count({ where: { userId, advertId: advert.advertId }, transaction });
    if (claimed >= advert.eligibilityLimit) throw new Error('Advert reward limit reached');
    await AdvertRewardClaim.create({ sessionId, userId, advertId: advert.advertId, reward: advert.chipReward }, { transaction });
    await session.update({ completedAt: now }, { transaction });
    await player.increment('balance', { by: advert.chipReward, transaction });
    await player.reload({ transaction });
    return { reward: advert.chipReward, balance: player.balance };
  });
}

export async function invalidateWatch(userId: number, sessionId: string) {
  await AdvertWatchSession.update({ invalidatedAt: new Date() }, { where: { sessionId, userId, completedAt: null, invalidatedAt: null } });
}
