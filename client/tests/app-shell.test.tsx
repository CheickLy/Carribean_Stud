import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  startGuest: vi.fn(),
}));
vi.mock('../src/services/auth', () => auth);

const player = { userId: 1, username: 'Marina', balance: '1500', isGuest: false, role: 'player', avatar: 'wave' };

beforeEach(() => {
  vi.clearAllMocks();
  auth.getCurrentUser.mockResolvedValue(player);
  auth.logout.mockResolvedValue(undefined);
  auth.login.mockResolvedValue({ user: { role: 'player' } });
  auth.register.mockResolvedValue({ user: { role: 'player' } });
  auth.startGuest.mockResolvedValue({ user: { role: 'player', isGuest: true } });
  const NativeRequest = Request;
  vi.stubGlobal('Request', class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, { ...init, signal: undefined });
    }
  });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('/adverts/')) return { ok: false, status: 404, text: async () => '{}', json: async () => ({}) };
    return { ok: true, status: 200, text: async () => '[]', json: async () => [] };
  }));
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

async function show(path: string) {
  cleanup();
  window.history.pushState({}, '', path);
  vi.resetModules();
  const { default: App } = await import('../src/App');
  render(<App />);
}

describe('app shell', () => {
  it('shows the signed-in header, updates the balance, and logs out', async () => {
    await show('/');
    expect(await screen.findByText('Marina')).toBeTruthy();
    window.dispatchEvent(new CustomEvent('reef-balance-updated', { detail: 12 }));
    window.dispatchEvent(new CustomEvent('reef-balance-updated', { detail: '42' }));
    expect(await screen.findByText('42 pts')).toBeTruthy();
    Object.defineProperty(window, 'scrollY', { value: 40, configurable: true });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeTruthy();

    auth.logout.mockRejectedValueOnce('down');
    auth.getCurrentUser.mockResolvedValueOnce(player);
    await show('/');
    await screen.findByText('Marina');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Could not log out');
    auth.logout.mockRejectedValueOnce(new Error('Session ended'));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Session ended');
  });

  it('shows a guest menu and a session error', async () => {
    auth.getCurrentUser.mockResolvedValue({ ...player, isGuest: true, username: 'guest_1', role: 'player' });
    await show('/rules');
    expect(await screen.findByText('Guest')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Save progress' })).toBeTruthy();

    auth.getCurrentUser.mockRejectedValue(new Error('Session down'));
    await show('/rules');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Session down');
    auth.getCurrentUser.mockRejectedValue('down');
    await show('/rules');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Could not load session');
  });

  it('sends each login result to the right page', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    await show('/login');
    fireEvent.click(await screen.findByRole('button', { name: 'Create an account' }));
    expect(await screen.findByRole('heading', { name: 'Create your account.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    auth.login.mockResolvedValueOnce({ user: { role: 'admin' } });
    auth.getCurrentUser.mockResolvedValue({ ...player, role: 'admin' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeTruthy();

    auth.getCurrentUser.mockResolvedValue(null);
    await show('/login');
    fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: 'marina@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    auth.login.mockResolvedValueOnce({ user: { role: 'player' } });
    auth.getCurrentUser.mockRejectedValue(new Error('late'));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Tables' })).toBeTruthy();

    auth.getCurrentUser.mockResolvedValue(null);
    await show('/friends');
    expect(await screen.findByLabelText('Email address')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'marina@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    auth.login.mockResolvedValueOnce({ user: { role: ' player ' } });
    auth.getCurrentUser.mockResolvedValue(player);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Find your crew.' })).toBeTruthy();
  });

  it('registers a player and shows the unknown-page screen', async () => {
    auth.getCurrentUser.mockResolvedValue(null);
    await show('/register');
    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'newplayer' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Password123!' } });
    auth.getCurrentUser.mockResolvedValue(player);
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByRole('heading', { name: 'Tables' })).toBeTruthy();

    auth.getCurrentUser.mockResolvedValue(null);
    await show('/missing-page');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy();
  });
});
