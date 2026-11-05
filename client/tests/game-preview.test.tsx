import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import GamePreview from '../src/pages/GamePreview';
function show(user: { username: string; isGuest?: boolean } | null = null) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/game-preview', state: { tableName: 'Ocean room' } }]}><Routes><Route element={<Outlet context={{ user }} />}><Route path="/game-preview" element={<GamePreview />} /></Route></Routes></MemoryRouter>);
}
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
it('shows the reference table with a private dealer hand and sample-player labels', () => {
  show({ username: 'Marina' });
  expect(screen.getByText('Ocean room')).toBeTruthy();
  expect(screen.getByText('UI PREVIEW')).toBeTruthy();
  expect(within(screen.getByLabelText('Dealer hand')).getAllByRole('img', { name: 'Face-down card' })).toHaveLength(4);
  expect(within(screen.getByLabelText('Your hand')).getAllByRole('img')).toHaveLength(5);
  expect(screen.getAllByText('Marina')).toHaveLength(2);
  expect(fetch).not.toHaveBeenCalled();
});
it('reveals the fixed dealer hand after a raise and can deal another demo hand', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Raise · 20 pts' }));
  expect(screen.getByText('Your aces take the hand.')).toBeTruthy();
  expect(within(screen.getByLabelText('Dealer hand')).queryByRole('img', { name: 'Face-down card' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Raise · 20 pts' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next demo hand →' }));
  expect(screen.getByRole('button', { name: 'Raise · 20 pts' })).toBeTruthy();
  expect(screen.getByText('CARIBBEAN STUD · HAND 02')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it('folds without revealing the dealer cards, and resets the sample chips', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Fold' }));
  expect(screen.getByText('You folded')).toBeTruthy();
  expect(screen.getByText('Ante forfeited · 10 demo pts')).toBeTruthy();
  expect(within(screen.getByLabelText('Dealer hand')).getAllByRole('img', { name: 'Face-down card' })).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Reset chips' }));
  expect(screen.getByRole('button', { name: 'Fold' })).toBeTruthy();
  expect(screen.getByText('Demo reset. Your account balance is unchanged.')).toBeTruthy();
});
it('keeps preview chat local and allows closing it', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle table chat' }));
  expect(screen.getByText('Local preview · Messages are not sent')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Hello crew!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send preview message' }));
  expect(screen.getByText('Hello crew!')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close table chat' }));
  expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
});
it('lets the reconnecting seat state be previewed without changing membership', () => {
  show();
  expect(screen.getByRole('article', { name: 'SunnyJ, reconnecting' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle reconnecting seat preview' }));
  expect(screen.getByRole('article', { name: 'SunnyJ, seated' })).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
