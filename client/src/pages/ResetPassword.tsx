import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/AccountForm.css';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    const response = await fetch('http://localhost:3001/api/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.get('token'), password }),
    });
    const data = await response.json();
    setMessage(data.message || data.error || 'Request finished.');
  }

  return <main className="account-page"><section className="account-card">
    <p className="account-label">REEF ROYALE</p><h1>Choose a new password</h1>
    <p className="account-intro">Use a password you have not shared with anyone else.</p>
    <form onSubmit={submit}><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required /><small>Use 8–72 characters.</small><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /><button>Reset password</button></form>
    {message && <p role="status" className="account-message">{message}</p>}<Link className="account-back" to="/">← Back to login</Link>
  </section></main>;
}
