import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AccountForm.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetPath, setResetPath] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    // ask the server to create a short-lived reset link
    const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setMessage(data.message || data.error || 'Request finished.');
    setResetPath(data.resetPath || '');
  }

  return <main className="account-page"><section className="account-card">
    <p className="account-label">REEF ROYALE</p><h1>Forgot your password?</h1>
    <p className="account-intro">Enter the email connected to your account. The reset link expires after 15 minutes.</p>
    <form onSubmit={submit}><label htmlFor="reset-email">Email address</label><input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /><button>Request reset link</button></form>
    {message && <p role="status" className="account-message">{message}</p>}
    {resetPath && <Link className="account-primary-link" to={resetPath}>Open development reset link →</Link>}
    <Link className="account-back" to="/">← Back to login</Link>
  </section></main>;
}
