import { readJson } from './http';

export type CreateAdvertInput = {
  title: string;
  creative: string;
  destinationUrl: string;
  trigger: 'watch' | 'click';
  chipReward: number;
  eligibilityLimit: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export async function createAdvert(input: CreateAdvertInput) {
  const response = await fetch('/api/admin/adverts', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.error || 'Could not create advert');
  }

  return data;
}

export async function updateAdvert(advertId: number, input: CreateAdvertInput) {
  const response = await fetch(`/api/admin/adverts/${advertId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Could not update advert');
  return data as Advert;
}

export async function deleteAdvert(advertId: number) {
  const response = await fetch(`/api/admin/adverts/${advertId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await readJson(response);
    throw new Error(data.error || 'Could not delete advert');
  }
}

export type Advert = CreateAdvertInput & {
  advertId: number;
  createdAt: string;
};

export async function listAdverts(): Promise<Advert[]> {
  const response = await fetch('/api/admin/adverts', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Could not load adverts (${response.status})`);
  }

  return readJson(response);
}

