import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Gameplay from '../src/pages/Gameplay';
const game = vi.hoisted(() => ({ getGame: vi.fn(), dealTable: vi.fn(), playAction: vi.fn(), resetGame: vi.fn() }));
vi.mock('../src/services/game', () => game);
const round = {
  dealer: { cards: ['2C'], rank: null },
  player: { cards: ['AS', 'KH', 'QD', 'JC', '10S'], rank: 'straight' },
  ante: 10, settled: false,
};
describe('player versus dealer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    game.getGame.mockResolvedValue({ balance: 2450, round: null });
    game.dealTable.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockResolvedValue({ balance: 2440, round: { ...round, settled: true,
      dealer: { cards: ['2C','3D','4H','5S','7C'], rank: 'high card' }, message: 'You folded.', net: -10 } });
  });
  it('deals, hides four dealer cards, folds, and allows another hand', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Gameplay /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Deal hand' }));
    expect(game.dealTable).toHaveBeenCalledWith(10);
    const dealer = screen.getByLabelText('Dealer hand');
    expect(within(dealer).getAllByRole('img', { name: 'Hidden dealer card' })).toHaveLength(4);
    expect(screen.queryByRole('img', { name: 'Three of diamonds' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Ace of spades' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Fold' }));
    expect(game.playAction).toHaveBeenCalledWith('fold');
    expect(await screen.findByText('You folded. -10 pts')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Three of diamonds' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Deal next hand' }));
    expect(game.dealTable).toHaveBeenCalledTimes(2);
  });
  it('raises and shows the authoritative balance and result', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockResolvedValue({ balance: 2540, round: { ...round, settled: true,
      dealer: { cards: ['2C','2D','4H','5S','7C'], rank: 'pair' }, message: 'You win!', net: 90 } });
    render(<MemoryRouter><Gameplay /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Raise · 20 pts' }));
    expect(game.playAction).toHaveBeenCalledWith('raise');
    expect(await screen.findByText('You win! +90 pts')).toBeTruthy();
    expect(screen.getByText('2,540 practice pts')).toBeTruthy();
  });
  it('opens the ranking guide, highlights your hand, and closes it without changing the round', async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    render(<MemoryRouter><Gameplay /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Raise · 20 pts' });
    await userEvent.click(screen.getByRole('button', { name: /Hand rankings/ }));
    const guide = screen.getByRole('complementary', { name: 'Hand rankings' });
    expect(within(guide).getAllByRole('listitem')).toHaveLength(10);
    expect(within(guide).getByText('Your hand').closest('li')?.getAttribute('aria-current')).toBe('true');
    expect(within(guide).getByText('Your hand').closest('li')?.textContent).toContain('Straight');
    expect(within(guide).getByText('100 to 1')).toBeTruthy();
    // The guide is nonmodal: betting remains available while comparing your hand.
    expect(screen.getByRole('button', { name: 'Raise · 20 pts' }).hasAttribute('disabled')).toBe(false);
    await userEvent.click(within(guide).getByRole('button', { name: 'Expand hand rankings' }));
    expect(within(guide).getByRole('button', { name: 'Collapse hand rankings' }).getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(within(guide).getByRole('button', { name: 'Close hand rankings' }));
    expect(screen.queryByRole('complementary', { name: 'Hand rankings' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Hand rankings/ }));
    expect(game.playAction).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Hand rankings/ }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Hand rankings' })).toBeNull();
  });
  it('keeps the hand playable after a failed action' , async () => {
    game.getGame.mockResolvedValue({ balance: 2440, round });
    game.playAction.mockRejectedValue(new Error('Connection failed'));
    render(<MemoryRouter><Gameplay /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Fold' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Connection failed');
    expect(screen.getByRole('button', { name: 'Fold' }).hasAttribute('disabled')).toBe(false);
  });
});
