import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LobbyRoom from '../src/pages/LobbyRoom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LobbyBrowser from '../src/pages/LobbyBrowser';
const navigate = vi.fn();
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => navigate }));
const lobby = { lobbyId: 1, hostId: 10, name: 'Reef table', creator: 'Marina', createdAt: new Date().toISOString(), startingMoney: '200', minBet: 10, maxBet: 100, maxPlayers: 2, seatsAvailable: 1, isPrivate: false, botsEnabled: false };
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([lobby])));
});
function show() { render(<MemoryRouter><LobbyBrowser /></MemoryRouter>); }
it('confirms the chip requirement and joins with credentials', async () => {
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Join Table' }));
  expect(screen.getByText(/Your chip balance will not be charged/)).toBeTruthy();
  vi.mocked(fetch).mockResolvedValueOnce(response({ lobbyId: 1 }) as Response);
  fireEvent.click(screen.getByRole('button', { name: 'Take a seat' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies/1', { state: { joined: true } }));
  expect(fetch).toHaveBeenLastCalledWith('/api/lobbies/1/join', expect.objectContaining({ credentials: 'include', method: 'POST', body: '{}' }));
});
it('submits a private password and keeps failures visible for retry', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response([{ ...lobby, isPrivate: true }]) as Response);
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Join Table' }));
  fireEvent.change(screen.getByLabelText('Table password'), { target: { value: 'secret' } });
  vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Incorrect table password.' }, 403) as Response);
  fireEvent.click(screen.getByRole('button', { name: 'Take a seat' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Incorrect table password.');
  expect(fetch).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ body: JSON.stringify({ passcode: 'secret' }) }));
  expect(navigate).not.toHaveBeenCalled();
});
it('redirects an expired session to login and returns to the browser', async () => {
  show(); fireEvent.click(await screen.findByRole('button', { name: 'Join Table' }));
  vi.mocked(fetch).mockResolvedValueOnce(response({}, 401) as Response);
  fireEvent.click(screen.getByRole('button', { name: 'Take a seat' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { state: { from: '/lobbies' } }));
});
it('disables joining a full table', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response([{ ...lobby, seatsAvailable: 0 }]) as Response);
  show(); expect(await screen.findByRole('button', { name: 'Table full' })).toHaveProperty('disabled', true);
});

it('shows a reserved seat while waiting for the next hand', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response({ ...lobby, isHost: false, handInProgress: true, waitingForNextHand: true, players: [{ userId: 7, username: 'Alice', isHost: false, waitingForNextHand: true }] }) as Response);
  render(<MemoryRouter initialEntries={['/lobbies/1']}><Routes><Route path="/lobbies/:lobbyId" element={<LobbyRoom />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('Your seat is reserved. You will join the next hand.')).toBeTruthy();
  expect(screen.getByText('Hand in progress')).toBeTruthy();
  expect(screen.getByText('Waiting for next hand')).toBeTruthy();
});
