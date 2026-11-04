import { useEffect, useRef, useState } from "react";
import "../styles/LobbyBrowser.css";
import { Link, useNavigate } from "react-router-dom";

import { selectLobbies, type BrowserLobby } from "./lobbyBrowserControls";

export default function LobbyBrowser() {
  const navigate = useNavigate();
  const joinDialog = useRef<HTMLDialogElement>(null);
  const [joining, setJoining] = useState<number | null>(null);
  const [selected, setSelected] = useState<BrowserLobby | null>(null);
  const [passcode, setPasscode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (selected) joinDialog.current?.showModal();
    else joinDialog.current?.close();
  }, [selected]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || joining !== null) return;
    setJoining(selected.lobbyId);
    setJoinError("");
    try {
      const response = await fetch(`/api/lobbies/${selected.lobbyId}/join`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: selected.isPrivate ? passcode : undefined }),
      });
      const data = await response.json();
      if (response.status === 401) {
        navigate("/login", { state: { from: "/lobbies" } });
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to join this table.");
      navigate(`/lobbies/${selected.lobbyId}`, { state: { joined: true } });
    } catch (error) { setJoinError(error instanceof Error ? error.message : "Unable to join this table."); }
    finally { setJoining(null); }
  }

  const [lobbies, setLobbies] = useState<BrowserLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [visibility, setVisibility] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  function resetControls() {
    setSortBy("createdAt");
    setDirection("desc");
    setVisibility("all");
    setAvailableOnly(false);
  }

  const visibleLobbies = selectLobbies(lobbies, sortBy, direction, visibility, availableOnly);

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

        const data: BrowserLobby[] = await response.json();

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
        <header className="reef-browser-header">
          <div>
            <Link to="/" className="reef-browser-back">
              ← Back
            </Link>

            <h1>Find your table.</h1>
            <p>
              Pull up a seat, join the action, or start a table of your own.
            </p>
          </div>

          <Link to="/create-lobby" className="reef-browser-create">
            + Create Table
          </Link>
        </header>

        <section className="reef-browser-section">
          <div className="reef-browser-section-heading">
            <div>
              <h2>Tables</h2>
              <p>See who's ready to play.</p>
            </div>

            {!loading && !error && (
              <span className="reef-browser-count">
                {visibleLobbies.length} of {lobbies.length} tables
              </span>
            )}
          </div>

          <div className="reef-browser-controls" aria-label="Table sorting and filters">
            <label>Sort by
              <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
                <option value="creator">Creator</option>
                <option value="createdAt">Creation date</option>
                <option value="startingMoney">Starting money</option>
                <option value="minBet">Minimum bet</option>
              </select>
            </label>
            <label>Order
              <select value={direction} onChange={event => setDirection(event.target.value as "asc" | "desc")}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
            <label>Visibility
              <select value={visibility} onChange={event => setVisibility(event.target.value)}>
                <option value="all">Public and private</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="reef-browser-checkbox">
              <input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} />
              Seats available
            </label>
            <button type="button" onClick={resetControls}>Reset</button>
          </div>

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
            <div className="reef-browser-grid">
              {visibleLobbies.map((lobby) => (
                <article
                  key={lobby.lobbyId}
                  className="reef-browser-card"
                >
                  <div className="reef-browser-card-top">
                    <span className="reef-browser-card-icon">♠</span>
                    <span className="reef-browser-status">{lobby.isPrivate ? "PRIVATE" : "PUBLIC"} · {lobby.seatsAvailable > 0 ? "OPEN" : "FULL"}</span>
                  </div>

                  <h3>{lobby.name}</h3>
                  <p className="reef-browser-meta">Created by {lobby.creator} · {new Date(lobby.createdAt).toLocaleString()}</p>

                  <div className="reef-browser-details">
                    <div>
                      <span>Seats</span>
                      <strong>{lobby.seatsAvailable} of {lobby.maxPlayers} available</strong>
                    </div>

                    <div>
                      <span>Minimum bet</span>
                      <strong>{Number(lobby.minBet).toLocaleString()} chips</strong>
                    </div>

                    <div>
                      <span>Maximum bet</span>
                      <strong>{Number(lobby.maxBet).toLocaleString()} chips</strong>
                    </div>

                    <div>
                      <span>Starting chips</span>
                      <strong>
                        {Number(lobby.startingMoney).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="reef-browser-card-footer">
                    <span>
                      {lobby.botsEnabled ? "Bots allowed" : "Players only"}
                    </span>

                    <button
                      type="button"
                      disabled={lobby.seatsAvailable === 0 || joining !== null}
                      onClick={() => { setSelected(lobby); setPasscode(""); setJoinError(""); }}
                    >
                      {lobby.seatsAvailable === 0 ? "Table full" : "Join Table"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <dialog ref={joinDialog} className="reef-join-dialog" aria-labelledby="join-title" onCancel={event => {
        if (joining !== null) event.preventDefault();
        else setSelected(null);
      }}>
        {selected && <>
          <h2 id="join-title">Join {selected.name}</h2>
          <p>You need {Number(selected.startingMoney).toLocaleString()} chips to join. Your chip balance will not be charged.</p>
          <p>If a hand is underway, your seat will be ready for the next hand.</p>
          <form onSubmit={join}>
            {selected.isPrivate && <label>Table password<input autoFocus type="password" required maxLength={72} value={passcode} onChange={event => setPasscode(event.target.value)} /></label>}
            {joinError && <p role="alert">{joinError}</p>}
            <div className="reef-join-actions"><button type="button" disabled={joining !== null} onClick={() => setSelected(null)}>Cancel</button><button autoFocus={!selected.isPrivate} type="submit" disabled={joining !== null}>{joining !== null ? "Joining…" : "Take a seat"}</button></div>
          </form>
        </>}
      </dialog>
    </div>
  );
}
