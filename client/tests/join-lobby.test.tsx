import { startGuest } from "../src/services/auth";
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LobbyRoom from '../src/pages/LobbyRoom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LobbyBrowser from '../src/pages/LobbyBrowser';
vi.mock('../src/services/auth', () => ({ startGuest: vi.fn() }));
vi.mock('../src/components/SponsoredAdvertBanner', () => ({ default: () => null }));
const session = vi.hoisted(() => ({ user: { role: 'player' } as object | null, loading: false, error: '' }));
const navigate = vi.fn();
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => navigate, useOutletContext: () => session }));
const lobby = { lobbyId: 1, hostId: 10, name: 'Reef table', creator: 'Marina', createdAt: new Date().toISOString(), startingMoney: '200', minBet: 10, maxBet: 100, maxPlayers: 2, seatsAvailable: 1, isPrivate: false, botsEnabled: false };
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) });
beforeEach(() => {
  vi.clearAllMocks();
  session.user = { role: 'player' }; session.loading = false; session.error = '';
  vi.mocked(startGuest).mockResolvedValue({ user: { role: 'player', isGuest: true } } as any);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([lobby])));
});
function show() { render(<MemoryRouter><LobbyBrowser /></MemoryRouter>); }
it('joins a public table directly with session credentials', async () => {
  show(); const button = await screen.findByRole('button', { name: 'Join', exact: true });
  vi.mocked(fetch).mockResolvedValueOnce(response({ lobbyId: 1 }) as Response);
  fireEvent.click(button);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies/1', { state: { joined: true } }));
  expect(fetch).toHaveBeenLastCalledWith('/api/lobbies/1/join', expect.objectContaining({ credentials: 'include', method: 'POST', body: '{}' }));
});
it('submits a private password and keeps failures visible for retry', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response([{ ...lobby, isPrivate: true }]) as Response);
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Join', exact: true }));
  fireEvent.change(screen.getByLabelText('Table password'), { target: { value: 'secret' } });
  vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Incorrect table password.' }, 403) as Response);
  fireEvent.click(screen.getByRole('button', { name: 'Take a seat' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Incorrect table password.');
  expect(fetch).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ body: JSON.stringify({ passcode: 'secret' }) }));
  expect(navigate).not.toHaveBeenCalled();
});
it('offers sign-in or guest play when an existing session expires', async () => {
  show(); const button = await screen.findByRole('button', { name: 'Join', exact: true });
  vi.mocked(fetch).mockResolvedValueOnce(response({}, 401) as Response);
  fireEvent.click(button);
  await screen.findByRole('heading', { name: 'Continue to table' });
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(navigate).toHaveBeenCalledWith('/login', { state: { from: '/lobbies' } });
});
it('disables joining a full table', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response([{ ...lobby, seatsAvailable: 0 }]) as Response);
  show(); expect(await screen.findByRole('button', { name: 'Full', exact: true })).toHaveProperty('disabled', true);
});

it('sends a former member back to the table list instead of the empty room', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Table not found or you are not a member.' }, 404) as Response);
  render(<MemoryRouter initialEntries={['/lobbies/1']}><Routes><Route path="/lobbies/:lobbyId" element={<LobbyRoom />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies', { replace: true }));
  expect(screen.queryByRole('alert')).toBeNull();
});

it('shows a reserved seat while waiting for the next hand', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response({ ...lobby, isHost: false, handInProgress: true, waitingForNextHand: true, players: [{ userId: 7, username: 'Alice', isHost: false, waitingForNextHand: true }] }) as Response);
  render(<MemoryRouter initialEntries={['/lobbies/1']}><Routes><Route path="/lobbies/:lobbyId" element={<LobbyRoom />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('Your seat is reserved. You will join the next hand.')).toBeTruthy();
  expect(screen.getByText('Hand in progress')).toBeTruthy();
  expect(screen.getByText('Waiting for next hand')).toBeTruthy();
});

it('offers anonymous players guest access before submitting a join', async () => {
  session.user = null;
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Join', exact: true }));
  expect(screen.getByRole('heading', { name: 'Continue to table' })).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch).mockResolvedValueOnce(response({ lobbyId: 1 }) as Response);
  fireEvent.click(screen.getByRole('button', { name: 'Play as guest' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies/1', { state: { joined: true } }));
  expect(startGuest).toHaveBeenCalledOnce();
});
it('shows a public-table failure without losing the list', async () => {
  show(); const button = await screen.findByRole('button', { name: 'Join', exact: true });
  vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Table is full.' }, 409) as Response);
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Reef table: Table is full.');
  expect(screen.getByRole('button', { name: 'Join', exact: true }).hasAttribute('disabled')).toBe(false);
});
