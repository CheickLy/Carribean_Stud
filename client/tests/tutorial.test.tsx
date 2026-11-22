import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GameTutorial from '../src/pages/GameTutorial';
import TutorialInvite from '../src/components/TutorialInvite';
import { saveTutorialProgress } from '../src/services/tutorialProgress';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function show(lobbyId?: string) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/tutorial', state: { lobbyId } }]}><GameTutorial /></MemoryRouter>);
}
async function firstHand(choice: 'Fold' | 'Raise · 20 chips' = 'Raise · 20 chips') {
  await userEvent.click(screen.getByRole('button', { name: 'Place ante · 10 chips' }));
  await userEvent.click(screen.getByRole('button', { name: 'Select King of spades' }));
  await userEvent.click(screen.getByRole('button', { name: 'Compare my options' }));
  await userEvent.click(screen.getByRole('button', { name: choice }));
}
describe('play-along tutorial', () => {
  it('waits for the player, charges the ante once, and requires identifying the pair', async () => {
    show();
    expect(screen.queryByRole('button', { name: 'Fold' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'King of spades' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Place ante · 10 chips' }));
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('190');
    expect(screen.getAllByRole('img', { name: 'Hidden dealer card' })).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Compare my options' }).hasAttribute('disabled')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Select Nine of diamonds' }));
    expect(screen.getByRole('status').textContent).toContain('matching ranks');
    expect(screen.getByRole('button', { name: 'Compare my options' }).hasAttribute('disabled')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Select King of hearts' }));
    expect(screen.getByRole('status').textContent).toContain('two kings');
    expect(screen.getByRole('button', { name: 'Compare my options' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('190');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('plays both raise paths, explains qualification, and records completion locally', async () => {
    show(); await firstHand();
    expect(screen.getByText('You win · +30 chips')).toBeTruthy();
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('230');
    expect(screen.queryAllByRole('img', { name: 'Hidden dealer card' })).toHaveLength(0);
    const payout = screen.getByLabelText('Tutorial payout breakdown');
    expect(within(payout).getByText('60')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Try dealer qualification →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Place ante · 10 chips' }));
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('220');
    await userEvent.click(screen.getByRole('button', { name: 'Inspect dealer Ace of diamonds' }));
    expect(screen.getByRole('status').textContent).toContain('cannot tell');
    await userEvent.click(screen.getByRole('button', { name: 'Compare my options' }));
    await userEvent.click(screen.getByRole('button', { name: 'Raise · 20 chips' }));
    expect(screen.getByText('Dealer doesn’t qualify · +10 chips')).toBeTruthy();
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('240');
    expect(screen.getByText(/your 20-chip raise is returned/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Finish tutorial' }));
    expect(screen.getByRole('heading', { name: 'You’re ready for the table' })).toBeTruthy();
    expect(localStorage.getItem('reefroyale.tutorial.v1')).toBe('completed');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('supports folding without pretending to pay a raise, and resets only tutorial chips', async () => {
    show(); await firstHand('Fold');
    expect(screen.getByText('You folded · -10 chips')).toBeTruthy();
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('190');
    expect(screen.getByText('Not placed')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Restart tutorial' }));
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('200');
    expect(screen.getByRole('button', { name: 'Place ante · 10 chips' })).toBeTruthy();
    expect(localStorage.getItem('reefroyale.tutorial.v1')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('adjusts ante and raise together and handles a folded qualification lesson', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: '25', exact: true }));
    expect(screen.getByText('Ante 25 + possible raise 50 = 75 tutorial chips.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Place ante · 25 chips' }));
    await userEvent.click(screen.getByRole('button', { name: 'Select King of spades' }));
    await userEvent.click(screen.getByRole('button', { name: 'Compare my options' }));
    await userEvent.click(screen.getByRole('button', { name: 'Raise · 50 chips' }));
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('275');
    await userEvent.click(screen.getByRole('button', { name: 'Try dealer qualification →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Place ante · 25 chips' }));
    await userEvent.click(screen.getByRole('button', { name: 'Inspect dealer Ace of diamonds' }));
    await userEvent.click(screen.getByRole('button', { name: 'Compare my options' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fold' }));
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('250');
    expect(screen.getByText(/your ante would have won and your raise would have been returned/)).toBeTruthy();
  });
  it('returns to the originating lobby and rejects malformed return destinations', () => {
    const first = show('12');
    expect(screen.getByRole('link', { name: '← Back to lobby' }).getAttribute('href')).toBe('/lobbies/12');
    first.unmount();
    show('//example.com');
    expect(screen.getByRole('link', { name: '← Back to tables' }).getAttribute('href')).toBe('/lobbies');
  });
  it('keeps the hand while opening and closing the rules guide', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Place ante · 10 chips' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rules & hands' }));
    expect(screen.getByRole('complementary', { name: 'Rules & hands' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Rules & hands' })).toBeNull();
    expect(screen.getByLabelText('Tutorial balance').textContent).toContain('190');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rules & hands' }));
  });
  it('dismisses the first-visit invitation without hiding the tutorial permanently', async () => {
    render(<MemoryRouter><TutorialInvite /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Try the tutorial →' }).getAttribute('href')).toBe('/tutorial');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss tutorial suggestion' }));
    expect(screen.queryByRole('complementary', { name: 'Learn to play' })).toBeNull();
    expect(localStorage.getItem('reefroyale.tutorial.v1')).toBe('dismissed');
    saveTutorialProgress('completed'); saveTutorialProgress('dismissed');
    expect(localStorage.getItem('reefroyale.tutorial.v1')).toBe('completed');
  });
  it('works when browser storage is unavailable', async () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } });
    show(); await firstHand('Fold');
    expect(screen.getByText('You folded · -10 chips')).toBeTruthy();
    expect(() => saveTutorialProgress('completed')).not.toThrow();
  });
});
