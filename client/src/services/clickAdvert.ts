import { readJson } from './http';

export type ClickAdvert = { advertId: number; title: string; creative: string; destinationUrl: string; chipReward: number };
export type ClickOffer = { advert: ClickAdvert; claimed: boolean };

export async function getClickAdvert(): Promise<ClickOffer | null> {
  const response = await fetch('/api/adverts/click/offer', { credentials: 'include' });
  if (response.status === 404 || response.status === 401) return null;
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Could not load sponsored advert');
  return data as ClickOffer;
}

export async function claimClickAdvert(advertId: number) {
  const response = await fetch(`/api/adverts/click/${advertId}/claim`, { method: 'POST', credentials: 'include' });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Could not claim advert reward');
  return data as { destinationUrl: string; reward: number; balance: string; claimed: boolean };
}
