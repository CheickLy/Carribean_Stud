import { createBrowserRouter, Link, NavLink, Navigate, Outlet, RouterProvider, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import LoginSection from "./components/LoginSection";
import RegistrationSection from "./components/RegistrationSection";
import CreateLobby from "./pages/CreateLobby";
import LobbyBrowser from "./pages/LobbyBrowser";
import Friends from "./pages/player/Friends";
import AdminDashboard from "./pages/admin/AdminDashboard";
import InviteFriends from "./pages/InviteFriends";
import Avatar from "./pages/player/Avatar";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/player/Messages";
import { AVATARS } from "./services/users";
import Home from "./pages/guest/Home";
import { getCurrentUser, logout } from "./services/auth";
import "./styles/Navigation.css";
import "./styles/Profile.css";

type User = { username: string; balance: string; isGuest: boolean; role: string; avatar?: string };
type Session = { user: User | null; loading: boolean; error: string };

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session>({ user: null, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setSession(previous => ({ ...previous, loading: true, error: "" }));
    getCurrentUser().then(user => {
      if (active) setSession({ user, loading: false, error: "" });
    }).catch(error => {
      if (active) setSession({ user: null, loading: false, error: error instanceof Error ? error.message : "Could not load session" });
    });
    return () => { active = false; };
  }, [location.pathname]);
  async function signOut() {
    try {
      await logout();
      setSession({ user: null, loading: false, error: "" });
      navigate("/", { replace: true });
    } catch (error) {
      setSession(previous => ({ ...previous, error: error instanceof Error ? error.message : "Could not log out" }));
    }
  }
  return <>
    <header className="site-header">
      <Link className="site-brand" to="/">♠ ReefRoyale</Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/lobbies">Tables</NavLink>
        <NavLink to="/create-lobby">Create table</NavLink>
        <NavLink to="/friends">Friends & invitations</NavLink>
        {session.user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="site-account">
        {session.user ? <><Link className="site-profile-link" to="/play" title={session.user.isGuest ? "Guest" : session.user.username}><span className="site-username">{session.user.isGuest ? "Guest" : session.user.username}</span><span className="site-chips"> · {Number(session.user.balance).toLocaleString()} chips</span></Link>{session.user.isGuest && <Link to="/register">Save progress</Link>}<button onClick={() => void signOut()}>Log out</button></> : <Link to="/login">Log in / Play as guest</Link>}
      </div>
    </header>
    {session.error && <p className="site-error" role="alert">{session.error}</p>}
    <Outlet context={session} />
  </>;
}

function RequireSession({ admin = false }: { admin?: boolean }) {
  const { user, loading, error } = useOutletContext<Session>();
  const location = useLocation();
  if (loading) return <main><p role="status">Loading session...</p></main>;
  if (error) return <main><p>Unable to check your session. Please refresh to try again.</p></main>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== "admin") return <main><h1>Administrator access required</h1><Link to="/lobbies">Browse tables</Link></main>;
  return <Outlet context={{ user, loading, error }} />;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from;
  return <LoginSection onRegisterClick={() => navigate("/register", { state: location.state })} onAuthenticated={() => navigate(typeof destination === "string" && destination.startsWith("/") && !destination.startsWith("//") ? destination : "/lobbies", { replace: true })} />;
}

function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  return <RegistrationSection onBackToLogin={() => navigate("/login", { state: location.state })} onRegistered={() => navigate(location.state?.from || "/lobbies", { replace: true })} />;
}

function PlayPage() {
  const { user } = useOutletContext<Session>();
  const name = user?.isGuest ? "Guest" : user?.username || "Player";
  return <div className="profile-page">
    <main className="profile-container">
      <Link className="profile-back" to="/lobbies">← Back to tables</Link>
      <header className="profile-heading">
        <div><h1>Your corner of the reef.</h1><p>Your chips, your crew, and your next table.</p></div>
        <span className="profile-badge">{user?.isGuest ? "GUEST PLAYER" : "PLAYER PROFILE"}</span>
      </header>
      <section className="profile-summary" aria-label="Player profile">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">{AVATARS.find(avatar => avatar.id === user?.avatar)?.symbol || name.charAt(0).toUpperCase()}</span>
          <div><p className="profile-eyebrow">WELCOME BACK</p><h2>{name}</h2><p>{user?.isGuest ? "Playing as a guest" : "Ready for your next table"}</p></div>
        </div>
        <div className="profile-balance"><span>Your chip balance</span><strong>{Number(user?.balance || 0).toLocaleString()}</strong><span>Free play chips · No cash value</span></div>
      </section>
      {user?.isGuest && <section className="profile-save"><div><h2>Keep your place at the table.</h2><p>Create a free account to save your chips and progress.</p></div><Link to="/register">Save my progress →</Link></section>}
      {!user?.isGuest && <p><Link className="profile-back" to="/profile/avatar">Change avatar →</Link></p>}
      <section aria-labelledby="profile-explore">
        <h2 className="profile-section-title" id="profile-explore">Where to next?</h2>
        <div className="profile-actions">
          <Link className="profile-action" to="/lobbies"><span className="profile-action-icon" aria-hidden="true">♠</span><h3>Find a table</h3><p>Explore public lobbies and find your next crew.</p><span className="profile-action-label">Browse tables →</span></Link>
          <Link className="profile-action" to="/create-lobby"><span className="profile-action-icon" aria-hidden="true">♣</span><h3>Host your own</h3><p>Set the stakes in free chips and make a table your own.</p><span className="profile-action-label">Create a table →</span></Link>
          <Link className="profile-action" to="/friends"><span className="profile-action-icon" aria-hidden="true">♥</span><h3>Bring your friends</h3><p>Find players, manage requests, and check table invitations.</p><span className="profile-action-label">See your crew →</span></Link>
        </div>
      </section>
    </main>
  </div>;
}

const router = createBrowserRouter([{
  element: <Layout />,
  children: [
    { path: "/", element: <Home /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegistrationPage /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/lobbies", element: <LobbyBrowser /> },
    { element: <RequireSession />, children: [
      { path: "/play", element: <PlayPage /> },
      { path: "/friends", element: <Friends /> },
      { path: "/profile/avatar", element: <Avatar /> },
      { path: "/friends/:friendId/messages", element: <Messages /> },
      { path: "/create-lobby", element: <CreateLobby /> },
      { path: "/lobbies/:lobbyId/invite", element: <InviteFriends /> },
    ] },
    { element: <RequireSession admin />, children: [{ path: "/admin", element: <AdminDashboard /> }] },
    { path: "*", element: <main><h1>Page not found</h1><Link to="/">Back to home</Link></main> },
  ],
}]);

export default function App() {
  return <RouterProvider router={router} />;
}
