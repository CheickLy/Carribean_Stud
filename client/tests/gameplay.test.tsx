import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
function show() {
  const router = createMemoryRouter([{ path: '/lobbies/:lobbyId/game', element: <Gameplay /> }, { path: '/lobbies/1', element: <h1>Lobby room</h1> }, { path: '/lobbies', element: <h1>Tables</h1> }], { initialEntries: ['/lobbies/1/game'] });
  render(<RouterProvider router={router} />);
  return router;
}
import Gameplay from '../src/pages/Gameplay';
const NativeRequest = globalThis.Request;
const game = vi.hoisted(() => ({ getGame: vi.fn(), heartbeat: vi.fn(), dealTable: vi.fn(), playAction: vi.fn(), resetGame: vi.fn() }));
vi.mock('../src/services/game', () => game);
const round = {
  dealer: { cards: ['2C'], rank: null },
  player: { cards: ['AS', 'KH', 'QD', 'JC', '10S'], rank: 'straight' },
  ante: 10, settled: false,
};
describe('player versus dealer', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), clear: () => storage.clear() });
    // jsdom's AbortSignal cannot be passed to Node's native Request.
    vi.stubGlobal('Request', class extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) { super(input, { ...init, signal: undefined }); }
    });
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'Ocean room' }) }));
    game.heartbeat.mockImplementation(() => game.getGame());
    game.getGame.mockResolvedValue({ balance: 2450, round: null });
    game.dealTable.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockResolvedValue({ balance: 2440, round: { ...round, settled: true,
      dealer: { cards: ['2C','3D','4H','5S','7C'], rank: 'high card' }, message: 'You folded.', net: -10 } });
  });
  it('loads the table name and returns to its specific lobby', async () => {
    show();
    expect(await screen.findByRole('heading', { name: 'Ocean room' })).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('/api/lobbies/1', expect.objectContaining({ credentials: 'include' }));
    const link = screen.getByRole('link', { name: 'Back to lobby' });
    expect(link.getAttribute('href')).toBe('/lobbies/1');
    await userEvent.click(link);
    expect(await screen.findByRole('heading', { name: 'Lobby room' })).toBeTruthy();
  });
  it('saves sound and animation preferences on this device', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    for (const name of ['Sound effects', 'Reduce motion', 'Faster dealing']) {
      const input = screen.getByRole('checkbox', { name }) as HTMLInputElement;
      expect(input.checked).toBe(false);
      await userEvent.click(input);
      expect(input.checked).toBe(true);
    }
    expect(JSON.parse(localStorage.getItem('reefroyale.tablePreferences')!)).toEqual({ sound: true, reducedMotion: true, fastDeal: true });
    expect(screen.getByRole('main').className).toContain('gameplay-reduced-motion');
    expect(screen.getByRole('main').className).toContain('gameplay-fast-deal');
    await userEvent.click(screen.getByRole('button', { name: 'Close table preferences' }));
    expect(screen.queryByRole('region', { name: 'Table preferences' })).toBeNull();
  });
  it('restores saved preferences after a reload', async () => {
    localStorage.setItem('reefroyale.tablePreferences', JSON.stringify({ sound: true, reducedMotion: true, fastDeal: true }));
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect((screen.getByRole('checkbox', { name: 'Sound effects' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Reduce motion' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Faster dealing' }) as HTMLInputElement).checked).toBe(true);
  });
  it('keeps the active hand when leaving is cancelled', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = show();
    await screen.findByRole('button', { name: 'Fold' });
    await userEvent.click(screen.getByRole('link', { name: 'Back to lobby' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('lose your 10 point ante'));
    expect(router.state.location.pathname).toBe('/lobbies/1/game');
    expect(game.playAction).not.toHaveBeenCalled();
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });
  it('folds before navigating away after confirmation', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    show();
    await screen.findByRole('button', { name: 'Fold' });
    await userEvent.click(screen.getByRole('link', { name: 'Back to lobby' }));
    expect(await screen.findByRole('heading', { name: 'Lobby room' })).toBeTruthy();
    expect(game.playAction).toHaveBeenCalledTimes(1);
    expect(game.playAction).toHaveBeenCalledWith('fold');
  });
  it('stays at the table if the fold cannot be confirmed', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockRejectedValue(new Error('Could not save fold'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const router = show();
    await screen.findByRole('button', { name: 'Fold' });
    await userEvent.click(screen.getByRole('link', { name: 'Back to lobby' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Could not save fold');
    expect(router.state.location.pathname).toBe('/lobbies/1/game');
  });
  it('leaves a settled hand without confirmation or another fold', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round: { ...round, settled: true, net: -10, dealer: { cards: ['2C'], rank: 'high card' } } });
    const confirm = vi.spyOn(window, 'confirm');
    show();
    await screen.findByRole('button', { name: 'Deal' });
    await userEvent.click(screen.getByRole('link', { name: 'Back to lobby' }));
    expect(await screen.findByRole('heading', { name: 'Lobby room' })).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
    expect(game.playAction).not.toHaveBeenCalled();
  });
  it('selects a quick ante without dealing and disables unaffordable presets', async () => {
    game.getGame.mockResolvedValue({ balance: 90, round: null });
    show();
    const preset = await screen.findByRole('button', { name: 'Set ante to 25 points' });
    await waitFor(() => expect(preset.hasAttribute('disabled')).toBe(false));
    await userEvent.click(preset);
    expect(preset.getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('spinbutton', { name: 'Ante points' }) as HTMLInputElement).value).toBe('25');
    expect(screen.getByRole('button', { name: 'Set ante to 50 points' }).hasAttribute('disabled')).toBe(true);
    expect(game.dealTable).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Deal' }));
    expect(game.dealTable).toHaveBeenCalledWith(25);
  });
  it.each([
    [-10, '-10 pts', '—', 'not placed'],
    [-30, '-10 pts', '-20 pts', '20 staked'],
    [0, '0 pts', 'Returned · 0 pts', '20 staked'],
    [10, '+10 pts', 'Returned · 0 pts', '20 staked'],
    [90, '+10 pts', '+80 pts', '20 staked'],
  ])('breaks down a net result of %s points', async (net, anteResult, raiseResult, raiseStake) => {
    game.getGame.mockResolvedValue({ balance: 2450 + net, round: { ...round, dealer: { cards: ['2C','3D','4H','5S','7C'], rank: 'high card' }, settled: true, net } });
    show();
    const details = await screen.findByText('Details');
    await userEvent.click(details);
    const breakdown = details.parentElement!;
    const anteRow = within(breakdown).getByText('Ante · 10 staked').parentElement!;
    const raiseRow = within(breakdown).getByText(`Raise · ${raiseStake}`).parentElement!;
    expect(within(anteRow).getByText(anteResult)).toBeTruthy();
    expect(within(raiseRow).getByText(raiseResult)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(`${net > 0 ? '+' : ''}${net} pts`);
  });
  it('shows a concise result when the dealer does not qualify', async () => {
    game.getGame.mockResolvedValue({ balance: 2460, round: { ...round, settled: true,
      dealer: { cards: ['2C', '3D', '4H', '5S', '7C'], rank: 'high card' },
      message: 'Dealer does not qualify. Ante wins; raise returned.', net: 10 } });
    show();
    expect(await screen.findByText('Dealer doesn’t qualify · +10 pts')).toBeTruthy();
    await userEvent.click(screen.getByText('Details'));
    expect(screen.getByText('Returned · 0 pts')).toBeTruthy();
  });
  it('deals, hides four dealer cards, folds, and allows another hand', async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: 'Deal' }));
    expect(game.dealTable).toHaveBeenCalledWith(10);
    const dealer = screen.getByLabelText('Dealer hand');
    expect(within(dealer).getAllByRole('img', { name: 'Hidden dealer card' })).toHaveLength(4);
    expect(screen.queryByRole('img', { name: 'Three of diamonds' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Ace of spades' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Fold' }));
    expect(game.playAction).toHaveBeenCalledWith('fold');
    expect(await screen.findByText('You folded · -10 pts')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Three of diamonds' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Deal' }));
    expect(game.dealTable).toHaveBeenCalledTimes(2);
  });
  it('raises and shows the authoritative balance and result', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockResolvedValue({ balance: 2540, round: { ...round, settled: true,
      dealer: { cards: ['2C','2D','4H','5S','7C'], rank: 'pair' }, message: 'You win!', net: 90 } });
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Raise · 20 pts' }));
    expect(game.playAction).toHaveBeenCalledWith('raise');
    expect(await screen.findByText('You win · +90 pts')).toBeTruthy();
    expect(screen.getByText('2,540')).toBeTruthy();
  });
  it('opens the ranking guide, highlights your hand, and closes it without changing the round', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    show();
    await screen.findByRole('button', { name: 'Raise · 20 pts' });
    await userEvent.click(screen.getByRole('button', { name: /Rules & hands/ }));
    const guide = screen.getByRole('complementary', { name: 'Rules & hands' });
    expect(within(guide).getAllByRole('listitem')).toHaveLength(10);
    expect(within(guide).getByText('Your hand').closest('li')?.getAttribute('aria-current')).toBe('true');
    expect(within(guide).getByText('Your hand').closest('li')?.textContent).toContain('Straight');
    expect(within(guide).getByText('100:1')).toBeTruthy();
    // The guide is nonmodal: betting remains available while comparing your hand.
    expect(screen.getByRole('button', { name: 'Raise · 20 pts' }).hasAttribute('disabled')).toBe(false);
    await userEvent.click(within(guide).getByRole('button', { name: 'Expand hand rankings' }));
    expect(within(guide).getByRole('button', { name: 'Collapse hand rankings' }).getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(within(guide).getByRole('button', { name: 'Close hand rankings' }));
    expect(screen.queryByRole('complementary', { name: 'Rules & hands' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Rules & hands/ }));
    expect(game.playAction).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Rules & hands/ }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Rules & hands' })).toBeNull();
  });
  it('pauses bets after a failed action and restores the hand when back online' , async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockRejectedValue(new Error('Connection failed'));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Fold' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Connection failed');
    expect(screen.getByRole('button', { name: 'Fold' }).hasAttribute('disabled')).toBe(true);
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fold' }).hasAttribute('disabled')).toBe(false));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Connection restored · Your hand and balance are saved.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Ace of spades' })).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'Hidden dealer card' })).toHaveLength(4);
  });
});
