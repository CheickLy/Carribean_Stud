import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import SharedGameplay from '../src/pages/SharedGameplay';
import { TableRequestError, type SharedTable } from '../src/services/sharedGame';
const api = vi.hoisted(() => ({ syncTable: vi.fn(), placeAnte: vi.fn(), decide: vi.fn(), leaveTable: vi.fn(), loadHistory: vi.fn(), addBot: vi.fn(), removeBot: vi.fn(), transferHost: vi.fn() }));
vi.mock('../src/services/sharedGame', async original => ({ ...await original<typeof import('../src/services/sharedGame')>(), ...api }));
const NativeRequest = Request;
const base: SharedTable = {
  isHost: true, botCount: 1, canAddBot: true, name: 'Ocean crew', serverNow: Date.now(), maxPlayers: 6, balance: 200, minBet: 5, maxBet: 25, startingChips: 200, botsEnabled: true,
  roundId: 42, roundNumber: 3, phase: 'betting', deadline: Date.now() + 20000,
  dealer: { cards: [], rank: null }, own: { id: 'u1', ante: 0, action: null, cards: { cards: [], rank: null }, result: null },
  seats: [{ id: 'u1', name: 'Alice', bot: false, balance: 200, online: true, status: 'betting', ante: 0, isYou: true }, { id: 'u2', name: 'Bob', bot: false, balance: 200, online: true, status: 'betting', ante: 0, isYou: false }, { id: 'bot1', name: 'Reef Bot 1', bot: true, balance: 195, online: true, status: 'ante placed', ante: 5, isYou: false }].map((seat, index) => ({ ...seat, seatNumber: index + 1, inRound: true, cardCount: 0, net: null })),
};
const deciding: SharedTable = { ...base, phase: 'deciding', balance: 195, dealer: { cards: ['KC'], rank: null }, own: { ...base.own, ante: 5, cards: { cards: ['AS','AH','QD','JC','9S'], rank: 'pair' } }, seats: base.seats.map(seat => ({ ...seat, cardCount: 5, status: seat.bot ? 'folded' : 'deciding' })) };
function show() {
  const router = createMemoryRouter([{ path: '/lobbies/:lobbyId/game', element: <SharedGameplay /> }, { path: '/lobbies', element: <h1>Tables</h1> }], { initialEntries: ['/lobbies/7/game'] });
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
  it('switches table appearance without changing a hand and restores the choice on reload', async () => {
    show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByRole('main').getAttribute('data-theme')).toBe('light');
    expect((screen.getByRole('radio', { name: 'Light' }) as HTMLInputElement).checked).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('main').getAttribute('data-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem('reefroyale.tablePreferences')!).theme).toBe('dark');
    expect(api.placeAnte).not.toHaveBeenCalled(); expect(api.decide).not.toHaveBeenCalled();
    cleanup(); show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    expect(screen.getByRole('main').getAttribute('data-theme')).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect((screen.getByRole('radio', { name: 'Dark' }) as HTMLInputElement).checked).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(screen.getByRole('main').getAttribute('data-theme')).toBe('light');
  });
  it('keeps older saved sound and motion choices when adding an appearance preference', async () => {
    localStorage.setItem('reefroyale.tablePreferences', JSON.stringify({ sound: true, reducedMotion: true, fastDeal: true }));
    show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByRole('main').getAttribute('data-theme')).toBe('light');
    for (const name of ['Sound effects', 'Reduce motion', 'Faster dealing']) expect((screen.getByRole('checkbox', { name }) as HTMLInputElement).checked).toBe(true);
  });
  it('queues an ante behind an in-flight heartbeat instead of losing the click', async () => {
    let finish!: (table: SharedTable) => void;
    const refreshing = new Promise<SharedTable>(resolve => { finish = resolve; });
    api.syncTable.mockResolvedValueOnce(base).mockReturnValueOnce(refreshing);
    show(); await screen.findByRole('button', { name: 'Place ante' });
    fireEvent(window, new Event('online'));
    expect(api.syncTable).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole('button', { name: 'Place ante' }));
    expect(api.placeAnte).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Place ante' }).hasAttribute('disabled')).toBe(true);
    await act(async () => finish(base));
    await waitFor(() => expect(api.placeAnte).toHaveBeenCalledWith('7', 42, 5));
    expect(api.placeAnte).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Ante placed. Waiting for the other players.')).toBeTruthy();
  });
  it('does not drop a raise when a background refresh is running', async () => {
    let finish!: (table: SharedTable) => void;
    api.syncTable.mockResolvedValueOnce(deciding).mockReturnValueOnce(new Promise<SharedTable>(resolve => { finish = resolve; }));
    api.decide.mockResolvedValue({ ...deciding, balance: 185, own: { ...deciding.own, action: 'raise' } });
    show(); await screen.findByRole('button', { name: 'Raise · 10 chips' });
    fireEvent(window, new Event('online'));
    await userEvent.click(screen.getByRole('button', { name: 'Raise · 10 chips' }));
    expect(api.decide).not.toHaveBeenCalled();
    await act(async () => finish(deciding));
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith('7', 42, 'raise'));
    expect(api.decide).toHaveBeenCalledTimes(1);
  });
  it('does not move an old ante intent into a newer hand while waiting for a refresh', async () => {
    let finish!: (table: SharedTable) => void;
    api.syncTable.mockResolvedValueOnce(base).mockReturnValueOnce(new Promise<SharedTable>(resolve => { finish = resolve; }));
    api.placeAnte.mockRejectedValue(new TableRequestError('This hand has ended. Refresh the table.', 409));
    show(); await screen.findByRole('button', { name: 'Place ante' });
    fireEvent(window, new Event('online'));
    await userEvent.click(screen.getByRole('button', { name: 'Place ante' }));
    await act(async () => finish({ ...base, roundId: 43, roundNumber: 4 }));
    expect((await screen.findByRole('alert')).textContent).toContain('This hand has ended.');
    expect(api.placeAnte).toHaveBeenCalledWith('7', 42, 5);
    expect(api.placeAnte).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('timer', { name: 'Round timer' }).textContent).toContain('Hand 4');
  });
  it('waits for a background refresh before leaving without asking the player to retry', async () => {
    let finish!: (table: SharedTable) => void;
    api.syncTable.mockResolvedValueOnce(base).mockReturnValueOnce(new Promise<SharedTable>(resolve => { finish = resolve; }));
    show(); await screen.findByRole('button', { name: 'Place ante' });
    fireEvent(window, new Event('online'));
    await userEvent.click(screen.getByRole('link', { name: '← Leave table' }));
    expect(api.leaveTable).not.toHaveBeenCalled();
    await act(async () => finish(base));
    expect(await screen.findByRole('heading', { name: 'Tables' })).toBeTruthy();
    expect(api.leaveTable).toHaveBeenCalledWith('7', 42);
  });
  it('shows opponents participating with private card backs and the full table roster', async () => {
    api.syncTable.mockResolvedValue(deciding);
    show();
    expect(await screen.findByRole('img', { name: 'Bob has 5 private cards' })).toBeTruthy();
    await userEvent.click(screen.getByText('2 players · 1 bot'));
    const roster = screen.getByRole('list', { name: 'Table roster' });
    expect(within(roster).getByText('Seat 1 · Alice (You)')).toBeTruthy();
    expect(within(roster).getByText('Seat 2 · Bob')).toBeTruthy();
    expect(within(roster).getByText('Seat 3 · Reef Bot 1 (Bot)')).toBeTruthy();
  });
  it('shows other players’ settled net results without showing their card identities', async () => {
    api.syncTable.mockResolvedValue({ ...deciding, phase: 'completed', seats: deciding.seats.map(seat => ({ ...seat, status: 'finished', net: seat.isYou ? 15 : -15 })) });
    show();
    expect((await screen.findAllByText('Hand result · -15 chips')).length).toBe(2);
    expect(screen.queryByRole('img', { name: 'Queen of clubs' })).toBeNull();
  });
  it('keeps the tutorial separate and requires confirmation before leaving an active hand', async () => {
    api.syncTable.mockResolvedValue(deciding);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    show(); await screen.findByRole('button', { name: 'Fold' });
    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    const link = screen.getByRole('link', { name: 'How to play →' });
    expect(link.getAttribute('href')).toBe('/tutorial');
    await userEvent.click(link);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('lose your 5 chip ante'));
    expect(api.leaveTable).not.toHaveBeenCalled();
  });
  it('combines the quieter card screen with shared controls and no empty placeholder seats', async () => {
    api.syncTable.mockResolvedValue(deciding);
    show();
    expect(await screen.findByText('You · Pair of aces')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rules & hands' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Options' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Open seat' })).toBeNull();
    expect(screen.getByRole('timer', { name: 'Round timer' })).toBeTruthy();
  });
  it('lets only the host queue bot removal without disturbing the current hand', async () => {
    api.syncTable.mockResolvedValue(deciding);
    api.removeBot.mockResolvedValue({ ...deciding, seats: deciding.seats.map(seat => ({ ...seat, removalPending: seat.bot })) });
    show(); await screen.findByRole('button', { name: 'Fold' });
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Reef Bot 1' }));
    await screen.findByText('Bot removal saved. Any current hand will finish before its seat is freed.');
    expect(api.removeBot).toHaveBeenCalledWith('7', 'bot1');
    expect(screen.getByRole('button', { name: 'Remove Reef Bot 1' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('img', { name: 'Ace of spades' })).toBeTruthy();
    expect(api.decide).not.toHaveBeenCalled();
    cleanup(); api.syncTable.mockResolvedValue({ ...deciding, isHost: false }); show();
    await screen.findByRole('button', { name: 'Fold' });
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.queryByRole('list', { name: 'Host controls' })).toBeNull();
  });
  it('confirms transferring host controls and hides them once ownership changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    api.transferHost.mockResolvedValue({ ...base, isHost: false, seats: base.seats.map(seat => ({ ...seat, isHost: seat.id === 'u2' })) });
    show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make Bob host' }));
    expect(api.transferHost).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Make Bob host' }));
    await screen.findByText('Hosting transferred to Bob.');
    expect(api.transferHost).toHaveBeenCalledWith('7', 'u2');
    expect(screen.queryByRole('list', { name: 'Host controls' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add bot' })).toBeNull();
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
    expect(within(details).getByText('Payout returned')).toBeTruthy();
    expect(within(details).getByText('20 chips')).toBeTruthy();
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
    await userEvent.click(screen.getByRole('link', { name: '← Leave table' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('lose your 5 chip ante'));
    expect(api.leaveTable).toHaveBeenCalledWith('7', 42);
    expect(await screen.findByRole('heading', { name: 'Tables' })).toBeTruthy();
  });
  it('does not promise to cancel an already locked raise', async () => {
    api.syncTable.mockResolvedValue({ ...deciding, own: { ...deciding.own, action: 'raise' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    show(); await screen.findByText('Decision locked. Waiting for the other players.');
    await userEvent.click(screen.getByRole('link', { name: '← Leave table' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('will not cancel it'));
    expect(api.leaveTable).not.toHaveBeenCalled();
  });
  it('sounds a turn alert once per decision phase and stays silent when muted', async () => {
    const start = vi.fn();
    const disconnect = vi.fn();
    class FakeAudioContext {
      state = 'running'; currentTime = 0;
      resume = async () => {};
      close = async () => {};
      destination = {};
      createOscillator = () => ({ type: '', frequency: { setValueAtTime: vi.fn() }, connect: () => ({ connect: vi.fn() }), start, stop: vi.fn(), disconnect, onended: null });
      createGain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: () => ({ connect: vi.fn() }), disconnect });
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    show(); await screen.findByRole('button', { name: 'Place ante' });
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sound effects' }));
    api.syncTable.mockResolvedValue(deciding);
    fireEvent(window, new Event('online'));
    await screen.findByRole('button', { name: 'Fold' });
    expect(start).toHaveBeenCalledTimes(2); // Deal and the player's decision alert.
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(api.syncTable).toHaveBeenCalledTimes(3));
    expect(start).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sound effects' }));
    api.syncTable.mockResolvedValue({ ...base, roundId: 43 });
    fireEvent(window, new Event('online'));
    await screen.findByRole('button', { name: 'Place ante' });
    expect(start).toHaveBeenCalledTimes(2);
  });
  it('copies the specific lobby invite and offers a selectable fallback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    show(); await screen.findByRole('heading', { name: 'Ocean crew' });
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await screen.findByText('Invite link copied. Share it with another player.');
    expect(writeText).toHaveBeenCalledWith(new URL('/lobbies/7', window.location.origin).href);
    writeText.mockRejectedValueOnce(new Error('Denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await screen.findByText('Copy the lobby link below.');
    expect((screen.getByLabelText('Lobby invite link') as HTMLInputElement).value).toContain('/lobbies/7');
    expect(api.leaveTable).not.toHaveBeenCalled();
  });
  it('restores the server hand after going offline without replaying an action', async () => {
    api.syncTable.mockResolvedValue(deciding);
    show(); await screen.findByRole('button', { name: 'Fold' });
    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/Reconnecting…/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fold' }).hasAttribute('disabled')).toBe(true);
    api.syncTable.mockResolvedValue({ ...deciding, own: { ...deciding.own, action: 'raise' }, balance: 185 });
    fireEvent(window, new Event('online'));
    await screen.findByText('Reconnected. Your seat and current hand are restored from the server.');
    expect(screen.getByText('Decision locked. Waiting for the other players.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fold' })).toBeNull();
    expect(api.decide).not.toHaveBeenCalled();
  });
  it('highlights only a pending player decision and clears it after acting', async () => {
    api.syncTable.mockResolvedValue(deciding);
    api.decide.mockResolvedValue({ ...deciding, own: { ...deciding.own, action: 'fold' } });
    show(); await screen.findByText(/Your turn — raise or fold/);
    await userEvent.click(screen.getByRole('button', { name: 'Fold' }));
    await screen.findByText('Decision locked. Waiting for the other players.');
    expect(screen.queryByText(/Your turn —/)).toBeNull();
  });
  it('recovers polling after a connection failure', async () => {
    api.syncTable.mockRejectedValueOnce(new Error('Network failed'));
    show(); expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ocean crew' })).toBeTruthy());
    expect(screen.queryByText(/Reconnecting…/)).toBeNull();
  });
});
