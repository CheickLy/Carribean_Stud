
import { useState, type FormEvent } from "react";
import { register } from "../services/auth";
import "../styles/LoginSection.css";

type RegistrationSectionProps = {
  onBackToLogin: () => void;
  onRegistered?: () => void;
};

export default function RegistrationSection({
  onBackToLogin,
  onRegistered,
}: RegistrationSectionProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await register(username, email, password);

      setMessage(
        `Account created successfully for ${data.user.username}! You can now log in.`
      );

      setRegistered(true);
      if (onRegistered) onRegistered();
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-section">
      <div className="login-intro">
        <span className="eyebrow">JOIN REEFROYALE</span>

        <h1>Create your account and join the table.</h1>

        <p>
          Register to save your progress, track your balance,
          and play Caribbean Stud with other players.
        </p>
      </div>

      <div className="login-card">
        <h2>Create your account.</h2>

        {!registered ? (
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
            <input
              id="register-password"
              type="password"
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
            <input
              id="register-confirm-password"
              type="password"
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
        ) : (
          <div className="registration-success">
            <h3>Registration successful!</h3>
            <p>Your account is ready. You can now log in.</p>

            <button type="button" onClick={onBackToLogin}>
              Continue to login
            </button>
          </div>
        )}

        {message && <p role="status">{message}</p>}

        <p className="register-link">
          Already have an account?{" "}
          <button
            type="button"
            className="register-button"
            onClick={onBackToLogin}
          >
            Log in →
          </button>
        </p>
      </div>
    </section>
  );
}
