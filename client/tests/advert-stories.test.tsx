import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateAdvert from '../src/pages/admin/CreateAdvert';
import AdvertList from '../src/pages/admin/AdvertList';
import WatchAdvertModal from '../src/components/WatchAdvertModal';
import SponsoredAdvertBanner from '../src/components/SponsoredAdvertBanner';
import { createAdvert, updateAdvert, deleteAdvert, listAdverts } from '../src/services/adverts';
import { completeWatchAdvert, exitWatchAdvert } from '../src/services/watchAd';
import { claimClickAdvert, getClickAdvert } from '../src/services/clickAdvert';

vi.mock('../src/services/adverts', () => ({ createAdvert: vi.fn(), updateAdvert: vi.fn(), deleteAdvert: vi.fn(), listAdverts: vi.fn() }));
vi.mock('../src/services/watchAd', () => ({ completeWatchAdvert: vi.fn(), exitWatchAdvert: vi.fn() }));
vi.mock('../src/services/clickAdvert', () => ({ claimClickAdvert: vi.fn(), getClickAdvert: vi.fn() }));

const advert = { advertId: 7, title: 'Sponsor', creative: 'Try this', destinationUrl: 'https://example.com', videoUrl: '', requiredWatchSeconds: 10, trigger: 'click' as const, chipReward: 25, eligibilityLimit: 1, startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z', isActive: true, createdAt: '2026-11-01T00:00:00.000Z' };

beforeEach(() => { vi.clearAllMocks(); vi.mocked(createAdvert).mockResolvedValue(advert); vi.mocked(updateAdvert).mockResolvedValue(advert); vi.mocked(deleteAdvert).mockResolvedValue(undefined); vi.mocked(listAdverts).mockResolvedValue([advert]); vi.mocked(exitWatchAdvert).mockResolvedValue(undefined); vi.mocked(getClickAdvert).mockResolvedValue({ advert, claimed: false }); });

it('S27 submits admin advert editing fields including video settings', async () => {
  render(<CreateAdvert />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited advert' } });
  fireEvent.change(screen.getByLabelText('Destination URL (HTTPS)'), { target: { value: 'https://example.com' } });
  fireEvent.change(screen.getByLabelText('Video source URL (HTTPS)'), { target: { value: 'https://cdn.example.com/ad.mp4' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-10' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-11' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Create Advert' }).closest('form')!);
  await waitFor(() => expect(createAdvert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Edited advert', videoUrl: 'https://cdn.example.com/ad.mp4', requiredWatchSeconds: 30 })));
});

it('S28 deletes an advertisement after confirmation', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<AdvertList refreshKey={0} onEdit={vi.fn()} />);
  await screen.findByText('Sponsor');
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(deleteAdvert).toHaveBeenCalledWith(7));
  expect(screen.queryByText('Sponsor')).toBeNull();
});

it('S29 exits a watch session without claiming a reward', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  const onClose = vi.fn();
  render(<WatchAdvertModal session={{ sessionId: 'session-1', advert: { ...advert, trigger: 'watch', videoUrl: 'https://cdn.example.com/ad.mp4' } }} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Exit Ad' }));
  await waitFor(() => expect(exitWatchAdvert).toHaveBeenCalledWith('session-1'));
  expect(completeWatchAdvert).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledWith();
});

it('S30 displays a sponsored offer and claims it once before opening the destination', async () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  vi.mocked(claimClickAdvert).mockResolvedValue({ destinationUrl: advert.destinationUrl, reward: 25, balance: '125.00', claimed: false });
  render(<SponsoredAdvertBanner />);
  expect(await screen.findByText('Sponsored')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Visit Sponsor' }));
  await waitFor(() => expect(claimClickAdvert).toHaveBeenCalledWith(7));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer'));
  expect(await screen.findByRole('button', { name: /Reward Claimed/ })).toBeTruthy();
  open.mockRestore();
});
