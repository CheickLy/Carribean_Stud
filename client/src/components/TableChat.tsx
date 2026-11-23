import { useEffect, useState } from 'react';

type Message = { id: number; userId: number; name: string; message: string; createdAt: string };

export default function TableChat({ lobbyId, connected, onClose }: { lobbyId: string; connected: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    const response = await fetch(`/api/lobbies/${lobbyId}/game/chat`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load table chat.');
    setMessages(data);
    setError('');
  }
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!active || !connected) return;
      try { await load(); } catch (problem) { if (active) setError(problem instanceof Error ? problem.message : 'Could not load table chat.'); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => { active = false; window.clearInterval(interval); };
  }, [lobbyId, connected]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/game/chat`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: draft.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Message was not sent.');
      setMessages(data);
      setDraft('');
      setError('');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Message was not sent.'); }
    finally { setSending(false); }
  }
  return <aside className="shared-chat" id="table-chat" aria-label="Table chat"><header><h2>Table chat</h2><button type="button" aria-label="Close table chat" onClick={onClose}>×</button></header><p>Only players seated at this table can read and send messages.</p><div className="shared-chat-list" role="log" aria-live="polite">{messages.length ? messages.map(item => <div key={item.id}><small>{item.name} · {new Date(item.createdAt).toLocaleTimeString()}</small><span>{item.message}</span></div>) : <p>No messages yet.</p>}</div>{error && <p role="alert">{error}</p>}<form onSubmit={send}><label htmlFor="table-chat-message">Message</label><div><input id="table-chat-message" maxLength={300} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message" disabled={!connected || sending} /><button type="submit" disabled={!connected || sending || !draft.trim()}>Send</button></div></form></aside>;
}
