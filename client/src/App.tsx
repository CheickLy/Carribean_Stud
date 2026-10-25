import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useNavigate,
} from "react-router-dom";

import LoginSection from "./components/LoginSection";
import Friends from "./pages/player/Friends";
import RegistrationSection from "./components/RegistrationSection";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "./services/auth";

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginSection
      onRegisterClick={() => navigate("/register")}
      onAuthenticated={() => navigate("/play")}
    />
  );
}

function RegistrationPage() {
  const navigate = useNavigate();

  return (
    <RegistrationSection
      onBackToLogin={() => navigate("/")}
      onRegistered={() => navigate("/play")}
    />
  );
}


function PlayPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ username: string; balance: string; isGuest: boolean } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) navigate("/", { replace: true });
      else setUser(u);
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Session error"); });
    return () => { active = false; };
  }, [navigate]);
  async function handleLogout() {
    try { await logout(); navigate("/", { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : "Logout failed"); }
  }
  return <main style={{ maxWidth: 760, margin: "3rem auto", padding: "1rem" }}>
    <h1>ReefRoyale</h1>
    {error && <p role="alert">{error}</p>}
    {!user ? <p>Loading session...</p> : <>
      <p>{user.isGuest ? "Guest" : user.username} · {Number(user.balance).toFixed(2)} chips</p>
      <p>The poker game page is not in the add-friend branch yet. Your server-side balance is ready for game integration.</p>
      {user.isGuest && <button onClick={() => navigate("/register")}>Register and save my chips</button>}
      <button onClick={handleLogout}>Log out</button>
    </>}
  </main>;
}

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/register", element: <RegistrationPage /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/friends", element: <Friends /> },
  { path: "/play", element: <PlayPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
