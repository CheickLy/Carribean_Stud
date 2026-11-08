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

export async function listAdverts() {
  return Advert.findAll({
    order: [['createdAt', 'DESC']],
  });
}