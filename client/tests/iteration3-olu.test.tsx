import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlayerRecord } from '../src/pages/player/Profile';
import TableChat from '../src/components/TableChat';
import SpectateTable from '../src/pages/SpectateTable';
import CreateLobby from '../src/pages/CreateLobby';

vi.mock('../src/services/auth', () => ({ getCurrentUser: vi.fn().mockResolvedValue({ username: 'Olu', isGuest: false }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Iteration 3 player screens', () => {
  it('keeps starting bots within the seat limit when creating a table', async () => {
    const fetchMock = vi.fn(async (_url: string, _options?: RequestInit) => ({ ok: true, json: async () => ({ lobbyId: 9 }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/lobbies/new']}><Routes><Route path="/lobbies/new" element={<CreateLobby />} /><Route path="/lobbies/:lobbyId" element={<p>Table created</p>} /></Routes></MemoryRouter>);
    await userEvent.type(screen.getByRole('textbox', { name: 'Lobby name' }), 'Palm Table');
    await userEvent.click(screen.getByRole('checkbox', { name: /Allow bots/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Bots to start with/ }), '4');
    await userEvent.click(within(screen.getByRole('group', { name: 'Maximum players' })).getByRole('button', { name: '2' }));
    expect((screen.getByRole('combobox', { name: /Bots to start with/ }) as HTMLSelectElement).value).toBe('1');
    await userEvent.click(screen.getByRole('button', { name: /Create lobby & take a seat/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ name: 'Palm Table', maxPlayers: 2, startingBots: 1 });
  });

  it('shows real zero stats without dividing by zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/stats')
      ? { hands: 0, wins: 0, losses: 0, ties: 0, winRate: 0, net: 0, raised: 0, folded: 0 }
      : { page: 1, total: 0, pages: 0, hands: [], sessions: [] } })));
    render(<MemoryRouter><PlayerRecord title="Statistics" /></MemoryRouter>);
    expect(await screen.findByText('0%')).toBeTruthy();
    expect(screen.getByText('No hands played yet.')).toBeTruthy();
    expect(screen.queryByText(/sample hands/i)).toBeNull();
  });

  it('opens a session from game history and returns to all hands', async () => {
    const hand = { id: 1, sessionId: 7, date: '2026-11-23T12:00:00Z', table: 'Palm Table', ante: 5, choice: 'Raise', hand: '["AC","KD"]', result: 'Win', net: 10 };
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/stats')
      ? { hands: 1, wins: 1, losses: 0, ties: 0, winRate: 100, net: 10, raised: 1, folded: 0 }
      : { page: 1, total: 1, pages: 1, hands: [hand], sessions: [{ id: 7, table: 'Palm Table' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><PlayerRecord title="Game History" /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Session 7' }));
    expect(await screen.findByRole('heading', { name: 'Session 7' })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => url.includes('sessionId=7'))).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /All hands/ }));
    expect(await screen.findByRole('heading', { name: 'Hand history' })).toBeTruthy();
  });

  it('sends a table message and keeps a failed draft for retry', async () => {
    let fail = true;
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'POST' && fail) { fail = false; return { ok: false, json: async () => ({ error: 'Message was not sent.' }) }; }
      return { ok: true, json: async () => options?.method === 'POST' ? [{ id: 1, userId: 1, name: 'Olu', message: 'Hello table', createdAt: new Date().toISOString() }] : [] };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<TableChat lobbyId="7" connected onClose={() => {}} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello table');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Message was not sent.');
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).value).toBe('Hello table');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('Hello table'));
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement).value).toBe('');
  });

  it('shows the spectator public view without betting controls or private cards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'Palm Table', isPrivate: false, roundNumber: 2, phase: 'deciding', deadline: null, dealer: ['AC'], seats: [{ name: 'Olu', bot: false, status: 'raised', ante: 5, net: null }] }) })));
    render(<MemoryRouter initialEntries={['/lobbies/7/spectate']}><Routes><Route path="/lobbies/:lobbyId/spectate" element={<SpectateTable />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Palm Table' })).toBeTruthy();
    expect(screen.getByLabelText('Dealer cards').textContent).toContain('AC');
    expect(screen.queryByRole('button', { name: /ante|raise|fold/i })).toBeNull();
    expect(screen.queryByText('Cards unavailable')).toBeNull();
  });

  it('does not show a countdown after a hand is complete', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'Palm Table', roundNumber: 2, phase: 'completed', deadline: Date.now() - 1000, dealer: ['AC'], seats: [] }) })));
    render(<MemoryRouter initialEntries={['/lobbies/7/spectate']}><Routes><Route path="/lobbies/:lobbyId/spectate" element={<SpectateTable />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Hand complete' })).toBeTruthy();
    expect(screen.queryByText(/left|time up/i)).toBeNull();
  });
});
