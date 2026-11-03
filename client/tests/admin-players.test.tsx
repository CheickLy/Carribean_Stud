import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../src/pages/admin/AdminDashboard';

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));
const usersApi = vi.hoisted(() => ({
  listUsers: vi.fn(),
  setUserBanned: vi.fn(),
  updateUserAccount: vi.fn(),
  deleteUserAccount: vi.fn(),
}));

vi.mock('../src/services/auth', () => auth);
vi.mock('../src/services/users', () => usersApi);

const admin = {
  userId: 1,
  username: 'reefadmin',
  email: 'admin@example.com',
  role: 'admin',
  topupCount: 0,
  isGuest: false,
  isBanned: false,
  balance: '0.00',
  createdAt: '2026-09-01T15:00:00.000Z',
};
const marina = {
  userId: 2,
  username: 'marina',
  email: 'marina@example.com',
  role: 'player',
  topupCount: 4,
  isGuest: false,
  isBanned: false,
  balance: '250.00',
  createdAt: '2026-09-15T18:30:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }
  auth.getCurrentUser.mockResolvedValue({
    userId: 1,
    username: 'reefadmin',
    role: 'admin',
  });
  usersApi.listUsers.mockResolvedValue([admin, marina]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

describe('admin player accounts', () => {
  it('edits a player username and email from a dialog', async () => {
    usersApi.updateUserAccount.mockResolvedValue({
      ...marina,
      username: 'marina_2',
      email: 'marina2@example.com',
    });
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
    expect(await screen.findAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'marina_2' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'marina2@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(usersApi.updateUserAccount).toHaveBeenCalledWith(2, 'marina_2', 'marina2@example.com'),
    );
    expect(await screen.findByText('marina_2')).toBeTruthy();
  });

  it('hides edit, ban, and delete on the signed-in admin row', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
    const ownRow = (await screen.findByRole('cell', { name: 'reefadmin', exact: true })).closest('tr')!;
    const playerRow = screen.getByRole('cell', { name: 'marina', exact: true }).closest('tr')!;
    expect(within(ownRow).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(ownRow).queryByRole('button', { name: 'Ban' })).toBeNull();
    expect(within(ownRow).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(within(playerRow).getByRole('button', { name: 'Ban' })).toBeTruthy();
  });

  it('deletes a player only after the confirm dialog', async () => {
    usersApi.deleteUserAccount.mockResolvedValue(undefined);
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete marina?' });
    expect(usersApi.deleteUserAccount).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(usersApi.deleteUserAccount).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText('marina@example.com')).toBeNull());
  });
});
