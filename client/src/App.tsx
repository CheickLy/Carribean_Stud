import { createBrowserRouter, Link, NavLink, Navigate, Outlet, RouterProvider, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import LoginSection from "./components/LoginSection";
import RegistrationSection from "./components/RegistrationSection";
import CreateLobby from "./pages/CreateLobby";
import LobbyBrowser from "./pages/LobbyBrowser";
import SharedGameplay from "./pages/SharedGameplay";
import GameTutorial from "./pages/GameTutorial";
import Friends from "./pages/player/Friends";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LobbyRoom from "./pages/LobbyRoom";
import Avatar from "./pages/player/Avatar";
import Profile, { ProfileComingSoon } from "./pages/player/Profile";
import GameRules from "./pages/GameRules";
import GamePreview from "./pages/GamePreview";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/player/Messages";
import Home from "./pages/guest/Home";
import { getCurrentUser, logout } from "./services/auth";
import "./styles/Navigation.css";
import ContactSupport from "./pages/ContactSupport";
import suitClubMark from "./assets/gameplay/suit-club-mark.svg";


type User = { username: string; balance: string; isGuest: boolean; role: string; avatar?: string };
type Session = { user: User | null; loading: boolean; error: string; signOut?: () => Promise<void> };

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session>({ user: null, loading: true, error: "" });
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 8);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);
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
  useEffect(() => {
    const updateBalance = (event: Event) => {
      const balance = (event as CustomEvent<string>).detail;
      if (typeof balance === 'string') setSession(previous => previous.user ? { ...previous, user: { ...previous.user, balance } } : previous);
    };
    window.addEventListener('reef-balance-updated', updateBalance);
    return () => window.removeEventListener('reef-balance-updated', updateBalance);
  }, []);
  async function signOut() {
    try {
      await logout();
      setSession({ user: null, loading: false, error: "" });
      navigate("/", { replace: true });
    } catch (error) {
      setSession(previous => ({ ...previous, error: error instanceof Error ? error.message : "Could not log out" }));
    }
  }
  const gameBoard = location.pathname === "/tutorial" || location.pathname.endsWith("/game-preview") || /^\/lobbies\/[^/]+\/game$/.test(location.pathname);
  const ownHeader = gameBoard || location.pathname === "/admin";
  return <>
    {!ownHeader && <header className={`site-header${["/", "/login", "/register"].includes(location.pathname) ? " site-header-home" : ""}${scrolled ? " is-scrolled" : ""}`}>
      <Link className="site-brand" to="/">Reef Royale <img src={suitClubMark} alt="" width={21} height={21} /></Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/lobbies">Tables</NavLink>
        <NavLink to="/friends">Friends</NavLink>
        <NavLink to="/rules">Game rules</NavLink>
        {session.user && !session.user.isGuest && <NavLink to="/profile">Profile</NavLink>}
        {session.user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="site-account">
        {session.user ? <details className="site-account-menu"><summary aria-label={`${session.user.isGuest ? "Guest" : session.user.username}, ${Number(session.user.balance).toLocaleString()} points. Account menu`}><span className="site-username">{session.user.isGuest ? "Guest" : session.user.username}</span><strong className="site-points">{Number(session.user.balance).toLocaleString()} pts</strong></summary><div className="site-account-popover">{!session.user.isGuest && <Link to="/profile" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); }}>Profile</Link>}{session.user.isGuest && <Link to="/register" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); }}>Save progress</Link>}<button onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); void signOut(); }}>Log out</button></div></details> : <Link to="/login">Sign in</Link>}
      </div>
    </header>}
    {session.error && <p className="site-error" role="alert">{session.error}</p>}
    <Outlet context={{ ...session, signOut }} />
    {!gameBoard && !["/admin", "/login", "/register"].includes(location.pathname) && <footer className={`site-footer${["/login", "/register"].includes(location.pathname) ? " site-footer-auth" : ""}`}><div className="site-footer-inner"><strong>18+</strong><p>For adults 18 and over. Points are fictional and have no cash value. Play responsibly and respect other players.</p><Link to="/support">Contact support</Link></div></footer>}
  </>;
}

function RequireSession({ admin = false }: { admin?: boolean }) {
  const { user, loading, error } = useOutletContext<Session>();
  const location = useLocation();
  if (loading) return <main><p role="status">Loading session...</p></main>;
  if (error) return <main><p>Unable to check your session. Please refresh to try again.</p></main>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role.trim().toLowerCase() !== "admin") return <main><h1>Administrator access required</h1><Link to="/lobbies">Browse tables</Link></main>;
  return <Outlet context={{ user, loading, error }} />;
}

function HomePage() {
  const { user, loading, signOut } = useOutletContext<Session>();
  return <Home user={user} loading={loading} onLogout={signOut} sharedNavigation />;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const destination = location.state?.from;

  async function handleAuthenticated(role?: string) {
    let resolvedRole = role;

    try {
      const currentUser = await getCurrentUser();
      resolvedRole = currentUser?.role ?? resolvedRole;
    } catch {
      // The route guard will display the session error if the follow-up check fails.
    }

    navigate(
      resolvedRole?.trim().toLowerCase() === "admin"
        ? "/admin"
        : typeof destination === "string" && destination.startsWith("/") && !destination.startsWith("//")
          ? destination
          : "/lobbies",
      { replace: true },
    );
  }

  return <LoginSection beachBackground onRegisterClick={() => navigate("/register", { state: location.state })} onAuthenticated={(role) => { void handleAuthenticated(role); }} />;

}

function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  return <RegistrationSection beachBackground onBackToLogin={() => navigate("/login", { state: location.state })} onRegistered={() => navigate("/lobbies", { replace: true })} />;
}

const router = createBrowserRouter([{
  element: <Layout />,
  children: [
    { path: "/", element: <HomePage /> },
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegistrationPage /> },
    { path: "/support", element: <ContactSupport /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/reset-password", element: <ResetPassword /> },
    { path: "/rules", element: <GameRules /> },
    { path: "/game-preview", element: <GamePreview /> },
    { path: "/tutorial", element: <GameTutorial /> },
    { path: "/lobbies", element: <LobbyBrowser /> },
    { element: <RequireSession />, children: [
      { path: "/play", element: <Navigate to="/lobbies" replace /> },
      { path: "/friends", element: <Friends /> },
      { path: "/profile", element: <Profile /> },
      { path: "/profile/statistics", element: <ProfileComingSoon title="Statistics" /> },
      { path: "/profile/history", element: <ProfileComingSoon title="Game History" /> },
      { path: "/profile/avatar", element: <Avatar /> },
      { path: "/friends/:friendId/messages", element: <Messages /> },
      { path: "/create-lobby", element: <CreateLobby /> },
      { path: "/lobbies/:lobbyId/game", element: <SharedGameplay /> },
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
