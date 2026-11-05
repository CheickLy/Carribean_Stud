import { useState, type FormEvent } from 'react';
import { submitSupportTicket } from '../services/support';

export default function ContactSupport() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyContact, setReplyContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await submitSupportTicket(
        subject,
        message,
        replyContact
      );

      setTicketId(result.ticketId);
      setSubject('');
      setMessage('');
      setReplyContact('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit support request.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="contact-support">
      <h1>Contact Support</h1>
      <p>Report a bug or let us know what went wrong.</p>

      {ticketId !== null ? (
        <div role="status">
          <p>Support request submitted successfully!</p>
          <p>Ticket #{ticketId}</p>
          <button
            type="button"
            onClick={() => setTicketId(null)}
          >
            Submit another request
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="support-subject">Subject</label>
          <input
            id="support-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            minLength={3}
            maxLength={100}
            required
          />

          <label htmlFor="support-email">Reply email</label>
          <input
            id="support-email"
            type="email"
            value={replyContact}
            onChange={(e) => setReplyContact(e.target.value)}
            maxLength={254}
            required
          />

          <label htmlFor="support-message">Message</label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            minLength={10}
            maxLength={2000}
            required
          />

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}
    </main>
  );
}