import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../src/pages/admin/AdminDashboard';
import SupportReports from '../src/pages/admin/SupportReports';

const navigate = vi.fn();
const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn(), logout: vi.fn() }));
const usersApi = vi.hoisted(() => ({
  listUsers: vi.fn(),
  setUserBanned: vi.fn(),
  updateUserAccount: vi.fn(),
  deleteUserAccount: vi.fn(),
}));
const support = vi.hoisted(() => ({ listSupportTickets: vi.fn(), saveSupportTicket: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal<typeof import('react-router-dom')>();
  return { ...real, useNavigate: () => navigate };
});
vi.mock('../src/services/auth', () => auth);
vi.mock('../src/services/users', () => usersApi);
vi.mock('../src/services/support', () => support);

const admin = {
  userId: 1, username: 'reefadmin', email: 'admin@example.com', role: 'admin',
  topupCount: 0, isGuest: false, isBanned: false, balance: '0.00', createdAt: '2026-09-01T15:00:00.000Z',
};
const marina = {
  userId: 2, username: 'marina', email: 'marina@example.com', role: 'player',
  topupCount: 1, isGuest: false, isBanned: true, balance: 'not-a-number', createdAt: 'not-a-date',
};
const guest = {
  userId: 3, username: 'guest_1', email: 'guest_1@guest.reefroyale.invalid', role: 'player',
  topupCount: 0, isGuest: true, isBanned: false, balance: '5.00', createdAt: '2026-10-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  }
  auth.getCurrentUser.mockResolvedValue({ userId: 1, username: 'reefadmin', role: 'admin' });
  auth.logout.mockResolvedValue(undefined);
  usersApi.listUsers.mockResolvedValue([admin, marina, guest]);
  support.listSupportTickets.mockResolvedValue([]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1 }, { id: 2 }] }));
});

async function openPlayers() {
  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
  await screen.findByRole('cell', { name: 'marina', exact: true });
}

describe('admin dashboard', () => {
  it('shows live lobby and player counts, then logs out', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    expect(await screen.findByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('sends a non-admin and a failed session back to home', async () => {
    auth.getCurrentUser.mockResolvedValueOnce({ username: 'marina', role: 'player', userId: 2 });
    const first = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
    first.unmount();

    auth.getCurrentUser.mockRejectedValueOnce(new Error('down'));
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(2));
  });

  it('keeps the session message when logout fails', async () => {
    auth.logout.mockRejectedValueOnce(new Error('no'));
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('Could not log out. Please try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
  });

  it('shows a load error, an empty list, and a search miss', async () => {
    usersApi.listUsers.mockRejectedValue('down');
    const failed = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
    expect(await screen.findByText('Could not load users')).toBeTruthy();
    failed.unmount();

    usersApi.listUsers.mockResolvedValue([]);
    const empty = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
    expect(await screen.findByText('No players.')).toBeTruthy();
    empty.unmount();

    usersApi.listUsers.mockResolvedValue([admin, marina, guest]);
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Players' }));
    fireEvent.change(await screen.findByLabelText('Search players'), { target: { value: 'zzzz' } });
    expect(await screen.findByText('No matches.')).toBeTruthy();
    expect(screen.getByText('0 players')).toBeTruthy();
  });

  it('bans, unbans, and reports a ban failure', async () => {
    usersApi.setUserBanned.mockResolvedValueOnce({ ...marina, isBanned: false });
    await openPlayers();
    const row = screen.getByRole('cell', { name: 'marina', exact: true }).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Unban' }));
    await waitFor(() => expect(usersApi.setUserBanned).toHaveBeenCalledWith(2, false));

    usersApi.setUserBanned.mockRejectedValueOnce(new Error('Ban failed'));
    fireEvent.click(within(row).getByRole('button', { name: 'Ban' }));
    expect(await screen.findByText('Ban failed')).toBeTruthy();
  });

  it('shows raw balance and date text, a guest tag, and an edit failure', async () => {
    usersApi.updateUserAccount.mockRejectedValueOnce(new Error('Username or email already registered'));
    await openPlayers();
    expect(screen.getByText('not-a-number')).toBeTruthy();
    expect(screen.getByText('not-a-date')).toBeTruthy();
    expect(screen.getAllByText('Guest').length).toBeGreaterThan(0);
    const row = screen.getByRole('cell', { name: 'marina', exact: true }).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Username or email already registered')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('dialog'), { target: screen.getByRole('dialog') });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the delete dialog open when the request fails, then closes on cancel', async () => {
    usersApi.deleteUserAccount.mockRejectedValueOnce(new Error('Could not delete account'));
    await openPlayers();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Delete marina?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Could not delete account')).toBeTruthy();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens reports and zeros the lobby count when that request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    const lobby = (await screen.findByText('Lobbies created')).parentElement;
    expect(lobby?.querySelector('strong')?.textContent).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    expect(await screen.findByRole('heading', { name: 'Support Tickets' })).toBeTruthy();
  });
});

describe('support reports', () => {
  const ticket = {
    ticketId: 7, subject: 'Table issue', message: 'Could not join', status: 'open' as const,
    resolutionNote: null, createdAt: '2026-10-30T12:00:00Z', player: null,
  };

  it('switches tickets and shows a save failure', async () => {
    const second = { ...ticket, ticketId: 8, subject: 'Other', status: 'resolved' as const, player: { username: 'julian', email: 'julian@example.com' } };
    support.listSupportTickets.mockResolvedValue([ticket, second]);
    support.saveSupportTicket.mockRejectedValueOnce(new Error('Could not save ticket'));
    render(<MemoryRouter><SupportReports /></MemoryRouter>);
    expect((await screen.findAllByText(/Unknown player/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Other/ }));
    expect(screen.getByRole('heading', { name: 'Other' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save ticket' }));
    expect(await screen.findByText('Could not save ticket')).toBeTruthy();
  });

  it('shows a load failure that is not an Error', async () => {
    support.listSupportTickets.mockRejectedValueOnce('down');
    render(<MemoryRouter><SupportReports /></MemoryRouter>);
    expect(await screen.findByText('Could not load tickets')).toBeTruthy();
  });
});
