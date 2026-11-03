import { useEffect, useState } from "react";
import "../styles/LobbyBrowser.css";
import { Link } from "react-router-dom";

type PublicLobby = {
  lobbyId: number;
  name: string;
  maxPlayers: number;
  minBet: string | number;
  maxBet: string | number;
  startingMoney: string | number;
  botsEnabled: boolean;
};

export default function LobbyBrowser() {
  const [lobbies, setLobbies] = useState<PublicLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLobbies() {
      try {
        const response = await fetch("http://localhost:3001/api/lobbies", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load public tables.");
        }

        const data: PublicLobby[] = await response.json();

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
              <h2>Public tables</h2>
              <p>See who's ready to play.</p>
            </div>

            {!loading && !error && (
              <span className="reef-browser-count">
                {lobbies.length} available
              </span>
            )}
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
              <h3>No public tables yet.</h3>
              <p>
                The room is quiet. Be the first to bring the game to life.
              </p>

              <Link to="/create-lobby" className="reef-browser-create">
                Create a Table
              </Link>
            </div>
          )}

          {!loading && !error && lobbies.length > 0 && (
            <div className="reef-browser-grid">
              {lobbies.map((lobby) => (
                <article
                  key={lobby.lobbyId}
                  className="reef-browser-card"
                >
                  <div className="reef-browser-card-top">
                    <span className="reef-browser-card-icon">♠</span>
                    <span className="reef-browser-status">OPEN TABLE</span>
                  </div>

                  <h3>{lobby.name}</h3>

                  <div className="reef-browser-details">
                    <div>
                      <span>Seats</span>
                      <strong>Up to {lobby.maxPlayers}</strong>
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
                      disabled
                      title="Joining tables will be available in a future sprint."
                    >
                      Join Table
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}