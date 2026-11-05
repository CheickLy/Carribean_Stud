import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { submitSupportTicket } from '../services/support';
import './ContactSupport.css';

const issueTypes = [
  'Account or registration',
  'Sign in or password',
  'Profile or avatar',
  'Chips or balance',
  'Creating a table',
  'Joining a table',
  'Gameplay or cards',
  'Game rules',
  'Friends or invitations',
  'Messages or chat',
  'Report a player',
  'Website or accessibility',
  'Other',
];

export default function ContactSupport() {
  const [issueType, setIssueType] = useState('');
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const [replyContact, setReplyContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser().then(user => {
      if (!active) return;
      if (user) setSignedIn(true);
      if (user?.email) setReplyContact(user.email);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const subject = `${issueType}: ${summary.trim()}`;
      const result = await submitSupportTicket(subject, message.trim(), replyContact.trim());
      setTicketId(result.ticketId);
      setIssueType('');
      setSummary('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit support request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="contact-support">
      <div className="contact-support-layout">
        <section className="contact-support-intro">
          <p className="contact-support-eyebrow">REEF ROYALE SUPPORT</p>
          <h1>How can we help?</h1>
          <p>Tell us what happened and our team can review your request.</p>
          <div className="contact-support-info">
            <span aria-hidden="true">✉</span>
            <div><strong>Send a support ticket</strong><p>Choose a topic and add the details below. Keep your ticket number after submitting.</p></div>
          </div>
          {!signedIn && <p className="contact-support-signin">You need an account or guest session to send a request. <Link to="/login">Log in or play as a guest</Link>.</p>}
        </section>

        <section className="contact-support-card" aria-label="Support request">
          {ticketId !== null ? (
            <div className="contact-support-success" role="status">
              <span className="contact-support-success-icon" aria-hidden="true">✓</span>
              <p className="contact-support-eyebrow">REQUEST RECEIVED</p>
              <h2>Your ticket is in.</h2>
              <p>Your ticket number is <strong>#{ticketId}</strong>. Keep this number if you need to refer to your request later.</p>
              <button type="button" onClick={() => setTicketId(null)}>Send another request</button>
            </div>
          ) : (
            <>
              <div className="contact-support-card-heading"><p className="contact-support-eyebrow">CONTACT FORM</p><h2>Send us a message</h2><p>Fields marked * are required.</p></div>
              <form onSubmit={handleSubmit}>
                <label htmlFor="support-issue">What is your issue about? *</label>
                <select id="support-issue" value={issueType} onChange={event => setIssueType(event.target.value)} required>
                  <option value="">Select a topic</option>
                  {issueTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>

                <label htmlFor="support-subject">Brief summary *</label>
                <input id="support-subject" value={summary} onChange={event => setSummary(event.target.value)} minLength={3} maxLength={60} placeholder="A short title for your request" required />

                <label htmlFor="support-email">Reply email *</label>
                <input id="support-email" type="email" value={replyContact} onChange={event => setReplyContact(event.target.value)} maxLength={254} placeholder="you@example.com" autoComplete="email" required />

                <label htmlFor="support-message">Tell us more *</label>
                <textarea id="support-message" value={message} onChange={event => setMessage(event.target.value)} minLength={10} maxLength={2000} rows={6} placeholder="Describe what happened and what you expected to happen" required />
                <p className="contact-support-hint">Please do not include your password.</p>

                {error && <p className="contact-support-error" role="alert">{error}</p>}
                <button className="contact-support-submit" type="submit" disabled={loading}>{loading ? 'Sending request...' : 'Submit request'}</button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
