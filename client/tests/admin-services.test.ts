import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, login, logout, register, startGuest } from '../src/services/auth';
import { listSupportTickets, saveSupportTicket } from '../src/services/support';
import {
  deleteUserAccount,
  listUsers,
  setUserBanned,
  updateAvatar,
  updateUserAccount,
} from '../src/services/users';

const user = {
  userId: 2,
  username: 'marina',
  email: 'marina@example.com',
  role: 'player',
  topupCount: 0,
  isGuest: false,
  isBanned: false,
  balance: '10.00',
  createdAt: '2026-09-15T18:30:00.000Z',
};

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('admin dashboard services', () => {
  it('loads, updates, bans, and deletes a player', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse([user]) as Response)
      .mockResolvedValueOnce(jsonResponse({ ...user, username: 'marina_2' }) as Response)
      .mockResolvedValueOnce(jsonResponse({ ...user, isBanned: true }) as Response)
      .mockResolvedValueOnce(jsonResponse(null, true, 204) as Response)
      .mockResolvedValueOnce(jsonResponse({ user: { userId: 2, username: 'marina', avatar: 'turtle' } }) as Response);

    expect(await listUsers()).toEqual([user]);
    expect(await updateUserAccount(2, 'marina_2', 'marina2@example.com')).toMatchObject({ username: 'marina_2' });
    expect(await setUserBanned(2, true)).toMatchObject({ isBanned: true });
    await expect(deleteUserAccount(2)).resolves.toBeUndefined();
    expect(await updateAvatar('turtle')).toMatchObject({ avatar: 'turtle' });
  });

  it('uses a fallback message when the users API omits one', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({}, false) as Response);

    await expect(listUsers()).rejects.toThrow('Could not load users');
    await expect(updateUserAccount(2, 'marina', 'marina@example.com')).rejects.toThrow('Could not update account');
    await expect(setUserBanned(2, true)).rejects.toThrow('Could not update ban status');
    await expect(updateAvatar('wave')).rejects.toThrow('Could not update avatar');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('bad json'); } } as Response);
    await expect(deleteUserAccount(2)).rejects.toThrow('Could not delete account');
  });

  it('reads the session, logs out, and reports auth failures', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ user }) as Response);
    expect(await getCurrentUser()).toEqual(user);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) } as Response);
    expect(await getCurrentUser()).toBeNull();

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'down' }, false, 500) as Response);
    await expect(getCurrentUser()).rejects.toThrow('down');

    fetchMock.mockResolvedValueOnce(jsonResponse({}, true, 204) as Response);
    await expect(logout()).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500) as Response);
    await expect(logout()).rejects.toThrow('Could not log out');

    fetchMock.mockResolvedValueOnce(jsonResponse({ user }) as Response);
    expect(await login('marina@example.com', 'Password123!')).toEqual({ user });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(login('marina@example.com', 'nope')).rejects.toThrow('Login failed');

    fetchMock.mockResolvedValueOnce(jsonResponse({ user }) as Response);
    expect(await register('marina', 'marina@example.com', 'Password123!')).toEqual({ user });
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'taken' }, false) as Response);
    await expect(register('marina', 'marina@example.com', 'Password123!')).rejects.toThrow('taken');

    fetchMock.mockResolvedValueOnce(jsonResponse({ user }) as Response);
    expect(await startGuest()).toEqual({ user });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(startGuest()).rejects.toThrow('Guest play failed');
  });

  it('loads and saves support tickets', async () => {
    const ticket = {
      ticketId: 7, subject: 'Table', message: 'Stuck', status: 'open',
      resolutionNote: null, createdAt: '2026-10-30T12:00:00Z', player: null,
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse([ticket]) as Response);
    expect(await listSupportTickets()).toEqual([ticket]);

    fetchMock.mockResolvedValueOnce(jsonResponse({ ...ticket, status: 'resolved' }) as Response);
    expect(await saveSupportTicket(7, 'resolved', 'Fixed')).toMatchObject({ status: 'resolved' });

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, false) as Response);
    await expect(listSupportTickets()).rejects.toThrow('nope');
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(saveSupportTicket(7, 'open', '')).rejects.toThrow('Could not load support tickets');
  });
});
