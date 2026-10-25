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

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginSection
      onRegisterClick={() => navigate("/register")}
    />
  );
}

function RegistrationPage() {
  const navigate = useNavigate();

  return (
    <RegistrationSection
      onBackToLogin={() => navigate("/")}
    />
  );
}


const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/register", element: <RegistrationPage /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/friends", element: <Friends /> },
  { path: "/create-lobby", element: <CreateLobby /> },
  { path: "/lobbies", element: <LobbyBrowser /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
