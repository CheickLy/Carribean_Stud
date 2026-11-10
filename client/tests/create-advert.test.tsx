import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateAdvert from '../src/pages/admin/CreateAdvert';
import { createAdvert } from '../src/services/adverts';

vi.mock('../src/services/adverts', () => ({ createAdvert: vi.fn() }));
vi.mock('../src/pages/admin/AdvertList', () => ({ default: () => null }));

beforeEach(() => vi.mocked(createAdvert).mockReset());

function fillDates(start: string, end: string) {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: end } });
  fireEvent.submit(screen.getByRole('button', { name: 'Create Advert' }).closest('form')!);
}

it('submits selected dates with default local times as UTC timestamps', async () => {
  vi.mocked(createAdvert).mockResolvedValue({ advertId: 1 });
  render(<CreateAdvert />);
  fillDates('2026-11-10', '2026-11-11');
  await waitFor(() => expect(createAdvert).toHaveBeenCalledWith(expect.objectContaining({
    startsAt: new Date('2026-11-10T00:00').toISOString(),
    endsAt: new Date('2026-11-11T23:59').toISOString(),
  })));
  expect(await screen.findByRole('status')).toBeTruthy();
});

it('explains reversed dates without sending an API request', async () => {
  render(<CreateAdvert />);
  fillDates('2026-11-11', '2026-11-10');
  expect(await screen.findByRole('alert')).toHaveProperty('textContent',
    'End date and time must be after start date and time.');
  expect(createAdvert).not.toHaveBeenCalled();
});
