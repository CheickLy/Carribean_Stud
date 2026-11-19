import { Op } from 'sequelize';
import { Advert } from '../../models/advert.js';
import { AdvertClickClaim } from '../../models/advertClickClaim.js';
import { User } from '../../models/user.js';
import { sequelize } from '../../db/sequelize.js';

function eligibleWhere(now: Date) {
  return { isActive: true, trigger: 'click' as const, startsAt: { [Op.lte]: now }, endsAt: { [Op.gt]: now } };
}

export async function getClickOffer(userId: number) {
  const user = await User.findByPk(userId);
  if (!user || user.isBanned) throw new Error('Player account is not eligible');
  const adverts = await Advert.findAll({ where: eligibleWhere(new Date()), order: sequelize.random() });
  if (!adverts.length) return null;
  const claims = await AdvertClickClaim.findAll({ where: { userId, advertId: { [Op.in]: adverts.map(advert => advert.advertId) } } });
  const claimedIds = new Set(claims.map(claim => claim.advertId));
  const advert = adverts.find(candidate => !claimedIds.has(candidate.advertId)) ?? adverts[0];
  return { advert: advert.get({ plain: true }), claimed: claimedIds.has(advert.advertId) };
}

export async function claimClick(userId: number, advertId: number) {
  return sequelize.transaction(async transaction => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || user.isBanned) throw new Error('Player account is not eligible');
    const advert = await Advert.findOne({ where: { advertId, ...eligibleWhere(new Date()) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!advert) throw new Error('Advert is no longer available');
    const existing = await AdvertClickClaim.findOne({ where: { userId, advertId }, transaction });
    if (existing) return { destinationUrl: advert.destinationUrl, reward: 0, balance: user.balance, claimed: true };
    await AdvertClickClaim.create({ userId, advertId, reward: advert.chipReward }, { transaction });
    await user.increment('balance', { by: advert.chipReward, transaction });
    await user.reload({ transaction });
    return { destinationUrl: advert.destinationUrl, reward: advert.chipReward, balance: user.balance, claimed: false };
  });
}
