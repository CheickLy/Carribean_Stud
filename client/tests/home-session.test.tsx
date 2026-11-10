import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/pages/guest/Home';

it('shows the signed-in account and logout instead of login and register', () => {
  const onLogout = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><Home user={{ username: 'marina', balance: '500.00', isGuest: false, role: 'player' }} onLogout={onLogout} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Your profile' }).textContent).toBe('marina · 500 chips');
  expect(screen.queryByRole('button', { name: 'Log in' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Tables' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(onLogout).toHaveBeenCalledOnce();
});
