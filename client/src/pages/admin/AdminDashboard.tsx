import { useEffect, useState } from "react";
import { listUsers, type AdminUser } from "../../services/users";
import "../../styles/AdminDashboard.css";

const admin = {
  initials: "AN",
  name: "Alex North",
  role: "Administrator",
};

const openReportCount = 7;

const metrics = [
  { label: "Rooms created", value: "0" },
  { label: "Registered players", value: "0" },
  { label: "Ad impressions", value: "0" },
  { label: "Open reports", value: "0" },
];

type Section = "home" | "players";

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
  const [section, setSection] = useState<Section>("home");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (section !== "players") return;

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

  const needle = query.trim().toLowerCase();
  const visibleUsers = needle
    ? users.filter((user) =>
        `${user.username} ${user.email} ${user.role}`
          .toLowerCase()
          .includes(needle)
      )
    : users;

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
          <button type="button" className="admin-nav-item">
            Reports
            <span className="admin-nav-badge">{openReportCount}</span>
          </button>
        </nav>

        <div className="admin-identity">
          <span className="admin-avatar">{admin.initials}</span>
          <span>
            <strong>{admin.name}</strong>
            <small>{admin.role}</small>
          </span>
        </div>
      </aside>

      <main className="admin-main">
        {section === "home" ? (
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
                  <strong>{metric.value}</strong>
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
