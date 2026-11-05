import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Friends from '../src/pages/player/Friends';
import * as friends from '../src/services/friends';
vi.mock('../src/services/friends', () => ({ getFriends: vi.fn(), getPendingRequests: vi.fn(), sendFriendRequest: vi.fn(), respondToFriendRequest: vi.fn(), removeFriendship: vi.fn() }));
vi.mock('../src/services/invitations', () => ({ getIncomingInvitations: vi.fn().mockResolvedValue([]), respondToLobbyInvitation: vi.fn() }));
const friend = { friendshipId: 7, userId: 2, username: 'Marina' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(friends.getFriends).mockResolvedValue([friend]);
  vi.mocked(friends.getPendingRequests).mockResolvedValue([]);
  vi.spyOn(window, 'confirm').mockReturnValue(false);
});
async function show() { render(<MemoryRouter><Friends /></MemoryRouter>); return screen.findByRole('button', { name: 'Remove Friend' }); }
it('asks for confirmation naming the friend and leaves them when cancelled', async () => {
  fireEvent.click(await show());
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Remove Marina'));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('table memberships will stay the same'));
  expect(friends.removeFriendship).not.toHaveBeenCalled();
  expect(screen.getByText('Marina')).toBeTruthy();
});
it('removes the confirmed friend and updates the list', async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  vi.mocked(friends.removeFriendship).mockResolvedValue({ message: 'Removed' });
  const button = await show();
  vi.mocked(friends.getFriends).mockResolvedValue([]);
  fireEvent.click(button);
  await waitFor(() => expect(friends.removeFriendship).toHaveBeenCalledWith(7));
  expect(await screen.findByText('Friend removed successfully.')).toBeTruthy();
  await waitFor(() => expect(screen.queryByText('Marina')).toBeNull());
  expect(screen.getByRole('heading', { name: 'My Friends (0)' })).toBeTruthy();
});
it('keeps the friend and shows an error when removal fails', async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  vi.mocked(friends.removeFriendship).mockRejectedValue(new Error('Connection lost. Try again.'));
  fireEvent.click(await show());
  expect(await screen.findByText('Connection lost. Try again.')).toBeTruthy();
  expect(screen.getByText('Marina')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove Friend' })).toHaveProperty('disabled', false);
});
it('disables removal until the current request finishes', async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  let finish!: (value: { message: string }) => void;
  vi.mocked(friends.removeFriendship).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const button = await show(); fireEvent.click(button); fireEvent.click(button);
  expect(button).toHaveProperty('disabled', true);
  expect(friends.removeFriendship).toHaveBeenCalledOnce();
  finish({ message: 'Removed' });
  await screen.findByText('Friend removed successfully.');
});
