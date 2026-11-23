export type RecordStats = { hands: number; wins: number; losses: number; ties: number; winRate: number; net: number; raised: number; folded: number };
export type RecordHand = { id: number; sessionId: number; date: string; table: string; ante: number; choice: 'Raise' | 'Fold'; hand: string; result: 'Win' | 'Loss' | 'Tie'; net: number };
export type RecordHistory = { page: number; total: number; pages: number; hands: RecordHand[]; sessions: { id: number; table: string }[] };

async function load<T>(path: string): Promise<T> {
  const response = await fetch(`/api/record/${path}`, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load your game record.');
  return data;
}

export const loadStats = () => load<RecordStats>('stats');
export const loadRecordHistory = (page = 1, from = '', to = '', sessionId = '') => {
  const query = new URLSearchParams({ page: String(page) });
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  if (sessionId) query.set('sessionId', sessionId);
  return load<RecordHistory>(`history?${query}`);
};
