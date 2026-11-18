export type DealtHand = { cards: string[]; rank: string | null };
export type TableDeal = {
  player: DealtHand; dealer: DealtHand; ante: number; settled: boolean; message?: string; net?: number;
};
export type GameState = { balance: number; round: TableDeal | null };
async function request(path: string, body?: object): Promise<GameState> {
  const response = await fetch(`http://localhost:3001/api/game/${path}`, {
    credentials: 'include',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not update game.');
  return data;
}
export const getGame = () => request('state');
export const dealTable = (ante: number) => request('deal', { ante });
export const playAction = (action: 'fold' | 'raise') => request('action', { action });
export const resetGame = () => request('reset', {});
