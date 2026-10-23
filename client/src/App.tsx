import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import LoginSection from "./components/LoginSection";
import AdminDashboard from "./pages/admin/AdminDashboard";

const router = createBrowserRouter([
  { path: "/", element: <LoginSection /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
