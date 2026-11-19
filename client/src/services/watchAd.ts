import { readJson } from './http';
import type { Advert } from './adverts';

export type WatchAdvert = Advert & { videoUrl: string; requiredWatchSeconds: number };
export type WatchSession = { sessionId: string; advert: WatchAdvert };

export async function startWatchAdvert(): Promise<WatchSession | null> {
  const response = await fetch('/api/adverts/watch/start', { method: 'POST', credentials: 'include' });
  if (response.status === 404) return null;
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Could not start advertisement');
  return data as WatchSession;
}

export async function completeWatchAdvert(sessionId: string, videoCompleted: boolean) {
  const response = await fetch('/api/adverts/watch/complete', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, videoCompleted }) });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.error || 'Could not claim advertisement reward');
  return data as { reward: number; balance: string };
}

export async function exitWatchAdvert(sessionId: string) {
  await fetch('/api/adverts/watch/exit', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
}
