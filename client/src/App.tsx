
import { useState } from "react";
import LoginSection from "./components/LoginSection";
import RegistrationSection from "./components/RegistrationSection";

export default function App() {
  const [page, setPage] = useState<"login" | "register">("login");

  return page === "login" ? (
    <LoginSection onRegisterClick={() => setPage("register")} />
  ) : (
    <RegistrationSection onBackToLogin={() => setPage("login")} />
  );
}
