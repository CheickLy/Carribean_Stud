import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { deleteUserAccount, listUsers, setUserBanned, updateUserAccount, type AdminUser } from "../../services/users";
import "../../styles/AdminDashboard.css";
import SupportReports from './SupportReports';
import { getCurrentUser, logout } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import CreateAdvert from './CreateAdvert';

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

type Section = "home" | "players" | "reports" | "adverts";

function formatBalance(balance: string) {
  const amount = Number(balance);
  return Number.isFinite(amount) ? amount.toFixed(2) : balance;
}

function AccountDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!node.open) node.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    node.addEventListener("cancel", onCancel);
    return () => node.removeEventListener("cancel", onCancel);
  }, []);

  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
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
  const [adminId, setAdminId] = useState<number | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [section, setSection] = useState<Section>("home");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [lobbyCount, setLobbyCount] = useState(0);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => {
      if (!active) return;
      if (!user || user.role !== 'admin') navigate('/', { replace: true });
      else {
        setAdminName(user.username);
        setAdminId(typeof user.userId === "number" ? user.userId : null);
      }
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

    fetch("/api/lobbies/all", { credentials: "include" })
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

  function openEdit(user: AdminUser) {
    setEditUser(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditError("");
  }

  async function handleEditSave() {
    if (!editUser) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const updated = await updateUserAccount(editUser.userId, editUsername, editEmail);
      setUsers((current) =>
        current.map((row) => (row.userId === updated.userId ? updated : row))
      );
      setEditUser(null);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "Could not update account");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteUserAccount(deleteUser.userId);
      setUsers((current) => current.filter((row) => row.userId !== deleteUser.userId));
      setDeleteUser(null);
    } catch (removeError) {
      setDeleteError(removeError instanceof Error ? removeError.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  }

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

          <button
            type="button"
            className={`admin-nav-item${section === "adverts" ? " is-active" : ""}`}
            onClick={() => setSection("adverts")}
          >
            Adverts
          </button>
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-identity">
            <span className="admin-avatar">{adminName.slice(0, 2).toUpperCase()}</span>
            <span className="admin-identity-text">
              <strong>{adminName}</strong>
              <small>{admin.role}</small>
            </span>
          </div>
          {sessionError && (
            <p className="admin-session-error" role="alert">
              {sessionError}
            </p>
          )}
          <button
            type="button"
            className="admin-logout"
            disabled={signingOut}
            onClick={handleLogout}
          >
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {section === "reports" ? <SupportReports /> : section === "adverts" ? <CreateAdvert /> : section === "home" ? (
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
            <header className="admin-header admin-players-heading">
              <h1>Players</h1>
            </header>

            <section className="admin-players" aria-label="Players">
              <div className="admin-players-toolbar">
                <input
                  id="player-search"
                  className="admin-search"
                  type="search"
                  value={query}
                  placeholder="Search players"
                  aria-label="Search players"
                  onChange={(event) => setQuery(event.target.value)}
                />
                {!loading && !error && (
                  <p className="admin-players-count">
                    {visibleUsers.length}{" "}
                    {visibleUsers.length === 1 ? "player" : "players"}
                  </p>
                )}
              </div>

              {actionError && (
                <p className="admin-players-alert" role="alert">
                  {actionError}
                </p>
              )}

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Guest</th>
                      <th>Banned</th>
                      <th className="is-num">Balance</th>
                      <th>Created</th>
                      <th className="is-action">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td className="admin-table-status" colSpan={8}>
                          Loading players…
                        </td>
                      </tr>
                    )}
                    {!loading && error && (
                      <tr>
                        <td className="admin-table-status" colSpan={8} role="alert">
                          {error}
                        </td>
                      </tr>
                    )}
                    {!loading && !error && visibleUsers.length === 0 && (
                      <tr>
                        <td className="admin-table-status" colSpan={8}>
                          {users.length === 0 ? "No players." : "No matches."}
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      !error &&
                      visibleUsers.map((user) => (
                        <tr key={user.userId}>
                          <td className="admin-cell-name">{user.username}</td>
                          <td className="admin-cell-muted">{user.email}</td>
                          <td>
                            <span
                              className={`admin-tag${user.role === "admin" ? " is-admin" : ""}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td>
                            {user.isGuest ? (
                              <span className="admin-tag">Guest</span>
                            ) : (
                              <span className="admin-dash">—</span>
                            )}
                          </td>
                          <td>
                            {user.isBanned ? (
                              <span className="admin-tag is-banned">Banned</span>
                            ) : (
                              <span className="admin-dash">—</span>
                            )}
                          </td>
                          <td className="is-num">{formatBalance(user.balance)}</td>
                          <td className="admin-cell-muted">
                            {formatCreatedAt(user.createdAt)}
                          </td>
                          <td className="is-action">
                            {user.userId === adminId ? (
                              <span className="admin-dash">—</span>
                            ) : (
                              <div className="admin-row-actions">
                                {user.role !== "admin" && (
                                  <button
                                    type="button"
                                    className="admin-ban-button"
                                    onClick={() => openEdit(user)}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={`admin-ban-button${user.isBanned ? " is-unban" : ""}`}
                                  disabled={pendingUserId === user.userId}
                                  onClick={() => handleBanToggle(user)}
                                >
                                  {pendingUserId === user.userId
                                    ? "Saving"
                                    : user.isBanned
                                      ? "Unban"
                                      : "Ban"}
                                </button>
                                {user.role !== "admin" && (
                                  <button
                                    type="button"
                                    className="admin-ban-button is-unban"
                                    onClick={() => {
                                      setDeleteError("");
                                      setDeleteUser(user);
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {editUser && (
                <AccountDialog title="Edit account" onClose={() => setEditUser(null)}>
                  <p>Username and email only.</p>
                  <label className="admin-dialog-field">
                    Username
                    <input
                      value={editUsername}
                      autoComplete="off"
                      onChange={(event) => setEditUsername(event.target.value)}
                    />
                  </label>
                  <label className="admin-dialog-field">
                    Email
                    <input
                      type="email"
                      value={editEmail}
                      autoComplete="off"
                      onChange={(event) => setEditEmail(event.target.value)}
                    />
                  </label>
                  {editError && <p className="admin-players-alert" role="alert">{editError}</p>}
                  <div className="admin-dialog-actions">
                    <button type="button" className="admin-ban-button" onClick={() => setEditUser(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-ban-button is-save"
                      disabled={savingEdit}
                      onClick={() => void handleEditSave()}
                    >
                      {savingEdit ? "Saving" : "Save"}
                    </button>
                  </div>
                </AccountDialog>
              )}

              {deleteUser && (
                <AccountDialog title={`Delete ${deleteUser.username}?`} onClose={() => setDeleteUser(null)}>
                  <p>This removes the account. Hands on a table that stays are kept as Deleted player.</p>
                  {deleteError && <p className="admin-players-alert" role="alert">{deleteError}</p>}
                  <div className="admin-dialog-actions">
                    <button type="button" className="admin-ban-button" autoFocus onClick={() => setDeleteUser(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-ban-button is-unban"
                      disabled={deleting}
                      onClick={() => void handleDelete()}
                    >
                      {deleting ? "Deleting" : "Delete"}
                    </button>
                  </div>
                </AccountDialog>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
