import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdvert, deleteAdvert, listAdverts, updateAdvert, type CreateAdvertInput } from '../src/services/adverts';
import { claimClickAdvert, getClickAdvert } from '../src/services/clickAdvert';
import { dealTable, getGame, heartbeat, playAction, resetGame } from '../src/services/game';
import { getFriends, getPendingRequests, removeFriendship, respondToFriendRequest, sendFriendRequest } from '../src/services/friends';
import { getIncomingInvitations, respondToLobbyInvitation, sendLobbyInvitation } from '../src/services/invitations';
import { getConversation, sendMessage } from '../src/services/messages';
import { addBot, decide, leaveTable, loadHistory, placeAnte, removeBot, syncTable, TableRequestError, transferHost } from '../src/services/sharedGame';
import { listSupportTickets, saveSupportTicket, submitSupportTicket } from '../src/services/support';
import { readJson } from '../src/services/http';
import { completeWatchAdvert, exitWatchAdvert, startWatchAdvert } from '../src/services/watchAd';
import { selectLobbies, type BrowserLobby } from '../src/pages/lobbyBrowserControls';

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

const advert: CreateAdvertInput = {
  title: 'Reef', creative: 'Play', destinationUrl: 'https://example.com', videoUrl: 'https://example.com/v.mp4',
  requiredWatchSeconds: 5, trigger: 'watch', chipReward: 10, eligibilityLimit: 1,
  startsAt: '2026-01-01', endsAt: '2026-12-31', isActive: true,
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('client service clients', () => {
  it('reads empty, valid, and invalid response bodies', async () => {
    await expect(readJson({ text: async () => '   ', status: 204 } as Response)).resolves.toEqual({});
    await expect(readJson({ text: async () => '{"ok":true}', status: 200 } as Response)).resolves.toEqual({ ok: true });
    await expect(readJson({ text: async () => 'nope', status: 502 } as Response)).rejects.toThrow('Server returned invalid JSON (HTTP 502)');
  });

  it('creates, updates, lists, and deletes adverts', async () => {
    const fetchMock = vi.mocked(fetch);
    const saved = { ...advert, advertId: 4, createdAt: '2026-11-01' };
    fetchMock.mockResolvedValueOnce(jsonResponse(saved) as Response);
    expect(await createAdvert(advert)).toEqual(saved);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'duplicate' }, false) as Response);
    await expect(createAdvert(advert)).rejects.toThrow('duplicate');
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(createAdvert(advert)).rejects.toThrow('Could not create advert');

    fetchMock.mockResolvedValueOnce(jsonResponse(saved) as Response);
    expect(await updateAdvert(4, advert)).toEqual(saved);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(updateAdvert(4, advert)).rejects.toThrow('Could not update advert');

    fetchMock.mockResolvedValueOnce(jsonResponse({}, true, 204) as Response);
    await expect(deleteAdvert(4)).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'locked' }, false) as Response);
    await expect(deleteAdvert(4)).rejects.toThrow('locked');
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(deleteAdvert(4)).rejects.toThrow('Could not delete advert');

    fetchMock.mockResolvedValueOnce(jsonResponse([saved]) as Response);
    expect(await listAdverts()).toEqual([saved]);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503) as Response);
    await expect(listAdverts()).rejects.toThrow('Could not load adverts (503)');
  });

  it('loads and claims a click advert, including empty offers', async () => {
    const fetchMock = vi.mocked(fetch);
    const offer = { advert: { advertId: 2, title: 'Reef', creative: 'Go', destinationUrl: 'https://example.com', chipReward: 5 }, claimed: false };
    fetchMock.mockResolvedValueOnce(jsonResponse(offer) as Response);
    expect(await getClickAdvert()).toEqual(offer);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, true, 404) as Response);
    expect(await getClickAdvert()).toBeNull();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, true, 401) as Response);
    expect(await getClickAdvert()).toBeNull();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500) as Response);
    await expect(getClickAdvert()).rejects.toThrow('Could not load sponsored advert');

    fetchMock.mockResolvedValueOnce(jsonResponse({ destinationUrl: 'https://example.com', reward: 5, balance: '15.00', claimed: true }) as Response);
    expect(await claimClickAdvert(2)).toMatchObject({ reward: 5 });
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'gone' }, false) as Response);
    await expect(claimClickAdvert(2)).rejects.toThrow('gone');
  });

  it('reads and updates a solo table', async () => {
    const fetchMock = vi.mocked(fetch);
    const state = { balance: 100, round: null };
    fetchMock.mockResolvedValue(jsonResponse(state) as Response);
    expect(await getGame()).toEqual(state);
    expect(await dealTable(10)).toEqual(state);
    expect(await playAction('fold')).toEqual(state);
    expect(await resetGame()).toEqual(state);
    expect(await heartbeat('/lobbies')).toEqual(state);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(getGame()).rejects.toThrow('Could not update game.');
  });

  it('calls every friends and invitations endpoint', async () => {
    const fetchMock = vi.mocked(fetch);
    const friend = { friendshipId: 1, userId: 2, username: 'Kai' };
    fetchMock.mockResolvedValueOnce(jsonResponse([friend]) as Response);
    expect(await getFriends()).toEqual([friend]);
    fetchMock.mockResolvedValueOnce(jsonResponse([]) as Response);
    expect(await getPendingRequests()).toEqual([]);
    fetchMock.mockResolvedValueOnce(jsonResponse(friend) as Response);
    expect(await sendFriendRequest('Kai')).toEqual(friend);
    fetchMock.mockResolvedValueOnce(jsonResponse({ friendshipId: 1, status: 'accepted' }) as Response);
    expect(await respondToFriendRequest(1, 'accept')).toEqual({ friendshipId: 1, status: 'accepted' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Removed' }) as Response);
    expect(await removeFriendship(1)).toEqual({ message: 'Removed' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'busy' }, false) as Response);
    await expect(getFriends()).rejects.toThrow('busy');
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(sendFriendRequest('Kai')).rejects.toThrow('Error has occured');

    fetchMock.mockResolvedValueOnce(jsonResponse({ invitationId: 3 }) as Response);
    expect(await sendLobbyInvitation(9, 2)).toEqual({ invitationId: 3 });
    fetchMock.mockResolvedValueOnce(jsonResponse([]) as Response);
    expect(await getIncomingInvitations()).toEqual([]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'accepted' }) as Response);
    expect(await respondToLobbyInvitation(3, 'accept')).toEqual({ status: 'accepted' });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(getIncomingInvitations()).rejects.toThrow('Something went wrong.');
  });

  it('loads and sends friend messages', async () => {
    const fetchMock = vi.mocked(fetch);
    const message = { messageId: 1, senderId: 2, recipientId: 3, message: 'Hi', readAt: null, createdAt: '2026-11-01' };
    fetchMock.mockResolvedValueOnce(jsonResponse([message]) as Response);
    expect(await getConversation(3)).toEqual([message]);
    fetchMock.mockResolvedValueOnce(jsonResponse(message) as Response);
    expect(await sendMessage(3, 'Hi')).toEqual(message);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(getConversation(3)).rejects.toThrow('Message request failed.');
  });

  it('syncs a shared table and reports request failures', async () => {
    const fetchMock = vi.mocked(fetch);
    const table = { name: 'Lagoon' };
    fetchMock.mockResolvedValue(jsonResponse(table) as Response);
    expect(await syncTable('9')).toEqual(table);
    expect(await syncTable('9', true)).toEqual(table);
    expect(await placeAnte('9', 1, 10)).toEqual(table);
    expect(await decide('9', 1, 'raise')).toEqual(table);
    expect(await leaveTable('9', null)).toEqual(table);
    expect(await loadHistory('9')).toEqual(table);
    expect(await addBot('9', 'req')).toEqual(table);
    expect(await removeBot('9', 'seat')).toEqual(table);
    expect(await transferHost('9', 'seat')).toEqual(table);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Not your turn' }, false, 409) as Response);
    await expect(decide('9', 1, 'fold')).rejects.toBeInstanceOf(TableRequestError);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response);
    await expect(syncTable('9')).rejects.toThrow('Could not update the table.');
  });

  it('submits a support ticket and starts or skips a watch advert', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ticketId: 8, status: 'open', message: 'Sent' }) as Response);
    expect(await submitSupportTicket('Other', 'Stuck', 'me@example.com')).toMatchObject({ ticketId: 8 });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(submitSupportTicket('Other', 'Stuck', 'me@example.com')).rejects.toThrow('Could not load support tickets');
    fetchMock.mockResolvedValueOnce(jsonResponse([{ ticketId: 8 }]) as Response);
    expect(await listSupportTickets()).toEqual([{ ticketId: 8 }]);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ticketId: 8 }) as Response);
    expect(await saveSupportTicket(8, 'resolved', 'Done')).toEqual({ ticketId: 8 });

    const session = { sessionId: 's', advert: { ...advert, advertId: 1, createdAt: '2026-11-01' } };
    fetchMock.mockResolvedValueOnce(jsonResponse(session) as Response);
    expect(await startWatchAdvert()).toEqual(session);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, true, 404) as Response);
    expect(await startWatchAdvert()).toBeNull();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(startWatchAdvert()).rejects.toThrow('Could not start advertisement');
    fetchMock.mockResolvedValueOnce(jsonResponse({ reward: 10, balance: '20.00' }) as Response);
    expect(await completeWatchAdvert('s', true)).toEqual({ reward: 10, balance: '20.00' });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    await expect(completeWatchAdvert('s', false)).rejects.toThrow('Could not claim advertisement reward');
    fetchMock.mockResolvedValueOnce(jsonResponse({}) as Response);
    await expect(exitWatchAdvert('s')).resolves.toBeUndefined();
  });
});

describe('lobby browser sorting', () => {
  const rows: BrowserLobby[] = [
    { lobbyId: 1, name: 'A', maxPlayers: 4, maxBet: 20, botsEnabled: false, creator: 'Kai', createdAt: '2026-01-02', startingMoney: 100, minBet: 5, isPrivate: false, seatsAvailable: 0 },
    { lobbyId: 2, name: 'B', maxPlayers: 4, maxBet: 50, botsEnabled: true, creator: 'Ada', createdAt: '2026-01-01', startingMoney: 300, minBet: 15, isPrivate: true, seatsAvailable: 2 },
  ];

  it('filters privacy and open seats, then sorts each column', () => {
    expect(selectLobbies(rows, 'creator', 'asc', 'all', false).map(row => row.creator)).toEqual(['Ada', 'Kai']);
    expect(selectLobbies(rows, 'creator', 'desc', 'private', false).map(row => row.lobbyId)).toEqual([2]);
    expect(selectLobbies(rows, 'createdAt', 'asc', 'public', true)).toEqual([]);
    expect(selectLobbies(rows, 'createdAt', 'desc', 'all', true).map(row => row.lobbyId)).toEqual([2]);
    expect(selectLobbies(rows, 'startingMoney', 'asc', 'all', false).map(row => row.lobbyId)).toEqual([1, 2]);
    expect(selectLobbies(rows, 'minBet', 'desc', 'all', false).map(row => row.lobbyId)).toEqual([2, 1]);
    expect(selectLobbies(rows, 'name', 'asc', 'all', false).map(row => row.lobbyId)).toEqual([2, 1]);
  });
});
