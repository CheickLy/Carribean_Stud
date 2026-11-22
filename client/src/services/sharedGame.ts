export type TablePlayer = { id: string; seatNumber: number; name: string; bot: boolean; balance: number; online: boolean; status: string; ante: number; isYou: boolean; inRound: boolean; cardCount: number; net: number | null };
export type SharedTable = {
  name: string; serverNow: number; maxPlayers: number; balance: number; minBet: number; maxBet: number; startingChips: number; botsEnabled: boolean;
  roundId: number | null; roundNumber: number; phase: 'waiting' | 'betting' | 'deciding' | 'completed'; deadline: number | null;
  dealer: { cards: string[]; rank: string | null };
  own: { id: string; ante: number; action: 'raise' | 'fold' | null; cards: { cards: string[]; rank: string | null }; result: { anteNet: number; raiseNet: number; returned: number; net: number; message: string } | null };
  seats: TablePlayer[];
  isHost: boolean; botCount: number; canAddBot: boolean;
};
export type SavedHand = { handId: number; roundId: number; playedAt: string; playerCards: string[]; dealerCards: string[]; ante: number; raise: number; returned: number; net: number; message: string };
export class TableRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
async function request<T>(lobbyId: string, operation: string, body?: object): Promise<T> {
  const response = await fetch(`/api/lobbies/${lobbyId}/game/${operation}`, { credentials: 'include', signal: AbortSignal.timeout(8000), ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new TableRequestError(data.error || 'Could not update the table.', response.status);
  return data;
}
export const syncTable = (id: string) => request<SharedTable>(id, 'state', {});
export const placeAnte = (id: string, roundId: number, ante: number) => request<SharedTable>(id, 'ante', { roundId, ante });
export const decide = (id: string, roundId: number, action: 'fold' | 'raise') => request<SharedTable>(id, 'action', { roundId, action });
export const leaveTable = (id: string, roundId: number | null) => request<SharedTable>(id, 'leave', { roundId });
export const loadHistory = (id: string) => request<SavedHand[]>(id, 'history');
export const addBot = (id: string, requestId: string) => request<SharedTable>(id, 'bots', { requestId });
