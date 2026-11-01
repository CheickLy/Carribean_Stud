import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useNavigate,
} from "react-router-dom";

import LoginSection from "./components/LoginSection";
import CreateLobby from "./pages/CreateLobby";
import LobbyBrowser from "./pages/LobbyBrowser";
import Friends from "./pages/player/Friends";
import RegistrationSection from "./components/RegistrationSection";
import AdminDashboard from "./pages/admin/AdminDashboard";
import InviteFriends from "./pages/InviteFriends";
import Avatar from "./pages/player/Avatar";
import Profile, { ProfileComingSoon } from "./pages/player/Profile";
import PlayerHome from "./pages/player/PlayerHome";
import GameRules from "./pages/GameRules";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Messages from './pages/player/Messages';
import Home from "./pages/guest/Home";

function RegistrationPage() {
  const navigate = useNavigate();

  return (
    <RegistrationSection
      onBackToLogin={() => navigate("/")}
      onRegistered={() => navigate("/play")}
    />
  );
}


const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/register", element: <RegistrationPage /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/friends", element: <Friends /> },
  { path: "/create-lobby", element: <CreateLobby /> },
  { path: "/lobbies", element: <LobbyBrowser /> },
  { path: "/play", element: <PlayerHome /> },
  { path: "/rules", element: <GameRules /> },
  { path: "/profile/avatar", element: <Avatar /> },
  { path: "/profile", element: <Profile /> },
  { path: "/profile/statistics", element: <ProfileComingSoon title="Statistics" /> },
  { path: "/profile/history", element: <ProfileComingSoon title="Game History" /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/friends/:friendId/messages", element: <Messages /> },
  {
    path: "/lobbies/:lobbyId/invite",
    element: <InviteFriends />,
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
