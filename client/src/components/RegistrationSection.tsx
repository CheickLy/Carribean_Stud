
import { useEffect, useRef, useState, type FormEvent } from "react";
import { register } from "../services/auth";
import "../styles/LoginSection.css";
import PasswordInput from "./PasswordInput";

type RegistrationSectionProps = {
  onBackToLogin: () => void;
  onRegistered: () => void;
  beachBackground?: boolean;
};

export default function RegistrationSection({
  onBackToLogin,
  onRegistered,
  beachBackground = false,
}: RegistrationSectionProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      setPassword("");
      setConfirmPassword("");
      onRegistered();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`login-section${beachBackground ? " login-section-beach" : ""}`}>
      {beachBackground && <><video ref={videoRef} className="login-beach-video" muted loop playsInline preload="auto" onPlay={() => setVideoPlaying(true)} onPause={() => setVideoPlaying(false)} aria-hidden="true"><source src="/media/beach-waves.mp4" type="video/mp4" /></video><div className="login-beach-shade" aria-hidden="true" /><button type="button" className="login-video-control" aria-label={videoPlaying ? "Pause beach video" : "Play beach video"} onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play().catch(() => setVideoPlaying(false)); else video.pause(); }}>{videoPlaying ? "Ⅱ" : "▶"}</button></>}
      <div className="login-card">
        <h2>Create your account.</h2>
        <p className="login-subtitle">Join the table and save your progress.</p>

          <form onSubmit={handleRegister}>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              title="Only letters, numbers, and underscores are allowed."
              required
            />

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="register-password">Password</label>
            <PasswordInput fieldLabel="password"
              id="register-password"
                placeholder="At least 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />

            <label htmlFor="register-confirm-password">
              Confirm password
            </label>
            <PasswordInput fieldLabel="confirm password"
              id="register-confirm-password"
                placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />

            <div className="login-actions">
              <button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Register"}
              </button>
            </div>
          </form>

        {message && <p role="status">{message}</p>}

        <p className="register-link registration-login">
          Already have an account?{" "}
          <button
            type="button"
            className="register-button"
            onClick={onBackToLogin}
          >
            Log in
          </button>
        </p>
      </div>
    </section>
  );
}
