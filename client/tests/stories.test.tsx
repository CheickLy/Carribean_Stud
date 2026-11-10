import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/pages/guest/Home';
import Profile from '../src/pages/player/Profile';
import PlayerHome from '../src/pages/player/PlayerHome';
import GameRules from '../src/pages/GameRules';
import SupportReports from '../src/pages/admin/SupportReports';
import ContactSupport from '../src/pages/ContactSupport';

const navigate = vi.fn();
const auth = vi.hoisted(() => ({
  login: vi.fn(), register: vi.fn(), startGuest: vi.fn(), getCurrentUser: vi.fn(), logout: vi.fn(),
}));
const support = vi.hoisted(() => ({ listSupportTickets: vi.fn(), saveSupportTicket: vi.fn(), submitSupportTicket: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal<typeof import('react-router-dom')>();
  return { ...real, useNavigate: () => navigate };
});
vi.mock('../src/services/auth', () => auth);
vi.mock('../src/services/support', () => support);

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue({ username: 'Marina', balance: '500.00', avatar: 'wave', isGuest: false });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

describe('iteration two screens', () => {
  it('opens separate login and registration dialogs and sends an admin to the dashboard', async () => {
    auth.login.mockResolvedValue({ user: { role: 'admin' } });
    render(<MemoryRouter><Home /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('dialog', { name: 'Register' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByRole('dialog', { name: 'Log in' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' }).at(-1)!);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin'));
  });

  it('shows a signed-in profile and redirects an anonymous visitor', async () => {
    const view = render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(await screen.findByText('Marina')).toBeTruthy();
    expect(screen.getByText('500.00 CHIPS')).toBeTruthy();
    view.unmount();
    auth.getCurrentUser.mockResolvedValue(null);
    render(<MemoryRouter><Profile /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('lets a player log out and returns to the public home', async () => {
    auth.logout.mockResolvedValue(undefined);
    render(<MemoryRouter><PlayerHome /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows the rules to an anonymous visitor', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    render(<MemoryRouter><GameRules /></MemoryRouter>);
    expect(screen.getByText('Caribbean Stud rules')).toBeTruthy();
    expect(screen.getByText('Dealer qualification')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('loads a support request, saves its resolution, and shows the saved state', async () => {
    const ticket = { ticketId: 7, subject: 'Table issue', message: 'Could not join', status: 'open', resolutionNote: null, createdAt: '2026-10-30T12:00:00Z', player: { username: 'marina', email: 'marina@example.com' } };
    support.listSupportTickets.mockResolvedValue([ticket]);
    support.saveSupportTicket.mockImplementation(async (_id, status, resolutionNote) => ({ ...ticket, status, resolutionNote }));
    render(<MemoryRouter><SupportReports /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Table issue' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'resolved' } });
    fireEvent.change(screen.getByLabelText('Resolution note'), { target: { value: 'Checked the table' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save ticket' }));
    await waitFor(() => expect(support.saveSupportTicket).toHaveBeenCalledWith(7, 'resolved', 'Checked the table'));
    expect(await screen.findByText('Ticket saved.')).toBeTruthy();
  });
});

it('takes a player directly to available tables after login', async () => {
  auth.login.mockResolvedValue({ user: { role: 'player' } });
  render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'player@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Log in' }).at(-1)!);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies'));
});

it('takes a guest directly to available tables', async () => {
  auth.startGuest.mockResolvedValue({ user: { role: 'player', isGuest: true } });
  render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play as Guest' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies'));
});

it('takes a new account straight to tables after registration', async () => {
  auth.register.mockResolvedValue({ user: { username: 'newplayer', role: 'player' } });
  render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newplayer' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Password123!' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Register', exact: true }).at(-1)!);
  await waitFor(() => expect(auth.register).toHaveBeenCalledWith('newplayer', 'new@example.com', 'Password123!'));
  expect(navigate).toHaveBeenCalledWith('/lobbies');
});

it('sends a categorized support request and shows the ticket number', async () => {
  support.submitSupportTicket.mockResolvedValue({ ticketId: 42, status: 'open' });
  render(<MemoryRouter><ContactSupport /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('What is your issue about? *'), { target: { value: 'Other' } });
  fireEvent.change(screen.getByLabelText('Brief summary *'), { target: { value: 'Question about a table' } });
  fireEvent.change(screen.getByLabelText('Reply email *'), { target: { value: 'player@example.com' } });
  fireEvent.change(screen.getByLabelText('Tell us more *'), { target: { value: 'I need help with my table settings.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  await waitFor(() => expect(support.submitSupportTicket).toHaveBeenCalledWith('Other: Question about a table', 'I need help with my table settings.', 'player@example.com'));
  expect(await screen.findByText(/#42/)).toBeTruthy();
});
