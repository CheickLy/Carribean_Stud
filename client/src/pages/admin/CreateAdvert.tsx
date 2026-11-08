
import { useState, type FormEvent } from 'react';
import { createAdvert, type CreateAdvertInput } from '../../services/adverts';
import AdvertList from './AdvertList';

export default function CreateAdvert() {
  const [form, setForm] = useState<CreateAdvertInput>({
    title: '',
    creative: '',
    destinationUrl: '',
    trigger: 'watch',
    chipReward: 10,
    eligibilityLimit: 1,
    startsAt: '',
    endsAt: '',
    isActive: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  function update<K extends keyof CreateAdvertInput>(
    field: K,
    value: CreateAdvertInput[K]
  ) {
    setForm(previous => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const advert = await createAdvert({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });

      setSuccess(`Advert #${advert.advertId} created successfully!`);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-advert-form">
      <h1>Create Advertisement</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="ad-title">Title</label>
        <input
          id="ad-title"
          required
          minLength={3}
          maxLength={150}
          value={form.title}
          onChange={e => update('title', e.target.value)}
        />

        <label htmlFor="ad-creative">Creative content</label>
        <textarea
          id="ad-creative"
          required
          maxLength={5000}
          value={form.creative}
          onChange={e => update('creative', e.target.value)}
        />

        <label htmlFor="ad-url">Destination URL (HTTPS)</label>
        <input
          id="ad-url"
          type="url"
          required
          pattern="https://.*"
          value={form.destinationUrl}
          onChange={e => update('destinationUrl', e.target.value)}
        />

        <label htmlFor="ad-trigger">Reward trigger</label>
        <select
          id="ad-trigger"
          value={form.trigger}
          onChange={e => update('trigger', e.target.value as 'watch' | 'click')}
        >
          <option value="watch">Watch</option>
          <option value="click">Click</option>
        </select>

        <label htmlFor="ad-reward">Chip reward</label>
        <input
          id="ad-reward"
          type="number"
          min={1}
          step={1}
          required
          value={form.chipReward}
          onChange={e => update('chipReward', Number(e.target.value))}
        />

        <label htmlFor="ad-limit">Eligibility limit</label>
        <input
          id="ad-limit"
          type="number"
          min={1}
          step={1}
          required
          value={form.eligibilityLimit}
          onChange={e => update('eligibilityLimit', Number(e.target.value))}
        />

        <label htmlFor="ad-start">Start date</label>
        <input
          id="ad-start"
          type="datetime-local"
          required
          value={form.startsAt}
          onChange={e => update('startsAt', e.target.value)}
        />

        <label htmlFor="ad-end">End date</label>
        <input
          id="ad-end"
          type="datetime-local"
          required
          value={form.endsAt}
          onChange={e => update('endsAt', e.target.value)}
        />

        <label>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => update('isActive', e.target.checked)}
          />
          Activate advertisement
        </label>

        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create Advert'}
        </button>
      </form>
      <AdvertList refreshKey={refreshKey} />
    </section>
  );
}
