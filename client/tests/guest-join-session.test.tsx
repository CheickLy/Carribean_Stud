import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Layout, RequireSession } from '../src/App';
import LobbyBrowser from '../src/pages/LobbyBrowser';

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn(), startGuest: vi.fn(), logout: vi.fn() }));
vi.mock('../src/services/auth', () => auth);
vi.mock('../src/components/SponsoredAdvertBanner', () => ({ default: () => null }));
// App's production browser-router instance is not rendered by this memory-router test.
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), createBrowserRouter: vi.fn() }));
const NativeRequest = Request;
const guest = { username: 'guest_test', isGuest: true, role: 'player', balance: '500.00' };
const lobby = { lobbyId: 13, name: 'Two Window Multiplayer Test', isPrivate: false, seatsAvailable: 1, maxPlayers: 2, minBet: 5, maxBet: 25, startingMoney: 200, createdAt: new Date().toISOString() };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('Request', class extends NativeRequest { constructor(input: RequestInfo | URL, init?: RequestInit) { super(input, { ...init, signal: undefined }); } });
  vi.stubGlobal('localStorage', { getItem: () => 'dismissed', setItem: () => {} });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const body = path === '/api/lobbies/13/join' ? { lobbyId: 13 } : [lobby];
    return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body };
  }));
  auth.getCurrentUser.mockResolvedValue(null);
  auth.startGuest.mockResolvedValue({ user: guest });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function show() {
  const router = createMemoryRouter([{ element: <Layout />, children: [
    { path: '/lobbies', element: <LobbyBrowser /> },
    { path: '/login', element: <h1>Sign-in page</h1> },
    { element: <RequireSession />, children: [{ path: '/lobbies/:lobbyId', element: <h1>Joined lobby</h1> }] },
    { element: <RequireSession admin />, children: [{ path: '/admin', element: <h1>Admin content</h1> }] },
  ] }], { initialEntries: ['/lobbies'] });
  render(<RouterProvider router={router} />);
  return router;
}
describe('fresh session checks during navigation', () => {
  it('joins as a guest without redirecting to login while the new session is being checked', async () => {
    const router = show();
    await waitFor(() => expect(auth.getCurrentUser).toHaveBeenCalledTimes(1));
    await userEvent.click(await screen.findByRole('button', { name: 'Join', exact: true }));
    expect(screen.getByRole('heading', { name: 'Continue to table' })).toBeTruthy();
    let finish!: (user: typeof guest) => void;
    auth.getCurrentUser.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await userEvent.click(screen.getByRole('button', { name: 'Play as guest' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/lobbies/13'));
    expect(screen.getByRole('status').textContent).toBe('Loading session...');
    expect(screen.queryByRole('heading', { name: 'Sign-in page' })).toBeNull();
    await act(async () => finish(guest));
    expect(await screen.findByRole('heading', { name: 'Joined lobby' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/lobbies/13');
    expect(auth.startGuest).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/lobbies/13/join', expect.objectContaining({ credentials: 'include', method: 'POST' }));
  });
  it('still redirects an actually unauthenticated visitor after the session check completes', async () => {
    const router = show();
    await screen.findByRole('button', { name: 'Join', exact: true });
    await act(async () => { await router.navigate('/lobbies/13'); });
    expect(await screen.findByRole('heading', { name: 'Sign-in page' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
  });
  it('shows a session error rather than sending an authenticated guest back to login', async () => {
    const router = show(); await screen.findByRole('button', { name: 'Join', exact: true });
    auth.getCurrentUser.mockRejectedValueOnce(new Error('Session service unavailable'));
    await act(async () => { await router.navigate('/lobbies/13'); });
    expect(await screen.findByText('Unable to check your session. Please refresh to try again.')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/lobbies/13');
  });
  it('does not display admin content using a previous session while a fresh check is pending', async () => {
    auth.getCurrentUser.mockResolvedValueOnce({ ...guest, isGuest: false, role: 'admin' });
    const router = show(); await screen.findByRole('button', { name: 'Join', exact: true });
    let finish!: (user: typeof guest) => void;
    auth.getCurrentUser.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await act(async () => { await router.navigate('/admin'); });
    expect(screen.queryByRole('heading', { name: 'Admin content' })).toBeNull();
    await act(async () => finish(guest));
    expect(await screen.findByRole('heading', { name: 'Administrator access required' })).toBeTruthy();
  });
});
