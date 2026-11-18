
import { useState, type FormEvent } from 'react';
import { createAdvert, updateAdvert, type Advert, type CreateAdvertInput } from '../../services/adverts';
import AdvertList from './AdvertList';
import '../../styles/CreateAdvert.css';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

  function toLocalDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function beginEdit(advert: Advert) {
    setEditingId(advert.advertId);
    setForm({
      title: advert.title,
      creative: advert.creative,
      destinationUrl: advert.destinationUrl,
      trigger: advert.trigger,
      chipReward: advert.chipReward,
      eligibilityLimit: advert.eligibilityLimit,
      startsAt: toLocalDateTime(advert.startsAt).slice(0, 10),
      endsAt: toLocalDateTime(advert.endsAt).slice(0, 10),
      isActive: advert.isActive,
    });
    setStartTime(toLocalDateTime(advert.startsAt).slice(11, 16) || '00:00');
    setEndTime(toLocalDateTime(advert.endsAt).slice(11, 16) || '23:59');
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ title: '', creative: '', destinationUrl: '', trigger: 'watch', chipReward: 10, eligibilityLimit: 1, startsAt: '', endsAt: '', isActive: false });
  }

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
      const start = new Date(`${form.startsAt}T${startTime}`);
      const end = new Date(`${form.endsAt}T${endTime}`);
      if (!form.startsAt || !form.endsAt || !startTime || !endTime ||
          Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Enter a complete start and end date and time.');
      }
      if (end <= start) {
        throw new Error('End date and time must be after start date and time.');
      }
      const input = {
        ...form,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      };
      const advert = editingId === null
        ? await createAdvert(input)
        : await updateAdvert(editingId, input);

      setSuccess(`Advert #${advert.advertId} ${editingId === null ? 'created' : 'updated'} successfully!`);
      setEditingId(null);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-advert-form">
      <div className="admin-advert-heading">
        <div>
          <p className="admin-eyebrow">Campaigns</p>
          <h1>{editingId === null ? 'Create Advertisement' : 'Edit Advertisement'}</h1>
          <p>{editingId === null ? 'Set up the content, reward, and schedule for a new player offer.' : 'Update the offer details or deactivate this advertisement.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="admin-advert-card">
          <div className="admin-advert-card-heading">
            <div>
              <h2>Content</h2>
              <p>Give players a clear reason to engage with the offer.</p>
            </div>
            <span>01</span>
          </div>

          <div className="admin-advert-field">
            <label htmlFor="ad-title">Title</label>
            <input id="ad-title" required minLength={3} maxLength={150} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Double chips weekend" />
          </div>

          <div className="admin-advert-field">
            <label htmlFor="ad-creative">Creative content</label>
            <textarea id="ad-creative" required maxLength={5000} value={form.creative} onChange={e => update('creative', e.target.value)} placeholder="Describe the offer players will see" rows={5} />
          </div>

          <div className="admin-advert-field">
            <label htmlFor="ad-url">Destination URL <span>(HTTPS)</span></label>
            <input id="ad-url" type="url" required pattern="https://.*" value={form.destinationUrl} onChange={e => update('destinationUrl', e.target.value)} placeholder="https://example.com/offer" />
          </div>
        </div>

        <div className="admin-advert-card">
          <div className="admin-advert-card-heading">
            <div>
              <h2>Reward rules</h2>
              <p>Choose how players qualify and what they receive.</p>
            </div>
            <span>02</span>
          </div>

          <div className="admin-advert-grid">
            <div className="admin-advert-field">
              <label htmlFor="ad-trigger">Reward trigger</label>
              <select id="ad-trigger" value={form.trigger} onChange={e => update('trigger', e.target.value as 'watch' | 'click')}>
                <option value="watch">Watch advertisement</option>
                <option value="click">Click destination</option>
              </select>
            </div>
            <div className="admin-advert-field">
              <label htmlFor="ad-reward">Chip reward</label>
              <input id="ad-reward" type="number" min={1} step={1} required value={form.chipReward} onChange={e => update('chipReward', Number(e.target.value))} />
            </div>
            <div className="admin-advert-field">
              <label htmlFor="ad-limit">Eligibility limit</label>
              <input id="ad-limit" type="number" min={1} step={1} required value={form.eligibilityLimit} onChange={e => update('eligibilityLimit', Number(e.target.value))} />
              <small>Maximum rewards per player.</small>
            </div>
          </div>
        </div>

        <div className="admin-advert-card">
          <div className="admin-advert-card-heading">
            <div>
              <h2>Schedule</h2>
              <p>Control when this advertisement can be shown.</p>
            </div>
            <span>03</span>
          </div>

          <div className="admin-advert-grid">
            <div className="admin-advert-field">
              <label htmlFor="ad-start">Start date</label>
              <input
                id="ad-start"
                type="date"
                required
                value={form.startsAt}
                onChange={e => update('startsAt', e.target.value)}
              />
              <label htmlFor="ad-start-time">Start time (local time)</label>
              <input id="ad-start-time" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>

            <div className="admin-advert-field">
              <label htmlFor="ad-end">End date</label>
              <input
                id="ad-end"
                type="date"
                required
                value={form.endsAt}
                onChange={e => update('endsAt', e.target.value)}
              />
              <label htmlFor="ad-end-time">End time (local time)</label>
              <input id="ad-end-time" type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <label className="admin-advert-toggle">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => update('isActive', e.target.checked)}
            />
            <span>
              <strong>Activate advertisement</strong>
              <small>
                Make this offer available as soon as its schedule begins.
              </small>
            </span>
          </label>
        </div>

        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}

        <div className="admin-advert-actions">
          <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : editingId === null ? 'Create Advert' : 'Save Changes'}
          </button>
          {editingId !== null && <button type="button" className="admin-advert-cancel" onClick={cancelEdit} disabled={saving}>Cancel</button>}
        </div>
      </form>
      <AdvertList refreshKey={refreshKey} onEdit={beginEdit} />
    </section>
  );
}
