import { useEffect, useState } from "react";
import { listUsers, setUserBanned, type AdminUser } from "../../services/users";
import "../../styles/AdminDashboard.css";
import SupportReports from './SupportReports';
import { getCurrentUser, logout } from '../../services/auth';
import { useNavigate } from 'react-router-dom';

const admin = {
  initials: "AN",
  name: "Alex North",
  role: "Administrator",
};

const metrics = [
  { label: "Lobbies created", value: "0" },
  { label: "Registered players", value: "0" },
  { label: "Ad impressions", value: "0" },
  { label: "Open reports", value: "0" },
];

type Section = "home" | "players" | "reports";

function formatBalance(balance: string) {
  const amount = Number(balance);
  return Number.isFinite(amount) ? amount.toFixed(2) : balance;
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? createdAt
    : date.toLocaleDateString();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [section, setSection] = useState<Section>("home");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [lobbyCount, setLobbyCount] = useState(0);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      if (!user || user.role !== 'admin') navigate('/', { replace: true });
      else setAdminName(user.username);
    }).catch(() => { if (active) navigate('/', { replace: true }); });
    return () => { active = false; };
  }, [navigate]);

  async function handleLogout() {
    setSigningOut(true);
    setSessionError('');
    try { await logout(); navigate('/', { replace: true }); }
    catch { setSessionError('Could not log out. Please try again.'); setSigningOut(false); }
  }

  useEffect(() => {
    if (section !== "home" && section !== "players") return;

    let active = true;
    setLoading(true);
    setError("");

    listUsers()
      .then((loaded) => {
        if (active) setUsers(loaded);
      })
      .catch((loadError) => {
        if (!active) return;
        setUsers([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load users"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [section]);

  useEffect(() => {
    if (section !== "home") return;

    let active = true;

    fetch("http://localhost:3001/api/lobbies/all", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not load lobbies");
        }
        return data;
      })
      .then((loaded) => {
        if (active) setLobbyCount(Array.isArray(loaded) ? loaded.length : 0);
      })
      .catch(() => {
        if (active) setLobbyCount(0);
      });

    return () => {
      active = false;
    };
  }, [section]);

  async function handleBanToggle(user: AdminUser) {
    setActionError("");
    setPendingUserId(user.userId);

    try {
      const updated = await setUserBanned(user.userId, !user.isBanned);
      setUsers((current) =>
        current.map((row) => (row.userId === updated.userId ? updated : row))
      );
    } catch (toggleError) {
      setActionError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update ban status"
      );
    } finally {
      setPendingUserId(null);
    }
  }

  const registeredPlayers = users.filter(
    (user) => !user.isGuest && user.role === "player"
  ).length;

  const needle = query.trim().toLowerCase();
  const visibleUsers = needle
    ? users.filter((user) =>
        `${user.username} ${user.email} ${user.role}`
          .toLowerCase()
          .includes(needle)
      )
    : users;

  if (!adminName) return <main className="admin-dashboard"><p>Loading session...</p></main>;

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-mark" aria-hidden="true">
            ♣
          </span>
          <span>Reef Royale</span>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          <button
            type="button"
            className={`admin-nav-item${section === "home" ? " is-active" : ""}`}
            onClick={() => setSection("home")}
          >
            Home
          </button>
          <button
            type="button"
            className={`admin-nav-item${section === "players" ? " is-active" : ""}`}
            onClick={() => {
              setLoading(true);
              setSection("players");
            }}
          >
            Players
          </button>
          <button type="button" className={`admin-nav-item${section === "reports" ? " is-active" : ""}`} onClick={() => setSection("reports")}>
            Reports
          </button>
        </nav>

        <div className="admin-identity">
          <span className="admin-avatar">{adminName.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{adminName}</strong>
            <small>{admin.role}</small>
          </span>
        </div>
        <button type="button" className="admin-nav-item" disabled={signingOut} onClick={handleLogout}>{signingOut ? 'Logging out...' : 'Log out'}</button>
        {sessionError && <p role="alert">{sessionError}</p>}
      </aside>

      <main className="admin-main">
        {section === "reports" ? <SupportReports /> : section === "home" ? (
          <>
            <header className="admin-header">
              <h1>Admin Dashboard</h1>
              <button type="button" className="admin-range">
                Last 7 days
              </button>
            </header>

            <section className="admin-metrics" aria-label="Key metrics">
              {metrics.map((metric) => (
                <article key={metric.label} className="admin-metric">
                  <p>{metric.label}</p>
                  <strong>
                    {metric.label === "Registered players"
                      ? registeredPlayers
                      : metric.label === "Lobbies created"
                        ? lobbyCount
                        : metric.value}
                  </strong>
                </article>
              ))}
            </section>
          </>
        ) : (
          <>
            <header className="admin-header">
              <h1>Players</h1>
            </header>

            <section className="admin-players" aria-label="Players">
              <label className="admin-search" htmlFor="player-search">
                Search
                <input
                  id="player-search"
                  type="search"
                  value={query}
                  placeholder="Username, email, or role"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              {loading && <p>Loading players...</p>}
              {error && <p role="alert">{error}</p>}
              {actionError && <p role="alert">{actionError}</p>}
              {!loading && !error && visibleUsers.length === 0 && (
                <p>
                  {users.length === 0
                    ? "No players found."
                    : "No players match that search."}
                </p>
              )}

              {!loading && !error && visibleUsers.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Guest</th>
                        <th>Banned</th>
                        <th>Balance</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map((user) => (
                        <tr key={user.userId}>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{user.role}</td>
                          <td>{user.isGuest ? "Yes" : "No"}</td>
                          <td>{user.isBanned ? "Yes" : "No"}</td>
                          <td>{formatBalance(user.balance)}</td>
                          <td>{formatCreatedAt(user.createdAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="admin-ban-button"
                              disabled={pendingUserId === user.userId}
                              onClick={() => handleBanToggle(user)}
                            >
                              {user.isBanned ? "Unban" : "Ban"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
