import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlayerRecord } from '../src/pages/player/Profile';
import TableChat from '../src/components/TableChat';
import SpectateTable from '../src/pages/SpectateTable';

vi.mock('../src/services/auth', () => ({ getCurrentUser: vi.fn().mockResolvedValue({ username: 'Olu', isGuest: false }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Iteration 3 player screens', () => {
  it('shows real zero stats without dividing by zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/stats')
      ? { hands: 0, wins: 0, losses: 0, ties: 0, winRate: 0, net: 0, raised: 0, folded: 0 }
      : { page: 1, total: 0, pages: 0, hands: [], sessions: [] } })));
    render(<MemoryRouter><PlayerRecord title="Statistics" /></MemoryRouter>);
    expect(await screen.findByText('0%')).toBeTruthy();
    expect(screen.getByText('No hands played yet.')).toBeTruthy();
    expect(screen.queryByText(/sample hands/i)).toBeNull();
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
});
