import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles/SpectateTable.css';

type View = { name: string; roundNumber: number; phase: string; deadline: number | null; dealer: string[]; seats: { name: string; bot: boolean; status: string; ante: number; net: number | null }[] };

export default function SpectateTable() {
  const { lobbyId = '' } = useParams();
  const [view, setView] = useState<View | null>(null);
  const [passcode, setPasscode] = useState('');
  const [savedPasscode, setSavedPasscode] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`/api/lobbies/${lobbyId}/game/spectate`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(savedPasscode ? { passcode: savedPasscode } : {}) });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 403 && data.error?.includes('password')) {
            if (active) { setNeedsPassword(true); setError(savedPasscode ? 'Incorrect table password.' : ''); setView(null); }
            return;
          }
          throw new Error(data.error || 'Could not watch this table.');
        }
        if (active) { setView(data); setNeedsPassword(false); setError(''); }
      } catch (problem) { if (active) setError(problem instanceof Error ? problem.message : 'Could not watch this table.'); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; window.clearInterval(interval); window.clearInterval(clock); };
  }, [lobbyId, savedPasscode]);

  const seconds = view?.deadline ? Math.max(0, Math.ceil((view.deadline - now) / 1000)) : null;
  const phase = view?.phase === 'betting' ? 'Place antes' : view?.phase === 'deciding' ? 'Players decide' : view?.phase === 'completed' ? 'Hand complete' : 'Waiting for players';

  return <main className="spectate-page"><div className="spectate-wrap">
    <Link className="spectate-back" to="/lobbies">← Back to tables</Link>
    <header className="spectate-header"><div><small>REEF ROYALE / LIVE TABLE</small><h1>{view?.name ?? 'Watch a table'}</h1><p>Watch the action without taking a seat.</p></div><span className="spectate-live"><i /> Spectator view</span></header>
    {needsPassword && <form className="spectate-password" onSubmit={event => { event.preventDefault(); setSavedPasscode(passcode); }}><label>Private table password<input type="password" maxLength={72} required value={passcode} onChange={event => setPasscode(event.target.value)} /></label><button type="submit">Watch table</button></form>}
    {error && <p className="spectate-error" role="alert">{error}</p>}
    {!view && !needsPassword && !error && <p>Loading table...</p>}
    {view && !needsPassword && <>
      <section className="spectate-board" aria-label="Current hand">
        <div className="spectate-board-top"><div><small>HAND {view.roundNumber}</small><h2>{phase}</h2></div>{seconds !== null && view.phase !== 'completed' && <span className="spectate-timer">{seconds > 0 ? `${seconds}s left` : 'Time up'}</span>}</div>
        <div className="spectate-felt"><span className="spectate-dealer-label">DEALER</span><div className="spectate-cards" aria-label="Dealer cards">{view.dealer.length ? view.dealer.map((card, index) => <span key={index}>{card}</span>) : <p>Cards will appear when the hand starts</p>}{view.phase === 'deciding' && Array.from({ length: 4 }, (_, index) => <span className="spectate-hidden" key={index} aria-label="Hidden card">♣</span>)}</div></div>
        <p className="spectate-note">Dealer cards are revealed when the hand ends. Player cards stay private.</p>
      </section>
      <section className="spectate-seats"><div className="spectate-section-heading"><div><small>AT THE TABLE</small><h2>Players</h2></div><span>{view.seats.length} seated</span></div><div className="spectate-seat-grid">{view.seats.map((seat, index) => <article key={index}><span className="spectate-seat-avatar">{seat.bot ? '♟' : seat.name.slice(0, 1).toUpperCase()}</span><div><strong>{seat.name}{seat.bot ? ' · Bot' : ''}</strong><span>{seat.status}</span><small>Ante {seat.ante.toFixed(2)} chips</small></div>{seat.net !== null && <b className={seat.net >= 0 ? 'positive' : 'negative'}>{seat.net > 0 ? '+' : ''}{seat.net.toFixed(2)}</b>}</article>)}</div></section>
    </>}
  </div></main>;
}
