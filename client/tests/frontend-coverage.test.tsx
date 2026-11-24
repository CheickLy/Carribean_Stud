import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginSection from '../src/components/LoginSection';
import PasswordInput from '../src/components/PasswordInput';
import CreateLobby from '../src/pages/CreateLobby';
import InviteFriends from '../src/pages/InviteFriends';
import ForgotPassword from '../src/pages/ForgotPassword';
import ResetPassword from '../src/pages/ResetPassword';
import LobbyRoom from '../src/pages/LobbyRoom';
import Avatar from '../src/pages/player/Avatar';
import Friends from '../src/pages/player/Friends';
import Messages from '../src/pages/player/Messages';
import Profile, { ProfileComingSoon } from '../src/pages/player/Profile';

const navigate = vi.fn();
const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn(), logout: vi.fn(), login: vi.fn(), register: vi.fn(), startGuest: vi.fn() }));
const friendsApi = vi.hoisted(() => ({ getFriends: vi.fn(), getPendingRequests: vi.fn(), sendFriendRequest: vi.fn(), respondToFriendRequest: vi.fn(), removeFriendship: vi.fn() }));
const invitations = vi.hoisted(() => ({ getIncomingInvitations: vi.fn(), respondToLobbyInvitation: vi.fn(), sendLobbyInvitation: vi.fn() }));
const messagesApi = vi.hoisted(() => ({ getConversation: vi.fn(), sendMessage: vi.fn() }));
const usersApi = vi.hoisted(() => ({ updateAvatar: vi.fn() }));
const watchAd = vi.hoisted(() => ({ startWatchAdvert: vi.fn(), completeWatchAdvert: vi.fn(), exitWatchAdvert: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal<typeof import('react-router-dom')>();
  return { ...real, useNavigate: () => navigate };
});
vi.mock('../src/services/auth', () => auth);
vi.mock('../src/services/friends', () => friendsApi);
vi.mock('../src/services/invitations', () => invitations);
vi.mock('../src/services/messages', () => messagesApi);
vi.mock('../src/services/users', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/services/users')>();
  return { ...real, updateAvatar: usersApi.updateAvatar };
});
vi.mock('../src/services/watchAd', () => watchAd);
vi.mock('../src/components/WatchAdvertModal', () => ({
  default: ({ onClose }: { onClose: (result?: { balance: string; reward: number }) => void }) => (
    <div>
      <button type="button" onClick={() => onClose({ balance: '12.00', reward: 5 })}>Finish ad</button>
      <button type="button" onClick={() => onClose()}>Close ad</button>
    </div>
  ),
}));

const player = { userId: 4, username: 'Marina', balance: '500.00', avatar: 'turtle', isGuest: false, role: 'player' };
const friend = { friendshipId: 7, userId: 2, username: 'Kai' };
const request = { friendshipId: 8, senderId: 3, senderUsername: 'Ada', status: 'pending' };
const invitation = {
  invitationId: 3, lobbyId: 9, senderId: 3, recipientId: 4, status: 'pending' as const, createdAt: '2026-11-01',
  lobby: { lobbyId: 9, name: 'Lagoon', isPrivate: false, maxPlayers: 4 },
  sender: { userId: 3, username: 'Ada' },
};

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return { ok, status, text: async () => JSON.stringify(body), json: async () => body };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue(player);
  friendsApi.getFriends.mockResolvedValue([friend]);
  friendsApi.getPendingRequests.mockResolvedValue([request]);
  invitations.getIncomingInvitations.mockResolvedValue([invitation]);
  invitations.sendLobbyInvitation.mockResolvedValue({ invitationId: 3 });
  messagesApi.getConversation.mockResolvedValue([]);
  messagesApi.sendMessage.mockResolvedValue({ messageId: 1, senderId: 4, recipientId: 2, message: 'Hello', readAt: null, createdAt: '2026-11-23T12:00:00Z' });
  usersApi.updateAvatar.mockResolvedValue({ user: { ...player, avatar: 'shark' } });
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('confirm', vi.fn(() => true));
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

function renderAt(path: string, element: ReactNode, pattern = '*') {
  cleanup();
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path={pattern} element={element} /></Routes></MemoryRouter>);
}

describe('sign-in details', () => {
  it('toggles the password and reports a bad login or guest start', async () => {
    render(<PasswordInput fieldLabel="password" id="pw" aria-label="Secret" value="secret" onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Secret')).toHaveProperty('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Secret')).toHaveProperty('type', 'password');

    auth.login.mockRejectedValueOnce(new Error('Invalid email or password'));
    render(<MemoryRouter><LoginSection onRegisterClick={() => undefined} onAuthenticated={() => undefined} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'marina@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Invalid email or password');
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'other@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'again' } });
    expect(screen.queryByRole('alert')).toBeNull();

    auth.login.mockRejectedValueOnce('down');
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Login failed');
    auth.startGuest.mockRejectedValueOnce('down');
    fireEvent.click(screen.getByRole('button', { name: 'Play as guest' }));
    expect(await screen.findByText('Guest play failed')).toBeTruthy();
  });
});

describe('create lobby', () => {
  function show() {
    render(<MemoryRouter><CreateLobby /></MemoryRouter>);
    return document.getElementById('reef-create-form') as HTMLFormElement;
  }

  it('rejects invalid names, passwords, bets, and increase settings', () => {
    const form = show();
    fireEvent.change(screen.getByLabelText('Lobby name'), { target: { value: 'ab' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe('Lobby name must be between 3 and 40 characters.');

    fireEvent.change(screen.getByLabelText('Lobby name'), { target: { value: 'Lagoon Table' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Private/ }));
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe('Please enter a password for your private lobby.');

    fireEvent.change(screen.getByLabelText('Lobby password'), { target: { value: 'secret' } });
    fireEvent.change(screen.getByLabelText('Minimum bet'), { target: { value: '0' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe('Check your minimum bet, maximum bet, and starting balance.');

    fireEvent.change(screen.getByLabelText('Minimum bet'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Maximum bet'), { target: { value: '5' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toMatch(/minimum bet/);

    fireEvent.change(screen.getByLabelText('Maximum bet'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Starting balance'), { target: { value: '1.5' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toMatch(/starting balance/);

    fireEvent.change(screen.getByLabelText('Starting balance'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Automatic bet increases/ }));
    fireEvent.change(screen.getByLabelText('Increase by'), { target: { value: '0' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe('Automatic increases must use positive whole numbers.');
  });

  it('shows server failures and navigates when the table is created', async () => {
    const form = show();
    fireEvent.change(screen.getByLabelText('Lobby name'), { target: { value: 'Lagoon Table' } });
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Allow bots/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Automatic bet increases/ }));
    fireEvent.change(screen.getByLabelText('Increase by'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Every'), { target: { value: '3' } });
    expect(screen.getByText('+15 pts every 3 hands')).toBeTruthy();
    expect(screen.getByText('Bots on', { exact: false })).toBeTruthy();

    const fetchMock = vi.mocked(fetch);
    let release!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
    fireEvent.submit(form);
    expect(await screen.findByRole('button', { name: /Creating your table/ })).toBeTruthy();
    fireEvent.submit(form);
    release(jsonResponse({ error: 'Name taken' }, false) as Response);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Name taken');

    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: ['Too many tables.'] }, false) as Response);
    fireEvent.submit(form);
    expect(await screen.findByText('Too many tables.')).toBeTruthy();

    fetchMock.mockResolvedValueOnce(jsonResponse({}, false) as Response);
    fireEvent.submit(form);
    expect(await screen.findByText('Unable to create your table.')).toBeTruthy();

    fetchMock.mockResolvedValueOnce(jsonResponse({ lobbyId: 0 }) as Response);
    fireEvent.submit(form);
    expect(await screen.findByText('Table created, but the server did not return a valid lobby ID.')).toBeTruthy();

    fetchMock.mockRejectedValueOnce('offline');
    fireEvent.submit(form);
    expect(await screen.findByText('Something went wrong while creating your table.')).toBeTruthy();

    fetchMock.mockResolvedValueOnce(jsonResponse({ lobbyId: 12 }) as Response);
    fireEvent.click(screen.getByRole('button', { name: /Public/ }));
    fireEvent.submit(form);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies/12', { state: { created: true } }));
  });
});

describe('invite friends', () => {
  function show(path = '/invite/12') {
    renderAt(path, <InviteFriends />, '/invite/:lobbyId');
  }

  it('sends an invitation and records the failure cases', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Invitation sent to Kai!')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Invited' })).toHaveProperty('disabled', true);

    invitations.sendLobbyInvitation.mockRejectedValueOnce(new Error('Already invited'));
    friendsApi.getFriends.mockResolvedValueOnce([friend, { ...friend, friendshipId: 8, userId: 5, username: 'Noa' }]);
    show();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Invite' }))[0]);
    expect(await screen.findByText('Already invited')).toBeTruthy();

    invitations.sendLobbyInvitation.mockRejectedValueOnce('nope');
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Failed to send invitation.')).toBeTruthy();

    show('/invite/nope');
    fireEvent.click(await screen.findByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Invalid table ID.')).toBeTruthy();

    friendsApi.getFriends.mockRejectedValueOnce(new Error('offline'));
    show();
    expect(await screen.findByText('offline')).toBeTruthy();
    friendsApi.getFriends.mockRejectedValueOnce('offline');
    show();
    expect(await screen.findByText('Failed to load friends.')).toBeTruthy();
    friendsApi.getFriends.mockResolvedValueOnce([]);
    show();
    expect(await screen.findByText(/haven't added any friends/)).toBeTruthy();
  });
});

describe('password reset pages', () => {
  it('requests a reset link and shows the server message', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Check your email.', resetPath: '/reset-password?token=abc' }) as Response);
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'marina@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Request reset link' }).closest('form')!);
    expect(await screen.findByText('Check your email.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open development reset link/ })).toHaveProperty('pathname', '/reset-password');

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unknown email' }) as Response);
    fireEvent.submit(screen.getByRole('button', { name: 'Request reset link' }).closest('form')!);
    expect(await screen.findByText('Unknown email')).toBeTruthy();
  });

  it('blocks a mismatched password and saves a matching one', async () => {
    render(<MemoryRouter initialEntries={['/reset-password?token=abc']}><ResetPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form')!);
    expect(screen.getByRole('status').textContent).toBe('Passwords do not match.');

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}) as Response);
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form')!);
    expect(await screen.findByText('Request finished.')).toBeTruthy();
  });
});

describe('avatar picker', () => {
  it('saves a preset, rejects a bad file, and accepts an uploaded image', async () => {
    render(<MemoryRouter><Avatar /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Sea Turtle' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Shark/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }));
    expect(await screen.findByText('Avatar saved successfully.')).toBeTruthy();
    expect(usersApi.updateAvatar).toHaveBeenCalledWith('shark');

    usersApi.updateAvatar.mockRejectedValueOnce(new Error('Save failed'));
    fireEvent.click(screen.getByRole('radio', { name: /Whale/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }));
    expect(await screen.findByText('Save failed')).toBeTruthy();
    usersApi.updateAvatar.mockRejectedValueOnce('nope');
    fireEvent.click(screen.getByRole('radio', { name: /Crab/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }));
    expect(await screen.findByText('Could not save avatar.')).toBeTruthy();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    fireEvent.change(input, { target: { files: [new File(['x'], 'note.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('status').textContent).toMatch(/under 100 KB/);
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(100_001)], 'big.png', { type: 'image/png' })] } });
    expect(screen.getByRole('status').textContent).toMatch(/under 100 KB/);

    class Reader {
      result: string | ArrayBuffer | null = 'data:image/png;base64,abc';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() { this.onload?.(); }
    }
    vi.stubGlobal('FileReader', Reader);
    fireEvent.change(input, { target: { files: [new File(['img'], 'me.png', { type: 'image/png' })] } });
    expect(await screen.findByRole('heading', { name: 'Your image' })).toBeTruthy();
    Reader.prototype.readAsDataURL = function fail() { this.onerror?.(); };
    fireEvent.change(input, { target: { files: [new File(['img'], 'me.png', { type: 'image/png' })] } });
    expect(screen.getByRole('status').textContent).toBe('Could not read that image.');

    fireEvent.click(screen.getByRole('button', { name: 'Back to Profile' }));
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('sends an unknown visitor home and shows a load error', async () => {
    auth.getCurrentUser.mockResolvedValueOnce(null);
    render(<MemoryRouter><Avatar /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));

    auth.getCurrentUser.mockResolvedValueOnce({ ...player, avatar: 'data:image/png;base64,abc' });
    render(<MemoryRouter><Avatar /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Your image' })).toBeTruthy();

    auth.getCurrentUser.mockResolvedValueOnce({ ...player, avatar: 'missing' });
    render(<MemoryRouter><Avatar /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Ocean Wave' })).toBeTruthy();

    auth.getCurrentUser.mockRejectedValueOnce(new Error('Profile down'));
    render(<MemoryRouter><Avatar /></MemoryRouter>);
    expect(await screen.findByText('Profile down')).toBeTruthy();
    auth.getCurrentUser.mockRejectedValueOnce('down');
    render(<MemoryRouter><Avatar /></MemoryRouter>);
    expect(await screen.findByText('Could not load profile.')).toBeTruthy();
  });
});

describe('friends page', () => {
  function show() {
    cleanup();
    render(<MemoryRouter><Friends /></MemoryRouter>);
  }

  it('adds, accepts, rejects, and opens a chat', async () => {
    show();
    expect((await screen.findAllByText('Ada')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Noa' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Request' }).closest('form')!);
    expect(await screen.findByText('Friend request sent successfully!')).toBeTruthy();
    expect(friendsApi.sendFriendRequest).toHaveBeenCalledWith('Noa');

    friendsApi.sendFriendRequest.mockRejectedValueOnce(new Error('No such player'));
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Ghost' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Request' }).closest('form')!);
    expect(await screen.findByText('No such player')).toBeTruthy();
    friendsApi.sendFriendRequest.mockRejectedValueOnce('nope');
    fireEvent.submit(screen.getByRole('button', { name: 'Send Request' }).closest('form')!);
    expect(await screen.findByText('Failed to send request.')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
    expect(await screen.findByText('Friend request accepted!')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0]);
    expect(await screen.findByText('Friend request rejected.')).toBeTruthy();
    friendsApi.respondToFriendRequest.mockRejectedValueOnce('nope');
    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]);
    expect(await screen.findByText('Failed to update request.')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[1]);
    expect(await screen.findByText("Table invitation accepted! You've joined the table.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(await screen.findByText('Table invitation declined.')).toBeTruthy();
    invitations.respondToLobbyInvitation.mockRejectedValueOnce(new Error('Full table'));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(await screen.findByText('Full table')).toBeTruthy();
    invitations.respondToLobbyInvitation.mockRejectedValueOnce('nope');
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(await screen.findByText('Failed to respond to table invitation.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }));
    expect(navigate).toHaveBeenCalledWith('/friends/2/messages?name=Kai');
  });

  it('shows a load error and the empty lists', async () => {
    friendsApi.getFriends.mockRejectedValueOnce(new Error('offline'));
    show();
    expect(await screen.findByText('offline')).toBeTruthy();
    friendsApi.getFriends.mockRejectedValueOnce('offline');
    show();
    expect(await screen.findByText('Failed to load friends.')).toBeTruthy();
    friendsApi.getFriends.mockResolvedValueOnce([]);
    friendsApi.getPendingRequests.mockResolvedValueOnce([]);
    invitations.getIncomingInvitations.mockResolvedValueOnce([]);
    show();
    expect(await screen.findByText('No pending friend requests.')).toBeTruthy();
    expect(screen.getByText('No pending table invitations.')).toBeTruthy();
    expect(screen.getByText(/haven't added any friends/)).toBeTruthy();
  });
});

describe('messages', () => {
  function show() {
    renderAt('/friends/2/messages?name=Kai', <Messages />, '/friends/:friendId/messages');
  }

  it('shows the thread, sends a message, and reports failures', async () => {
    messagesApi.getConversation.mockResolvedValueOnce([
      { messageId: 1, senderId: 4, recipientId: 2, message: 'Mine', readAt: null, createdAt: '2026-11-23T12:00:00Z' },
      { messageId: 2, senderId: 2, recipientId: 4, message: 'Yours', readAt: null, createdAt: '2026-11-23T12:01:00Z' },
    ]);
    show();
    expect(await screen.findByText('Mine')).toBeTruthy();
    expect(screen.getByText('Yours')).toBeTruthy();
    expect(screen.getByText('Kai')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Write a message'), { target: { value: 'Hello' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!);
    await waitFor(() => expect(messagesApi.sendMessage).toHaveBeenCalledWith(2, 'Hello'));

    messagesApi.sendMessage.mockRejectedValueOnce(new Error('Too long'));
    fireEvent.change(screen.getByLabelText('Write a message'), { target: { value: 'Again' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!);
    expect(await screen.findByText('Too long')).toBeTruthy();
    messagesApi.sendMessage.mockRejectedValueOnce('nope');
    fireEvent.submit(screen.getByRole('button', { name: 'Send' }).closest('form')!);
    expect(await screen.findByText('Could not send message.')).toBeTruthy();

    messagesApi.getConversation.mockRejectedValueOnce(new Error('Missing'));
    show();
    expect(await screen.findByText('Missing')).toBeTruthy();
    messagesApi.getConversation.mockRejectedValueOnce('nope');
    show();
    expect(await screen.findByText('Could not load messages.')).toBeTruthy();
    show();
    expect(await screen.findByRole('heading', { name: 'Start the conversation' })).toBeTruthy();
  });
});

describe('profile', () => {
  it('shows the account, watches an advert, and opens the record pages', async () => {
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Marina' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Tables' }));
    fireEvent.click(screen.getByRole('button', { name: /Change Avatar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Statistics/ }));
    fireEvent.click(screen.getByRole('button', { name: /Game History/ }));
    expect(navigate).toHaveBeenCalledWith('/lobbies');
    expect(navigate).toHaveBeenCalledWith('/profile/avatar');

    watchAd.startWatchAdvert.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole('button', { name: 'Watch AD' }));
    expect(await screen.findByText('No eligible advertisements are available right now.')).toBeTruthy();
    watchAd.startWatchAdvert.mockRejectedValueOnce(new Error('Ads down'));
    fireEvent.click(screen.getByRole('button', { name: 'Watch AD' }));
    expect(await screen.findByText('Ads down')).toBeTruthy();
    watchAd.startWatchAdvert.mockRejectedValueOnce('nope');
    fireEvent.click(screen.getByRole('button', { name: 'Watch AD' }));
    expect(await screen.findByText('Could not start advertisement.')).toBeTruthy();
    watchAd.startWatchAdvert.mockResolvedValueOnce({ sessionId: 's', advert: { title: 'Reef', chipReward: 5, videoUrl: 'v', requiredWatchSeconds: 5 } });
    fireEvent.click(screen.getByRole('button', { name: 'Watch AD' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish ad' }));
    expect(await screen.findByText('Advertisement completed! You earned 5 CHIPS.')).toBeTruthy();
    expect(screen.getByText('12.00 CHIPS')).toBeTruthy();
    watchAd.startWatchAdvert.mockResolvedValueOnce({ sessionId: 's2', advert: { title: 'Reef', chipReward: 5, videoUrl: 'v', requiredWatchSeconds: 5 } });
    fireEvent.click(screen.getByRole('button', { name: 'Watch AD' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close ad' }));
    expect(screen.queryByRole('button', { name: 'Close ad' })).toBeNull();
  });

  it('redirects guests and shows image or unreadable balances', async () => {
    cleanup();
    auth.getCurrentUser.mockResolvedValueOnce({ ...player, isGuest: true });
    render(<MemoryRouter><Profile /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));

    cleanup();
    auth.getCurrentUser.mockResolvedValueOnce({ ...player, avatar: 'data:image/png;base64,abc', balance: 'n/a' });
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(await screen.findByText('n/a CHIPS')).toBeTruthy();

    cleanup();
    auth.getCurrentUser.mockRejectedValueOnce(new Error('Profile down'));
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Profile down');
    cleanup();
    auth.getCurrentUser.mockRejectedValueOnce('down');
    render(<MemoryRouter><Profile /></MemoryRouter>);
    expect(await screen.findByText('Could not load profile.')).toBeTruthy();
  });

  it('renders sample statistics and history for a signed-in player', async () => {
    render(<MemoryRouter><ProfileComingSoon title="Statistics" /></MemoryRouter>);
    expect(await screen.findByText('Win rate')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Game History' }));
    fireEvent.click(screen.getByRole('button', { name: /View all history/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Profile' }));
    expect(navigate).toHaveBeenCalledWith('/profile/history');
    expect(navigate).toHaveBeenCalledWith('/profile');

    cleanup();
    render(<MemoryRouter><ProfileComingSoon title="Game History" /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Hand history' })).toBeTruthy();
    expect(screen.getAllByText('Palm Social').length).toBeGreaterThan(0);

    cleanup();
    auth.getCurrentUser.mockResolvedValueOnce(null);
    render(<MemoryRouter><ProfileComingSoon title="Statistics" /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
    cleanup();
    auth.getCurrentUser.mockRejectedValueOnce(new Error('down'));
    render(<MemoryRouter><ProfileComingSoon title="Statistics" /></MemoryRouter>);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });
});

describe('lobby room', () => {
  const room = {
    lobbyId: 9, name: 'Lagoon', isPrivate: true, isHost: true, waitingForNextHand: true, handInProgress: false,
    maxPlayers: 4, seatsAvailable: 2, startingMoney: '200', minBet: '10', maxBet: '50', botsEnabled: true,
    players: [{ userId: 4, username: 'Marina', isHost: true, waitingForNextHand: false }, { userId: 2, username: 'Kai', isHost: false, waitingForNextHand: true }],
  };

  function show(state?: object) {
    cleanup();
    render(<MemoryRouter initialEntries={[{ pathname: '/lobbies/9', state }]}><Routes><Route path="/lobbies/:lobbyId" element={<LobbyRoom />} /></Routes></MemoryRouter>);
  }

  it('shows the table, invites a friend, and reports load problems', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(room) as Response);
    show({ created: true });
    expect(await screen.findByRole('heading', { name: 'Lagoon' })).toBeTruthy();
    expect(screen.getByText(/Table created/)).toBeTruthy();
    expect(screen.getByText('Waiting for next hand')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Invite friends/ }));
    expect(await screen.findByRole('button', { name: 'Seated' })).toBeTruthy();
    friendsApi.getFriends.mockResolvedValueOnce([friend, { friendshipId: 11, userId: 6, username: 'Noa' }]);
    fireEvent.click(screen.getByRole('button', { name: /Invite friends/ }));
    expect(await screen.findByText('Noa')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Invitation sent to Noa.')).toBeTruthy();

    friendsApi.getFriends.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: /Invite friends/ }));
    expect(await screen.findByText(/No friends yet/)).toBeTruthy();
    friendsApi.getFriends.mockRejectedValueOnce('down');
    fireEvent.click(screen.getByRole('button', { name: /Invite friends/ }));
    expect(await screen.findByText('Unable to load friends.')).toBeTruthy();

    invitations.sendLobbyInvitation.mockRejectedValueOnce('nope');
    friendsApi.getFriends.mockResolvedValueOnce([{ friendshipId: 12, userId: 8, username: 'Bea' }]);
    fireEvent.click(screen.getByRole('button', { name: /Invite friends/ }));
    expect(await screen.findByText('Bea')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Unable to send invitation.')).toBeTruthy();

    invitations.sendLobbyInvitation.mockRejectedValueOnce(new Error('Full'));
    friendsApi.getFriends.mockResolvedValueOnce([{ friendshipId: 13, userId: 9, username: 'Cleo' }]);
    fireEvent.click(screen.getByRole('button', { name: /Invite friends/ }));
    expect(await screen.findByText('Cleo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(await screen.findByText('Full')).toBeTruthy();

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 404) as Response);
    show();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/lobbies', { replace: true }));
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 500) as Response);
    show();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Unable to load your table.');
    vi.mocked(fetch).mockRejectedValueOnce('down');
    show();
    expect(await screen.findByText('Unable to load your table.')).toBeTruthy();
  });
});
