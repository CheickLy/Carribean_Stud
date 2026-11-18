import { readJson } from './http';

export type DealtHand = {
  cards: string[];
  rank: string | null;
};

export type TableDeal = {
  player: DealtHand;
  dealer: DealtHand;
  ante: number;
  settled: boolean;
  message?: string;
  net?: number;
};

export type GameState = {
  balance: number;
  round: TableDeal | null;
  reconnectDeadline?: number | null;
  activePath?: string | null;
};

async function request(path: string, body?: object): Promise<GameState> {
  const response = await fetch(`/api/game/${path}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(8000),
    ...(body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.error || 'Could not update game.');
  }

  return data;
}

export const getGame = () => request('state');

export const dealTable = (ante: number) =>
  request('deal', { ante });

export const playAction = (action: 'fold' | 'raise') =>
  request('action', { action });

export const resetGame = () =>
  request('reset', {});

export const heartbeat = (path: string) =>
  request('heartbeat', { path });