import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import SharedGameplay from '../src/pages/SharedGameplay';
import type { SharedTable } from '../src/services/sharedGame';
const api = vi.hoisted(() => ({ syncTable: vi.fn(), placeAnte: vi.fn(), decide: vi.fn(), leaveTable: vi.fn(), loadHistory: vi.fn(), addBot: vi.fn() }));
vi.mock('../src/services/sharedGame', async original => ({ ...await original<typeof import('../src/services/sharedGame')>(), ...api }));
const NativeRequest = Request;
const base: SharedTable = {
  isHost: true, botCount: 1, canAddBot: true, name: 'Ocean crew', serverNow: Date.now(), maxPlayers: 6, balance: 200, minBet: 5, maxBet: 25, startingChips: 200, botsEnabled: true,
  roundId: 42, roundNumber: 3, phase: 'betting', deadline: Date.now() + 20000,
  dealer: { cards: [], rank: null }, own: { id: 'u1', ante: 0, action: null, cards: { cards: [], rank: null }, result: null },
  seats: [{ id: 'u1', name: 'Alice', bot: false, balance: 200, online: true, status: 'betting', ante: 0, isYou: true }, { id: 'u2', name: 'Bob', bot: false, balance: 200, online: true, status: 'betting', ante: 0, isYou: false }, { id: 'bot1', name: 'Reef Bot 1', bot: true, balance: 195, online: true, status: 'ante placed', ante: 5, isYou: false }],
};
const deciding: SharedTable = { ...base, phase: 'deciding', balance: 195, dealer: { cards: ['KC'], rank: null }, own: { ...base.own, ante: 5, cards: { cards: ['AS','AH','QD','JC','9S'], rank: 'pair' } }, seats: base.seats.map(seat => ({ ...seat, status: seat.isYou ? 'deciding' : seat.status })) };
function show() {
  const router = createMemoryRouter([{ path: '/lobbies/:lobbyId/game', element: <SharedGameplay /> }, { path: '/lobbies/7', element: <h1>Lobby room</h1> }], { initialEntries: ['/lobbies/7/game'] });
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('Request', class extends NativeRequest { constructor(input: RequestInfo | URL, init?: RequestInit) { super(input, { ...init, signal: undefined }); } });
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
  api.syncTable.mockResolvedValue({ ...base, serverNow: Date.now(), deadline: Date.now() + 20000 });
  api.placeAnte.mockResolvedValue({ ...base, balance: 195, own: { ...base.own, ante: 5 }, seats: base.seats.map(seat => ({ ...seat, status: seat.isYou ? 'ante placed' : seat.status })) });
  api.leaveTable.mockResolvedValue(base);
  api.loadHistory.mockResolvedValue([]);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('shared table screen', () => {
  it('combines the quieter card screen with shared controls and no empty placeholder seats', async () => {
    api.syncTable.mockResolvedValue(deciding);
    show();
    expect(await screen.findByText('You · Pair of aces')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rules & hands' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Options' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Open seat' })).toBeNull();
    expect(screen.getByRole('timer', { name: 'Round timer' })).toBeTruthy();
  });
  it('lets the host add a bot from Options and queues it for the next hand', async () => {
    api.addBot.mockResolvedValue({ ...base, botCount: 2 });
    show();
    await screen.findByRole('heading', { name: 'Ocean crew' });
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add bot' }));
    expect(api.addBot).toHaveBeenCalledWith('7', expect.any(String));
    expect(await screen.findByText('Bot added. It will join the next hand.')).toBeTruthy();
    expect(api.placeAnte).not.toHaveBeenCalled();
  });
  it('reuses the same bot request after a lost response', async () => {
    api.addBot.mockRejectedValueOnce(new Error('Network failed')).mockResolvedValueOnce({ ...base, botCount: 2 });
    show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add bot' }));
    await screen.findByRole('alert');
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add bot' }).hasAttribute('disabled')).toBe(false));
    await userEvent.click(screen.getByRole('button', { name: 'Add bot' }));
    expect(api.addBot.mock.calls[0][1]).toBe(api.addBot.mock.calls[1][1]);
  });
  it.each([
    [{ botsEnabled: false }, 'Bots are disabled for this lobby.'],
    [{ isHost: false }, 'Only the host can add bots.'],
    [{ canAddBot: false }, 'All seats are reserved. No room for another bot.'],
  ])('explains when adding a bot is unavailable: %j', async (change, message) => {
    api.syncTable.mockResolvedValue({ ...base, ...change });
    show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByText(message)).toBeTruthy();
    const button = screen.queryByRole('button', { name: 'Add bot' });
    expect(!button || button.hasAttribute('disabled')).toBe(true);
  });
  it('uses lobby limits, one ante action, table bankroll and real opponent states', async () => {
    show();
    expect(await screen.findByRole('heading', { name: 'Ocean crew' })).toBeTruthy();
    const input = screen.getByRole('spinbutton', { name: 'Ante chips' });
    expect(input.getAttribute('min')).toBe('5'); expect(input.getAttribute('max')).toBe('25');
    expect(screen.getByText('200 table chips')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Set ante to 50 chips' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Bob, betting' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Reef Bot 1, ante placed' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Place ante' }));
    expect(api.placeAnte).toHaveBeenCalledWith('7', 42, 5);
    expect(await screen.findByText('Ante placed. Waiting for the other players.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Place ante' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Deal/ })).toBeNull();
  });
  it('shows only your cards and dealer up-card while decisions are pending', async () => {
    api.syncTable.mockResolvedValue(deciding);
    api.decide.mockResolvedValue({ ...deciding, balance: 185, own: { ...deciding.own, action: 'raise' } });
    show();
    await screen.findByRole('button', { name: 'Raise · 10 chips' });
    expect(screen.getAllByRole('img', { name: 'Hidden dealer card' })).toHaveLength(4);
    expect(screen.getByRole('img', { name: 'Ace of spades' })).toBeTruthy();
    expect(screen.getByRole('timer', { name: 'Round timer' }).textContent).toContain('Decide');
    await userEvent.click(screen.getByRole('button', { name: 'Raise · 10 chips' }));
    expect(api.decide).toHaveBeenCalledWith('7', 42, 'raise');
    expect(await screen.findByText('Decision locked. Waiting for the other players.')).toBeTruthy();
  });
  it('shows authoritative settlement, breakdown, and saved history', async () => {
    api.syncTable.mockResolvedValue({ ...deciding, phase: 'completed', balance: 205, dealer: { cards: ['2C','3D','4H','8S','7C'], rank: 'high card' }, own: { ...deciding.own, action: 'raise', result: { anteNet: 5, raiseNet: 0, returned: 20, net: 5, message: 'Dealer does not qualify. Ante wins; raise returned.' } } });
    api.loadHistory.mockResolvedValue([{ handId: 1, roundId: 42, playerCards: ['AS','AH','QD','JC','9S'], dealerCards: ['2C','3D','4H','8S','7C'], ante: 5, raise: 10, returned: 20, net: 5, message: 'Dealer does not qualify.' }]);
    show();
    await screen.findByText('Details');
    const details = screen.getByLabelText('Payout breakdown');
    expect(details.hasAttribute('open')).toBe(false);
    await userEvent.click(screen.getByText('Details'));
    expect(details.hasAttribute('open')).toBe(true);
    expect(screen.getByText('Next hand starts automatically')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText('Hand 42 · +5 chips')).toBeTruthy();
    expect(api.loadHistory).toHaveBeenCalledWith('7');
  });
  it('reserves a mid-hand arrival and disables decisions for them', async () => {
    api.syncTable.mockResolvedValue({ ...base, phase: 'deciding', seats: base.seats.map(seat => ({ ...seat, status: seat.isYou ? 'waiting for next hand' : 'deciding' })) });
    show();
    expect(await screen.findByText('Your seat is reserved for the next hand.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fold' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Place ante' })).toBeNull();
  });
  it('confirms leaving and waits for the server fold before going to the lobby', async () => {
    api.syncTable.mockResolvedValue(deciding);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    show(); await screen.findByRole('button', { name: 'Fold' });
    await userEvent.click(screen.getByRole('link', { name: '← Back to lobby' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('lose your 5 chip ante'));
    expect(api.leaveTable).toHaveBeenCalledWith('7', 42);
    expect(await screen.findByRole('heading', { name: 'Lobby room' })).toBeTruthy();
  });
  it('does not promise to cancel an already locked raise', async () => {
    api.syncTable.mockResolvedValue({ ...deciding, own: { ...deciding.own, action: 'raise' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    show(); await screen.findByText('Decision locked. Waiting for the other players.');
    await userEvent.click(screen.getByRole('link', { name: '← Back to lobby' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('will not cancel it'));
    expect(api.leaveTable).not.toHaveBeenCalled();
  });
  it('recovers polling after a connection failure', async () => {
    api.syncTable.mockRejectedValueOnce(new Error('Network failed'));
    show(); expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ocean crew' })).toBeTruthy());
    expect(screen.queryByText(/Reconnecting…/)).toBeNull();
  });
});
