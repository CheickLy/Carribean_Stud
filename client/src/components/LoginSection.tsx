import {useState, type FormEvent } from "react";
import { login } from "../services/auth";
import "../styles/LoginSection.css";

export default function LoginSection() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setLoading(true);


        try {
            await login(email, password);
            setMessage("Login successful!");
        } catch (error: any) {
          setMessage(error instanceof Error ? error.message :  "Login failed");

        } finally {
            setLoading(false);
        }
    }

    return (
       <section className="login-section">
        <div className="login-intro">
            <span className="eyebrow"> NO ACCOUNT REQUIRED</span>
            <h1> Play as a guest, or save your progress.</h1>
            <p> Start as a guest. Register with a username and avatar to keep your current point balance and track wins and losses. </p>
            <button type="button" className="guest-button">Play as Guest</button>
        </div>

        <div className = "login-card">
        <h2>Welcome back.</h2>

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <div className="login-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
            <a href="/forgot-password">Forgot password?</a>
          </div>

          {message && <p role="status">{message}</p>}
        </form>

        <p className="register-link">
          New here? <a href="/register">Create your free account →</a>
        </p>
      </div>
    </section>
  );
}

