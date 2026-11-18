import { Advert } from '../../models/advert.js';

export type CreateAdvertInput = {
  title: string;
  creative: string;
  destinationUrl: string;
  trigger: 'watch' | 'click';
  chipReward: number;
  eligibilityLimit: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};

export async function createAdvert(input: CreateAdvertInput) {
  return Advert.create(input);
}

export async function updateAdvert(advertId: number, input: Partial<CreateAdvertInput>) {
  const advert = await Advert.findByPk(advertId);
  if (!advert) return null;
  await advert.update(input);
  return advert;
}

export async function listAdverts() {
  return Advert.findAll({
    order: [['createdAt', 'DESC']],
  });
}
