import {
    createBrowserRouter,
    Navigate,
    RouterProvider,
} from "react-router-dom";
import LoginSection from "./components/LoginSection";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Friends from "./pages/player/Friends";


const router = createBrowserRouter([
  { path: "/", element: <LoginSection /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "*", element: <Navigate to="/" replace /> },
  { path: "/friends", element: <Friends /> }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
