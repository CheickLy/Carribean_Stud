import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles/SpectateTable.css';

type View = { name: string; isPrivate: boolean; roundNumber: number; phase: string; deadline: number | null; dealer: string[]; seats: { name: string; bot: boolean; status: string; ante: number; net: number | null }[] };

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
        if (!response.ok) { if (response.status === 403 && data.error?.includes('password')) { if (active) { setNeedsPassword(true); setError(savedPasscode ? 'Incorrect table password.' : ''); setView(null); } return; } throw new Error(data.error || 'Could not watch this table.'); }
        if (active) { setView(data); setNeedsPassword(false); setError(''); }
      } catch (problem) { if (active) setError(problem instanceof Error ? problem.message : 'Could not watch this table.'); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; window.clearInterval(interval); window.clearInterval(clock); };
  }, [lobbyId, savedPasscode]);
  const seconds = view?.deadline ? Math.max(0, Math.ceil((view.deadline - now) / 1000)) : null;
  return <main className="spectate-page"><div className="spectate-wrap"><Link to="/lobbies">← Back to tables</Link><header><small>REEF ROYALE · LIVE TABLE</small><h1>{view?.name ?? 'Watch a table'}</h1><p>Spectator view · Your seat and chips stay unchanged.</p></header>
    {needsPassword && <form onSubmit={event => { event.preventDefault(); setSavedPasscode(passcode); }}><label>Private table password<input type="password" maxLength={72} required value={passcode} onChange={event => setPasscode(event.target.value)} /></label><button type="submit">Watch table</button></form>}
    {error && <p role="alert">{error}</p>}
    {!view && !needsPassword && !error && <p>Loading table...</p>}
    {view && !needsPassword && <><section className="spectate-round"><span>Hand {view.roundNumber} · {view.phase}</span>{seconds !== null && <strong>{seconds}s</strong>}<div className="spectate-cards" aria-label="Dealer cards">{view.dealer.length ? view.dealer.map((card, index) => <span key={index}>{card}</span>) : <p>Waiting for the dealer</p>}{view.phase === 'deciding' && Array.from({ length: 4 }, (_, index) => <span key={`hidden-${index}`} aria-label="Hidden card">★</span>)}</div><small>Dealer cards are revealed after the hand ends.</small></section><section className="spectate-seats"><h2>Players at the table</h2><div>{view.seats.map((seat, index) => <article key={index}><strong>{seat.name}{seat.bot ? ' · Bot' : ''}</strong><span>{seat.status}</span><span>Ante: {seat.ante.toFixed(2)} chips</span>{seat.net !== null && <b>{seat.net > 0 ? '+' : ''}{seat.net.toFixed(2)} chips</b>}</article>)}</div></section></>}
  </div></main>;
}
