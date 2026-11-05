import { createBrowserRouter, Link, NavLink, Navigate, Outlet, RouterProvider, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import LoginSection from "./components/LoginSection";
import RegistrationSection from "./components/RegistrationSection";
import CreateLobby from "./pages/CreateLobby";
import LobbyBrowser from "./pages/LobbyBrowser";
import Gameplay from "./pages/Gameplay";
import Friends from "./pages/player/Friends";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import LobbyRoom from "./pages/LobbyRoom";
import Avatar from "./pages/player/Avatar";
import Profile, { ProfileComingSoon } from "./pages/player/Profile";
import PlayerHome from "./pages/player/PlayerHome";
import GameRules from "./pages/GameRules";
import GamePreview from "./pages/GamePreview";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/player/Messages";
import Home from "./pages/guest/Home";
import { getCurrentUser, logout } from "./services/auth";
import "./styles/Navigation.css";
import ContactSupport from "./pages/ContactSupport";


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
  const ownHeader = location.pathname.endsWith("/game-preview") || location.pathname === "/" || location.pathname === "/play" || location.pathname === "/rules" || location.pathname === "/admin" || location.pathname.startsWith("/profile") || /^\/lobbies\/[^/]+\/game$/.test(location.pathname);
  return <>
    {!ownHeader && <header className="site-header">
      <Link className="site-brand" to="/">♠ ReefRoyale</Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/lobbies">Tables</NavLink>
        <NavLink to="/create-lobby">Create table</NavLink>
        <NavLink to="/support">Contact Support</NavLink>
        <NavLink to="/friends">Friends & invitations</NavLink>
        {session.user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="site-account">
        {session.user ? <><Link className="site-profile-link" to="/play" title={session.user.isGuest ? "Guest" : session.user.username}><span className="site-username">{session.user.isGuest ? "Guest" : session.user.username}</span><span className="site-chips"> · {Number(session.user.balance).toLocaleString()} chips</span></Link>{session.user.isGuest && <Link to="/register">Save progress</Link>}<button onClick={() => void signOut()}>Log out</button></> : <Link to="/login">Log in / Play as guest</Link>}
      </div>
    </header>}
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
  return <LoginSection onRegisterClick={() => navigate("/register", { state: location.state })} onAuthenticated={(role) => navigate(role === "admin" ? "/admin" : typeof destination === "string" && destination.startsWith("/") && !destination.startsWith("//") ? destination : "/lobbies", { replace: true })} />;
}

function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  return <RegistrationSection onBackToLogin={() => navigate("/login", { state: location.state })} onRegistered={() => navigate(location.state?.from || "/play", { replace: true })} />;
}

const router = createBrowserRouter([{
  element: <Layout />,
  children: [
    { path: "/", element: <Home /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegistrationPage /> },
    { path: "/support", element: <ContactSupport /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/rules", element: <GameRules /> },
    { path: "/game-preview", element: <GamePreview /> },
    { path: "/lobbies", element: <LobbyBrowser /> },
    { element: <RequireSession />, children: [
      { path: "/play", element: <PlayerHome /> },
      { path: "/friends", element: <Friends /> },
      { path: "/profile", element: <Profile /> },
      { path: "/profile/statistics", element: <ProfileComingSoon title="Statistics" /> },
      { path: "/profile/history", element: <ProfileComingSoon title="Game History" /> },
      { path: "/profile/avatar", element: <Avatar /> },
      { path: "/friends/:friendId/messages", element: <Messages /> },
      { path: "/create-lobby", element: <CreateLobby /> },
      { path: "/lobbies/:lobbyId/game", element: <Gameplay /> },
      { path: "/lobbies/:lobbyId/game-preview", element: <GamePreview /> },
      { path: "/lobbies/:lobbyId/invite", element: <LobbyRoom /> },
      { path: "/lobbies/:lobbyId", element: <LobbyRoom /> },
    ] },
    { element: <RequireSession admin />, children: [{ path: "/admin", element: <AdminDashboard /> }] },
    { path: "*", element: <main><h1>Page not found</h1><Link to="/">Back to home</Link></main> },
  ],
}]);

export default function App() {
  return <RouterProvider router={router} />;
}
