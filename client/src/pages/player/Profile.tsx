import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { AVATARS } from "../../services/users";
import { sampleHands, sampleSummary } from "./sampleHands";
import "./Profile.css";

type ProfileUser = { username: string; avatar: string; balance: string; isGuest: boolean };

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [error, setError] = useState("");

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

  const avatar = AVATARS.find((choice) => choice.id === user?.avatar) ?? AVATARS[0];
  const balance = Number(user?.balance);

  return <main className="profile-page">
    <header className="profile-header"><div><p className="profile-eyebrow">REEF ROYALE</p><h1>My Profile</h1></div><button type="button" className="profile-play" onClick={() => navigate("/play")}>Back to Play</button></header>
    {error && <p role="alert">{error}</p>}
    {!user && !error && <p>Loading profile...</p>}
    {user && <>
      <section className="profile-card" aria-label="Account summary">
        <span className="profile-avatar" aria-label="Player avatar" role="img">{user.avatar.startsWith("data:image/") ? <img src={user.avatar} alt="" /> : avatar.symbol}</span>
        <div className="profile-identity"><h2>{user.username}</h2><p>Reef Royale Player</p></div>
        <div className="profile-balance"><span>♣ CHIP BALANCE</span><strong>{Number.isFinite(balance) ? balance.toFixed(2) : user.balance} CHIPS</strong></div>
      </section>
      <div className="profile-actions">
        <button type="button" onClick={() => navigate("/profile/avatar")}><span>◉</span><strong>Change Avatar</strong><small>Choose your player look</small></button>
        <button type="button" onClick={() => navigate("/profile/statistics")}><span>▥</span><strong>Statistics</strong><small>Track your results</small></button>
        <button type="button" onClick={() => navigate("/profile/history")}><span>♠</span><strong>Game History</strong><small>Review past hands</small></button>
      </div>
    </>}
  </main>;
}

export function ProfileComingSoon({ title }: { title: string }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      if (!user || user.isGuest) navigate("/", { replace: true });
      else setAllowed(true);
    }).catch(() => navigate("/", { replace: true }));
    return () => { active = false; };
  }, [navigate]);
  if (!allowed) return <main className="profile-page"><p>Loading...</p></main>;
  const history = title === "Game History";
  const winRate = Math.round((sampleSummary.wins / sampleSummary.hands) * 100);
  const formatNet = (net: number) => `${net > 0 ? "+" : ""}${net}`;
  return <main className="profile-page">
    <header className="profile-header"><div><p className="profile-eyebrow">REEF ROYALE / PLAYER RECORD</p><h1>{title}</h1><p className="profile-page-subtitle">{history ? "A hand-by-hand look at your table sessions." : "Your results at a glance."}</p></div><button type="button" className="profile-play" onClick={() => navigate("/profile")}>Back to Profile</button></header>
    <p className="profile-demo-note">Preview only — these are sample hands, not your saved game results.</p>
    <nav className="profile-tabs" aria-label="Player record"><button type="button" className={!history ? "active" : ""} onClick={() => navigate("/profile/statistics")}>Statistics</button><button type="button" className={history ? "active" : ""} onClick={() => navigate("/profile/history")}>Game History</button></nav>
    {history ? <>
      <div className="profile-history-summary"><span><strong>{sampleSummary.hands}</strong> hands</span><span><strong>{sampleSummary.wins}</strong> wins</span><span><strong>{formatNet(sampleSummary.net)}</strong> net chips</span></div>
      <section className="profile-data-panel"><div className="profile-panel-heading"><div><small>RECENT ACTIVITY</small><h2>Hand history</h2></div><span>Newest first</span></div><div className="profile-history-list">{sampleHands.map((hand) => <article className="profile-match" key={hand.id}><span className={`profile-match-mark ${hand.result.toLowerCase()}`}>{hand.result === "Win" ? "W" : hand.result === "Loss" ? "L" : "T"}</span><div className="profile-match-main"><small>{hand.date}</small><h3>{hand.table}</h3><span>{hand.hand} · {hand.choice}</span></div><div><small>Ante</small><strong>{hand.ante} chips</strong></div><div className="profile-match-net"><small>Net change</small><strong className={`profile-result ${hand.result.toLowerCase()}`}>{formatNet(hand.net)} chips</strong></div></article>)}</div></section>
    </> : <>
      <div className="profile-stat-grid">{[
        { label: "Hands played", value: String(sampleSummary.hands), note: "Completed hands" },
        { label: "Win rate", value: `${winRate}%`, note: "Wins ÷ hands played" },
        { label: "Net chips", value: formatNet(sampleSummary.net), note: "Total chip change" },
      ].map((stat) => <article className="profile-stat profile-stat-feature" key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong><span>{stat.note}</span></article>)}</div>
      <div className="profile-insight-grid"><section className="profile-data-panel"><div className="profile-panel-heading"><div><small>RESULTS</small><h2>How your hands ended</h2></div></div><div className="profile-outcome-bar" aria-label={`${sampleSummary.wins} wins, ${sampleSummary.losses} losses, ${sampleSummary.ties} ties`}><span className="wins" style={{ width: `${sampleSummary.wins / sampleSummary.hands * 100}%` }} /><span className="losses" style={{ width: `${sampleSummary.losses / sampleSummary.hands * 100}%` }} /><span className="ties" style={{ width: `${sampleSummary.ties / sampleSummary.hands * 100}%` }} /></div><div className="profile-outcome-legend"><span>● Wins <strong>{sampleSummary.wins}</strong></span><span>● Losses <strong>{sampleSummary.losses}</strong></span><span>● Ties <strong>{sampleSummary.ties}</strong></span></div></section><section className="profile-data-panel"><div className="profile-panel-heading"><div><small>PLAY STYLE</small><h2>Decisions made</h2></div></div><div className="profile-decision"><span>Raised</span><strong>{sampleHands.filter((hand) => hand.choice === "Raise").length} hands</strong></div><div className="profile-decision"><span>Folded</span><strong>{sampleHands.filter((hand) => hand.choice === "Fold").length} hands</strong></div><p>Raising continues a hand; folding ends it and loses the ante.</p></section></div>
      <section className="profile-data-panel"><div className="profile-panel-heading"><div><small>QUICK LOOK</small><h2>Latest hands</h2></div><button type="button" onClick={() => navigate("/profile/history")}>View all history →</button></div><div className="profile-recent-list">{sampleHands.slice(0, 3).map((hand) => <div key={hand.id}><span className={`profile-match-mark ${hand.result.toLowerCase()}`}>{hand.result[0]}</span><span>{hand.table}<small>{hand.date}</small></span><strong className={`profile-result ${hand.result.toLowerCase()}`}>{formatNet(hand.net)} chips</strong></div>)}</div></section>
    </>}
  </main>;
}
