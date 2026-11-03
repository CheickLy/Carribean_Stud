import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../../services/auth";
import { AVATARS } from "../../services/users";
import "./PlayerHome.css";

type Player = { username: string; balance: string; isGuest: boolean; avatar: string };
type Table = { lobbyId: number; name: string; maxPlayers: number; minBet: string | number; maxBet: string | number; startingMoney: string | number };

export default function PlayerHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Player | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState("");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((current) => {
      if (!active) return;
      if (!current) navigate("/", { replace: true });
      else setUser(current);
    }).catch((problem) => { if (active) setError(problem instanceof Error ? problem.message : "Could not load your account."); });
    fetch("http://localhost:3001/api/lobbies").then(async (response) => {
      if (!response.ok) throw new Error("Could not load tables.");
      return response.json() as Promise<Table[]>;
    }).then((list) => { if (active) setTables(list); })
      .catch((problem) => { if (active) setTablesError(problem instanceof Error ? problem.message : "Could not load tables."); })
      .finally(() => { if (active) setTablesLoading(false); });
    return () => { active = false; };
  }, [navigate]);

  async function handleLogout() {
    setSigningOut(true);
    setError("");
    try { await logout(); navigate("/", { replace: true }); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not log out."); setSigningOut(false); }
  }

  const avatar = AVATARS.find((choice) => choice.id === user?.avatar)?.symbol ?? "🌊";
  return <main className="player-home">
    <header className="player-home-nav"><strong>ReefRoyale</strong><nav aria-label="Player navigation"><button type="button" onClick={() => navigate("/lobbies")}>Tables</button>{!user?.isGuest && <><button type="button" onClick={() => navigate("/friends")}>Friends</button><button type="button" onClick={() => navigate("/profile")}>Profile</button></>}<button type="button" disabled={signingOut} onClick={handleLogout}>{signingOut ? "Logging out..." : "Log out"}</button></nav></header>
    <div className="player-home-content">
      {error && <p role="alert" className="player-home-error">{error}</p>}
      {!user && !error && <p>Loading session...</p>}
      {user && <>
        <section className="player-welcome"><div><span className="player-kicker">YOUR REEF ROYALE HOME</span><h1>Welcome, {user.isGuest ? "Guest" : user.username}.</h1><p>Find a table, get to know the game, and keep track of your play.</p><div className="player-welcome-actions"><button type="button" onClick={() => navigate("/lobbies")}>Explore tables</button><button type="button" onClick={() => navigate("/create-lobby")}>Create a table</button></div></div><div className="player-account"><span className="player-account-avatar">{user.avatar?.startsWith("data:image/") ? <img src={user.avatar} alt="Your avatar" /> : avatar}</span><small>{user.isGuest ? "Guest balance" : "Your chip balance"}</small><strong>{Number(user.balance).toFixed(2)} <span>chips</span></strong>{user.isGuest ? <button type="button" onClick={() => navigate("/register")}>Save progress with an account</button> : <button type="button" onClick={() => navigate("/profile")}>View profile</button>}</div></section>
        <section className="player-section"><div className="player-section-heading"><div><span className="player-kicker">FIND YOUR SEAT</span><h2>Public tables</h2><p>These tables come from the current lobby list.</p></div><button type="button" onClick={() => navigate("/lobbies")}>See all tables →</button></div>{tablesLoading && <p>Loading tables...</p>}{tablesError && <p role="alert">{tablesError}</p>}{!tablesLoading && !tablesError && (tables.length ? <div className="player-tables">{tables.slice(0, 3).map((table) => <article key={table.lobbyId}><span>♣ Public table</span><h3>{table.name}</h3><p>Up to {table.maxPlayers} players · {table.minBet}–{table.maxBet} chip bets</p><button type="button" onClick={() => navigate("/lobbies")}>View table</button></article>)}</div> : <div className="player-empty"><h3>No public tables yet</h3><p>Start one and invite other players to join.</p><button type="button" onClick={() => navigate("/create-lobby")}>Create a table</button></div>)}</section>
        <section className="player-section player-guide"><div><span className="player-kicker">NEW TO THE GAME?</span><h2>A quick way to start</h2><p>Caribbean Stud is played against the dealer. Choose a table, place an ante, look at your cards, then decide whether to raise or fold when gameplay is available.</p><button type="button" className="player-rules-link" onClick={() => navigate("/rules")}>Read the game rules →</button></div><ol><li><strong>Browse tables</strong><span>Find a public table that fits your chip balance.</span></li><li><strong>Join friends</strong><span>Use the friends page to connect with other players.</span></li><li><strong>Track progress</strong><span>Open your profile to see the stats and history preview.</span></li></ol></section>
      </>}
    </div>
  </main>;
}
