import { useEffect, useRef, useState } from "react";
import "../styles/LobbyBrowser.css";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { startGuest } from "../services/auth";

import { selectLobbies, type BrowserLobby } from "./lobbyBrowserControls";
import SponsoredAdvertBanner from "../components/SponsoredAdvertBanner";

export default function LobbyBrowser() {
  const navigate = useNavigate();
  const session = useOutletContext<{ user: unknown; loading: boolean; error: string } | undefined>();
  const authDialog = useRef<HTMLDialogElement>(null);
  const [authTable, setAuthTable] = useState<BrowserLobby | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  useEffect(() => { if (authTable) authDialog.current?.showModal(); else authDialog.current?.close(); }, [authTable]);
  const joinDialog = useRef<HTMLDialogElement>(null);
  const filterRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (filterRef.current?.open && !filterRef.current.contains(event.target as Node)) filterRef.current.open = false; };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const [joining, setJoining] = useState<number | null>(null);
  const [selected, setSelected] = useState<BrowserLobby | null>(null);
  const [passcode, setPasscode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [pageJoinError, setPageJoinError] = useState("");

  useEffect(() => {
    if (selected) joinDialog.current?.showModal();
    else joinDialog.current?.close();
  }, [selected]);

  async function join(lobby: BrowserLobby, password = "") {
    if (joining !== null) return;
    setJoining(lobby.lobbyId); setJoinError(""); setPageJoinError("");
    try {
      const response = await fetch(`/api/lobbies/${lobby.lobbyId}/join`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: lobby.isPrivate ? password : undefined }),
      });
      const data = await readJson(response);
      if (response.status === 401) { setSelected(null); setAuthTable(lobby); return; }
      if (!response.ok) {
        const message = data.error || "Unable to join this table.";
        if (lobby.isPrivate && message === "Incorrect table password.") setJoinError(message);
        else { setSelected(null); setPageJoinError(`${lobby.name}: ${message}`); }
        return;
      }
      navigate(`/lobbies/${lobby.lobbyId}`, { state: { joined: true } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to join this table.";
      if (lobby.isPrivate) setJoinError(message); else setPageJoinError(`${lobby.name}: ${message}`);
    } finally { setJoining(null); }
  }

  const [lobbies, setLobbies] = useState<BrowserLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [visibility, setVisibility] = useState("all");
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const visibleLobbies = selectLobbies(lobbies, sortBy, direction, visibility, availableOnly).filter(lobby => lobby.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLobbies() {
      try {
        const response = await fetch("/api/lobbies", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load tables.");
        }

        const data = await readJson<BrowserLobby[]>(response);

        setLobbies(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchLobbies();

    return () => controller.abort();
  }, []);

  return (
    <div className="reef-browser-page">
      <main className="reef-browser-container">
        <SponsoredAdvertBanner />
        <header className="reef-browser-header">
          <div>
            <h1>Tables</h1>
            <p>
              Pull up a seat, join the action, or start a table of your own.
            </p>
          </div>

          <Link to="/create-lobby" className="reef-browser-create">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> Create Table
          </Link>
        </header>

        <section className="reef-browser-section">
          <div className="reef-browser-controls" aria-label="Table sorting and filters">

            <details ref={filterRef} className="reef-filter" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
              <summary><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2.5 4h11M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> Filter{(availableOnly || visibility !== "all" || sortBy !== "createdAt" || direction !== "desc") && <span className="reef-filter-dot" aria-label="Filters active" />}</summary>
              <div className="reef-filter-panel"><div className="reef-filter-heading"><strong>Filters &amp; sorting</strong><button type="button" onClick={() => { setSortBy("createdAt"); setDirection("desc"); setVisibility("all"); setAvailableOnly(false); }}>Reset</button></div>
                <div className="reef-filter-visibility"><span>Visibility</span><fieldset className="reef-visibility"><legend className="reef-table-sr">Table visibility</legend>{[{value:"all",label:"All"},{value:"public",label:"Public"},{value:"private",label:"Private"}].map(option => <label key={option.value}><input type="radio" name="visibility" value={option.value} checked={visibility === option.value} onChange={() => setVisibility(option.value)} /><span>{option.label}</span></label>)}</fieldset></div>
                <label>Sort by<select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="creator">Creator</option><option value="createdAt">Creation date</option><option value="startingMoney">Starting money</option><option value="minBet">Minimum bet</option></select></label>
                <label>Order<select value={direction} onChange={event => setDirection(event.target.value as "asc" | "desc")}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
                <label className="reef-filter-check"><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} />Seats available</label>
              </div>
            </details>
            <label className="reef-search"><span className="reef-table-sr">Search tables</span><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg><input type="search" placeholder="Search tables" value={search} onChange={event => setSearch(event.target.value)} /></label>
          </div>

          {pageJoinError && <p className="reef-join-notice" role="alert">{pageJoinError}</p>}

          {loading && (
            <div className="reef-browser-message">
              Loading available tables...
            </div>
          )}

          {!loading && error && (
            <div className="reef-browser-message reef-browser-error">
              {error}
            </div>
          )}

          {!loading && !error && lobbies.length === 0 && (
            <div className="reef-browser-empty">
              <div className="reef-browser-empty-icon">♠</div>
              <h3>No tables yet.</h3>
              <p>
                The room is quiet. Be the first to bring the game to life.
              </p>

              <Link to="/create-lobby" className="reef-browser-create">
                Create a Table
              </Link>
            </div>
          )}

          {!loading && !error && lobbies.length > 0 && visibleLobbies.length === 0 && (
            <div className="reef-browser-empty" role="status">
              <h3>No matching tables.</h3>
              <p>Try different filters or reset to see all tables.</p>
            </div>
          )}

          {!loading && !error && visibleLobbies.length > 0 && (
            <div className="reef-table-wrap"><table className="reef-table-list"><thead><tr><th scope="col">Name</th><th scope="col">Min bet</th><th scope="col">Max bet</th><th scope="col">Players</th><th scope="col">Starting chips</th><th scope="col"><span className="reef-table-sr">Action</span></th></tr></thead><tbody>{visibleLobbies.map(lobby => <tr key={lobby.lobbyId}><th scope="row"><span className="reef-table-name">{lobby.name}</span><span className="reef-table-privacy">{lobby.isPrivate ? "Private" : "Public"}{lobby.seatsAvailable === 0 ? " · Full" : ""}</span></th><td>{Number(lobby.minBet).toLocaleString()}</td><td>{Number(lobby.maxBet).toLocaleString()}</td><td>{lobby.maxPlayers - lobby.seatsAvailable} / {lobby.maxPlayers}</td><td>{Number(lobby.startingMoney).toLocaleString()}</td><td className="reef-table-action"><button type="button" disabled={lobby.seatsAvailable === 0 || joining !== null} onClick={() => { setPasscode(""); setJoinError(""); setPageJoinError(""); if (session && !session.user && !session.loading && !session.error) { setGuestError(""); setAuthTable(lobby); } else if (lobby.isPrivate) setSelected(lobby); else void join(lobby); }}>{lobby.seatsAvailable === 0 ? "Full" : "Join"}</button></td></tr>)}</tbody></table></div>
          )}
        </section>
      </main>
      <dialog ref={authDialog} className="reef-auth-dialog" aria-labelledby="reef-auth-title" onCancel={event => { if (guestLoading) event.preventDefault(); else setAuthTable(null); }}>
        <button type="button" className="reef-auth-close" aria-label="Close" disabled={guestLoading} onClick={() => setAuthTable(null)}>×</button>
        <h2 id="reef-auth-title">Continue to table</h2><p>Sign in to continue or play as a guest.</p>
        {guestError && <p className="reef-auth-error" role="alert">{guestError}</p>}
        <div className="reef-auth-actions"><button type="button" disabled={guestLoading} onClick={() => navigate("/login", { state: { from: "/lobbies" } })}>Sign in</button><button type="button" disabled={guestLoading} onClick={async () => { const lobby = authTable; if (!lobby) return; setGuestLoading(true); setGuestError(""); try { await startGuest(); setAuthTable(null); if (lobby.isPrivate) setSelected(lobby); else void join(lobby); } catch (error) { setGuestError(error instanceof Error ? error.message : "Could not start guest play."); } finally { setGuestLoading(false); } }}>{guestLoading ? "Starting…" : "Play as guest"}</button></div>
      </dialog>
      <dialog ref={joinDialog} className="reef-join-dialog" aria-labelledby="join-title" onCancel={event => {
        if (joining !== null) event.preventDefault();
        else setSelected(null);
      }}>
        {selected && <>
          <h2 id="join-title">Join {selected.name}</h2>
          <p>Enter the password to join this private table.</p>
          <form onSubmit={event => { event.preventDefault(); void join(selected, passcode); }}>
            {selected.isPrivate && <label>Table password<input autoFocus type="password" required maxLength={72} value={passcode} onChange={event => setPasscode(event.target.value)} /></label>}
            {joinError && <p role="alert">{joinError}</p>}
            <div className="reef-join-actions"><button type="button" disabled={joining !== null} onClick={() => setSelected(null)}>Cancel</button><button autoFocus={!selected.isPrivate} type="submit" disabled={joining !== null}>{joining !== null ? "Joining…" : "Take a seat"}</button></div>
          </form>
        </>}
      </dialog>
    </div>
  );
}
import { readJson } from '../services/http';

