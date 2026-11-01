import { useEffect, useState } from 'react';
import { listSupportTickets, saveSupportTicket, type SupportTicket, type TicketStatus } from '../../services/support';

export default function SupportReports() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<TicketStatus>('open');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    listSupportTickets().then((loaded) => {
      if (!active) return;
      setTickets(loaded);
      if (loaded.length) setSelectedId(loaded[0].ticketId);
    }).catch((problem) => { if (active) setError(problem instanceof Error ? problem.message : 'Could not load tickets'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selected = tickets.find((ticket) => ticket.ticketId === selectedId);
  function chooseTicket(ticket: SupportTicket) {
    setSelectedId(ticket.ticketId);
    setStatus(ticket.status);
    setNote(ticket.resolutionNote ?? '');
    setError('');
    setMessage('');
  }

  useEffect(() => {
    if (selected && !message) { setStatus(selected.status); setNote(selected.resolutionNote ?? ''); }
  }, [selectedId, tickets]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await saveSupportTicket(selected.ticketId, status, note);
      setTickets((current) => current.map((ticket) => ticket.ticketId === updated.ticketId ? updated : ticket));
      setMessage('Ticket saved.');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not save ticket'); }
    finally { setSaving(false); }
  }

  return <section className="admin-reports"><header className="admin-header"><div><h1>Support Tickets</h1><p>Review player reports and record the outcome.</p></div><span className="admin-report-count">{tickets.length} tickets</span></header>
    {loading && <p>Loading support tickets...</p>}
    {error && <p role="alert" className="admin-report-error">{error}</p>}
    {message && <p role="status" className="admin-report-success">{message}</p>}
    {!loading && !error && tickets.length === 0 && <div className="admin-report-empty"><h2>No support tickets yet</h2><p>Submitted requests will appear here.</p></div>}
    {!loading && tickets.length > 0 && <div className="admin-report-layout"><div className="admin-report-list" aria-label="Support tickets">{tickets.map((ticket) => <button type="button" key={ticket.ticketId} className={selectedId === ticket.ticketId ? 'is-selected' : ''} onClick={() => chooseTicket(ticket)}><span className={`admin-ticket-status ${ticket.status}`}>{ticket.status.replace('_', ' ')}</span><strong>{ticket.subject}</strong><small>{ticket.player?.username ?? 'Unknown player'} · {new Date(ticket.createdAt).toLocaleDateString()}</small></button>)}</div>{selected && <article className="admin-report-detail"><div className="admin-report-detail-top"><span className={`admin-ticket-status ${selected.status}`}>{selected.status.replace('_', ' ')}</span><small>Ticket #{selected.ticketId} · {new Date(selected.createdAt).toLocaleString()}</small></div><h2>{selected.subject}</h2><p className="admin-report-contact">From {selected.player?.username ?? 'Unknown player'}{selected.player?.email ? ` · ${selected.player.email}` : ''}</p><div className="admin-report-body">{selected.message}</div><div className="admin-report-form"><label htmlFor="ticket-status">Status</label><select id="ticket-status" value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><label htmlFor="ticket-note">Resolution note</label><textarea id="ticket-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} placeholder="Add a note about the report or resolution" /><button type="button" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save ticket'}</button></div></article>}</div>}
  </section>;
}
