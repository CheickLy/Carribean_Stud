
import { useEffect, useState } from 'react';
import { listAdverts, type Advert } from '../../services/adverts';

type Props = {
  refreshKey: number;
};

export default function AdvertList({ refreshKey }: Props) {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const data = await listAdverts();
        if (active) setAdverts(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Failed to load adverts'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const visibleAdverts = adverts.filter(advert => {
    if (filter === 'active') return advert.isActive;
    if (filter === 'inactive') return !advert.isActive;
    return true;
  });

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString();
  }

  return (
    <section className="admin-advert-list">
      <div className="admin-advert-list-header">
        <h2>Created Advertisements</h2>

        <select
          aria-label="Filter advertisements"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All adverts</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading && <p>Loading advertisements...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && visibleAdverts.length === 0 && (
        <p>No advertisements found.</p>
      )}

      {!loading && !error && visibleAdverts.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Trigger</th>
                <th>Reward</th>
                <th>Limit</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleAdverts.map(advert => (
                <tr key={advert.advertId}>
                  <td>
                    <strong>{advert.title}</strong>
                    <div>{advert.creative}</div>
                    <a
                      href={advert.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Destination
                    </a>
                  </td>
                  <td>{advert.trigger}</td>
                  <td>{advert.chipReward} chips</td>
                  <td>{advert.eligibilityLimit}</td>
                  <td>{formatDate(advert.startsAt)}</td>
                  <td>{formatDate(advert.endsAt)}</td>
                  <td>
                    <span className="admin-tag">
                      {advert.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
