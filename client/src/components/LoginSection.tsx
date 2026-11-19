
import { useEffect, useRef, useState, type FormEvent } from "react";
import { login, startGuest } from "../services/auth";
import "../styles/LoginSection.css";
import PasswordInput from "./PasswordInput";
import { Link } from "react-router-dom";

type LoginSectionProps = {
  onRegisterClick: () => void;
  onAuthenticated: (role?: string) => void;
  beachBackground?: boolean;
};

export default function LoginSection({
  onRegisterClick,
  onAuthenticated,
  beachBackground = false,
}: LoginSectionProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !window.matchMedia) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (motion.matches) video.pause(); else void video.play().catch(() => setVideoPlaying(false)); };
    sync(); motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, [beachBackground]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setInvalidCredentials(false);
    setLoading(true);

    try {
    const result = await login(email, password);
    setPassword("");
    const role = typeof result.user?.role === "string"
      ? result.user.role.trim().toLowerCase()
      : undefined;
    onAuthenticated(role);
} catch (error: unknown) {
  setInvalidCredentials(error instanceof Error && error.message === "Invalid email or password");
  setMessage(
    error instanceof Error ? error.message : "Login failed"
  );
} finally {
  setLoading(false);
}
  
  }

  return (
    <section className={`login-section${beachBackground ? " login-section-beach" : ""}`} id="sign-in" aria-label="Sign in or play as a guest">
      {beachBackground && <><video ref={videoRef} className="login-beach-video" muted loop playsInline preload="auto" onPlay={() => setVideoPlaying(true)} onPause={() => setVideoPlaying(false)} aria-hidden="true"><source src="/media/beach-waves.mp4" type="video/mp4" /></video><div className="login-beach-shade" aria-hidden="true" /><button type="button" className="login-video-control" aria-label={videoPlaying ? "Pause beach video" : "Play beach video"} onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play().catch(() => setVideoPlaying(false)); else video.pause(); }}>{videoPlaying ? "Ⅱ" : "▶"}</button></>}
      <div className="login-card">
        <h2>Welcome back.</h2>

        <form onSubmit={handleLogin}>
          {message && <p className="login-error" id="login-error" role="alert">{message}</p>}
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            aria-invalid={invalidCredentials || undefined}
            aria-describedby={invalidCredentials ? "login-error" : undefined}
            onChange={(event) => { setEmail(event.target.value); if (invalidCredentials) { setInvalidCredentials(false); setMessage(""); } }}
            required
          />

          <label htmlFor="login-password">Password</label>
          <PasswordInput fieldLabel="password"
            id="login-password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            aria-invalid={invalidCredentials || undefined}
            aria-describedby={invalidCredentials ? "login-error" : undefined}
            onChange={(event) => { setPassword(event.target.value); if (invalidCredentials) { setInvalidCredentials(false); setMessage(""); } }}
            required
          />

          <div className="login-actions"><Link to="/forgot-password">Forgot password?</Link><button type="submit" disabled={loading}>{loading ? "Logging in..." : "Sign in"}</button></div>

        </form>

        <div className="login-bottom"><button type="button" className="register-button" onClick={onRegisterClick}>Create an account</button><button type="button" className="guest-button" disabled={loading} onClick={async () => {
          setLoading(true); setMessage(""); setInvalidCredentials(false);
          try { await startGuest(); onAuthenticated(); }
          catch (error) { setMessage(error instanceof Error ? error.message : "Guest play failed"); }
          finally { setLoading(false); }
        }}>Play as guest</button></div>
      </div>
    </section>
  );
}
