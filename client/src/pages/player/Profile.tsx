import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { AVATARS } from "../../services/users";
import { loadRecordHistory, loadStats, type RecordHand, type RecordHistory, type RecordStats } from "../../services/record";
import WatchAdvertModal from "../../components/WatchAdvertModal";
import { startWatchAdvert, type WatchSession } from "../../services/watchAd";
import "./Profile.css";

type ProfileUser = { username: string; avatar: string; balance: string; isGuest: boolean };

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [error, setError] = useState("");
  const [watchSession, setWatchSession] = useState<WatchSession | null>(null);
  const [watchError, setWatchError] = useState("");
  const [watchMessage, setWatchMessage] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser().then((current) => {
      if (!active) return;
      if (!current || current.isGuest) navigate("/", { replace: true });
      else setUser(current);
    }).catch((problem) => {
      if (active) setError(problem instanceof Error ? problem.message : "Could not load profile.");
    });
    return () => { active = false; };
  }, [navigate]);

  async function handleWatchAdvert() {
    setWatchError("");
    setWatchMessage("");
    try {
      const session = await startWatchAdvert();
      if (!session) { setWatchError("No eligible advertisements are available right now."); return; }
      setWatchSession(session);
    } catch (problem) { setWatchError(problem instanceof Error ? problem.message : "Could not start advertisement."); }
  }

  const avatar = AVATARS.find((choice) => choice.id === user?.avatar) ?? AVATARS[0];
  const balance = Number(user?.balance);

  return <main className="profile-page">
    <header className="profile-header"><div><p className="profile-eyebrow">REEF ROYALE</p><h1>My Profile</h1></div><button type="button" className="profile-play" onClick={() => navigate("/lobbies")}>Back to Tables</button></header>
    {error && <p role="alert">{error}</p>}
    {!user && !error && <p>Loading profile...</p>}
    {user && <>
      <section className="profile-card" aria-label="Account summary">
        <span className="profile-avatar" aria-label="Player avatar" role="img">{user.avatar.startsWith("data:image/") ? <img src={user.avatar} alt="" /> : avatar.symbol}</span>
        <div className="profile-identity"><h2>{user.username}</h2><p>Reef Royale Player</p></div>
        <div className="profile-balance"><span>♣ CHIP BALANCE</span><strong>{Number.isFinite(balance) ? balance.toFixed(2) : user.balance} CHIPS</strong><button type="button" className="profile-watch-ad" onClick={handleWatchAdvert}>Watch AD</button></div>
      </section>
      {watchError && <p role="alert" className="profile-watch-error">{watchError}</p>}
      {watchMessage && <p role="status" className="profile-watch-message">{watchMessage}</p>}
      <div className="profile-actions">
        <button type="button" onClick={() => navigate("/profile/avatar")}><span>◉</span><strong>Change Avatar</strong><small>Choose your player look</small></button>
        <button type="button" onClick={() => navigate("/profile/statistics")}><span>▥</span><strong>Statistics</strong><small>Track your results</small></button>
        <button type="button" onClick={() => navigate("/profile/history")}><span>♠</span><strong>Game History</strong><small>Review past hands</small></button>
      </div>
      {watchSession && <WatchAdvertModal session={watchSession} onClose={(result) => { if (result) { setUser(previous => previous ? { ...previous, balance: result.balance } : previous); setWatchMessage(`Advertisement completed! You earned ${result.reward} CHIPS.`); } setWatchSession(null); }} />}
    </>}
  </main>;
}

export function PlayerRecord({ title }: { title: string }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [stats, setStats] = useState<RecordStats | null>(null);
  const [historyData, setHistoryData] = useState<RecordHistory | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', sessionId: '' });
  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      if (!user || user.isGuest) navigate("/", { replace: true });
      else setAllowed(true);
    }).catch(() => navigate("/", { replace: true }));
    return () => { active = false; };
  }, [navigate]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    Promise.all([loadStats(), loadRecordHistory(page, filters.from, filters.to, filters.sessionId)])
      .then(([summary, hands]) => { if (active) { setStats(summary); setHistoryData(hands); setError(''); } })
      .catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Could not load your record.'); });
    return () => { active = false; };
  }, [allowed, page, filters]);
  if (!allowed) return <main className="profile-page"><p>Loading...</p></main>;
  const history = title === "Game History";
  const formatNet = (net: number) => `${net > 0 ? "+" : ""}${net.toFixed(2)}`;
  const recent = historyData?.hands ?? [];
  const handName = (hand: RecordHand) => { try { return JSON.parse(hand.hand).join(', '); } catch { return hand.hand || 'Cards unavailable'; } };
  function openSession(id: number) {
    const selected = String(id);
    setFrom(''); setTo(''); setSessionId(selected); setPage(1);
    setFilters({ from: '', to: '', sessionId: selected });
  }
  return <main className="profile-page">
    <header className="profile-header"><div><p className="profile-eyebrow">REEF ROYALE / PLAYER RECORD</p><h1>{title}</h1><p className="profile-page-subtitle">{history ? "A hand-by-hand look at your table sessions." : "Your results at a glance."}</p></div><button type="button" className="profile-play" onClick={() => navigate("/profile")}>Back to Profile</button></header>
    {error && <p role="alert">{error}</p>}
    {!stats && !error && <p>Loading your results...</p>}
    <nav className="profile-tabs" aria-label="Player record"><button type="button" className={!history ? "active" : ""} onClick={() => navigate("/profile/statistics")}>Statistics</button><button type="button" className={history ? "active" : ""} onClick={() => navigate("/profile/history")}>Game History</button></nav>
    {stats && (history ? <>
      <div className="profile-history-summary"><span><strong>{stats.hands}</strong> hands</span><span><strong>{stats.wins}</strong> wins</span><span><strong>{formatNet(stats.net)}</strong> net chips</span></div>
      <form className="profile-history-filters" onSubmit={event => { event.preventDefault(); setPage(1); setFilters({ from, to, sessionId }); }}><label>From <input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>To <input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><label>Session ID <input type="number" min="1" value={sessionId} onChange={event => setSessionId(event.target.value)} placeholder="Any session" /></label><button type="submit">Filter</button><button type="button" onClick={() => { setFrom(''); setTo(''); setSessionId(''); setPage(1); setFilters({ from: '', to: '', sessionId: '' }); }}>Clear</button></form>
      <section className="profile-data-panel"><div className="profile-panel-heading"><div><small>RECENT ACTIVITY</small><h2>{filters.sessionId ? `Session ${filters.sessionId}` : 'Hand history'}</h2></div><span>{historyData?.total ?? 0} hands · newest first</span></div>{filters.sessionId && <button type="button" className="profile-all-hands" onClick={() => { setSessionId(''); setPage(1); setFilters({ from: '', to: '', sessionId: '' }); }}>← All hands</button>}<div className="profile-history-list">{recent.length ? recent.map((hand) => <article className="profile-match" key={hand.id}><span className={`profile-match-mark ${hand.result.toLowerCase()}`} aria-label={hand.result}>{hand.result[0]}</span><div className="profile-match-main"><small>{new Date(hand.date).toLocaleString()} · <button type="button" className="profile-session-link" onClick={() => openSession(hand.sessionId)}>Session {hand.sessionId}</button></small><h3>{hand.table}</h3><span>{hand.result} · {handName(hand)} · {hand.choice}</span></div><div><small>Ante</small><strong>{hand.ante.toFixed(2)} chips</strong></div><div className="profile-match-net"><small>Net change</small><strong className={`profile-result ${hand.result.toLowerCase()}`}>{formatNet(hand.net)} chips</strong></div></article>) : <p className="profile-empty-record">{filters.from || filters.to || filters.sessionId ? 'No hands match these filters.' : 'No completed hands yet. Play a hand to start your history.'}</p>}</div></section>
      {historyData && historyData.pages > 1 && <div className="profile-history-pages"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {historyData.pages}</span><button type="button" disabled={page >= historyData.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </> : <>
      <div className="profile-stat-grid">{[
        { label: "Hands played", value: String(stats.hands), note: "Completed hands" },
        { label: "Win rate", value: `${stats.winRate}%`, note: "Wins ÷ hands played" },
        { label: "Net chips", value: formatNet(stats.net), note: "Total chip change" },
      ].map((stat) => <article className="profile-stat profile-stat-feature" key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong><span>{stat.note}</span></article>)}</div>
      <div className="profile-insight-grid"><section className="profile-data-panel"><div className="profile-panel-heading"><div><small>RESULTS</small><h2>How your hands ended</h2></div></div><div className="profile-outcome-bar" aria-label={`${stats.wins} wins, ${stats.losses} losses, ${stats.ties} ties`}><span className="wins" style={{ width: `${stats.hands ? stats.wins / stats.hands * 100 : 0}%` }} /><span className="losses" style={{ width: `${stats.hands ? stats.losses / stats.hands * 100 : 0}%` }} /><span className="ties" style={{ width: `${stats.hands ? stats.ties / stats.hands * 100 : 0}%` }} /></div><div className="profile-outcome-legend"><span>● Wins <strong>{stats.wins}</strong></span><span>● Losses <strong>{stats.losses}</strong></span><span>● Ties <strong>{stats.ties}</strong></span></div>{stats.hands === 0 && <p className="profile-empty-record">Finish a hand to see your results here.</p>}</section><section className="profile-data-panel"><div className="profile-panel-heading"><div><small>PLAY STYLE</small><h2>Decisions made</h2></div></div><div className="profile-decision"><span>Raised</span><strong>{stats.raised} hands</strong></div><div className="profile-decision"><span>Folded</span><strong>{stats.folded} hands</strong></div><p>Raising continues a hand; folding ends it and loses the ante.</p></section></div>
      <section className="profile-data-panel"><div className="profile-panel-heading"><div><small>QUICK LOOK</small><h2>Latest hands</h2></div><button type="button" onClick={() => navigate("/profile/history")}>View all history →</button></div><div className="profile-recent-list">{recent.slice(0, 3).length ? recent.slice(0, 3).map((hand) => <div key={hand.id}><span className={`profile-match-mark ${hand.result.toLowerCase()}`}>{hand.result[0]}</span><span>{hand.table}<small>{new Date(hand.date).toLocaleString()}</small></span><strong className={`profile-result ${hand.result.toLowerCase()}`}>{formatNet(hand.net)} chips</strong></div>) : <p>No hands played yet.</p>}</div></section>
    </>)}
  </main>;
}
