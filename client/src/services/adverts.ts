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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Could not create advert');
  }

  return data;
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

  return response.json();
}