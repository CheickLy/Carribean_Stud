import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { getConversation, sendMessage, type FriendMessage } from '../../services/messages';
import '../../styles/Messages.css';

export default function Messages() {
  const friendId = Number(useParams().friendId);
  const [params] = useSearchParams();
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    // reload the conversation after a message is sent
    try { setMessages(await getConversation(friendId)); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not load messages.'); }
  }
  useEffect(() => {
    void getCurrentUser().then(user => setCurrentUserId(user?.userId || 0));
    void load();

    // check for new messages while the chat is open
    const refresh = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(refresh);
  }, [friendId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await sendMessage(friendId, text); setText(''); setStatus(''); await load(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not send message.'); }
  }

  return <main className="messages-page"><header><Link to="/friends">← Friends</Link><h1>Messages</h1></header>
    <section className="messages-panel"><div className="messages-player-bar"><span className="messages-player-dot" /><div><strong>{params.get('name') || 'Friend'}</strong><small>Private friend messages</small></div></div>
    <div className="messages-list">{messages.length === 0 ? <div className="messages-empty"><span aria-hidden="true">♧</span><h2>Start the conversation</h2><p>Messages will still be here when your friend returns.</p></div> : messages.map(item => <div key={item.messageId} className={item.senderId === currentUserId ? 'message-own' : 'message-other'}><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}</div>
    {status && <p role="status" className="messages-status">{status}</p>}
    <form onSubmit={submit} className="message-form"><label htmlFor="friend-message">Write a message</label><div className="message-compose"><textarea id="friend-message" maxLength={500} placeholder="Type your message..." value={text} onChange={e => setText(e.target.value)} required /><button>Send</button></div><small>{text.length}/500 characters</small></form></section>
  </main>;
}
