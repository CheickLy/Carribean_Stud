import { useState, type FormEvent } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import "../styles/GamePreview.css";

type Card = { rank: string; suit: "♠" | "♥" | "♣" | "♦" };
type Phase = "decision" | "raised" | "folded";
const playerCards: Card[] = [{ rank: "A", suit: "♠" }, { rank: "A", suit: "♥" }, { rank: "8", suit: "♣" }, { rank: "6", suit: "♦" }, { rank: "3", suit: "♠" }];
const dealerCards: Card[] = [{ rank: "K", suit: "♣" }, { rank: "K", suit: "♦" }, { rank: "J", suit: "♥" }, { rank: "7", suit: "♠" }, { rank: "2", suit: "♣" }];

function PlayingCard({ card, hidden = false, small = false }: { card?: Card; hidden?: boolean; small?: boolean }) {
  const red = card?.suit === "♥" || card?.suit === "♦";
  return <span className={`game-card${hidden ? " game-card-back" : ""}${red ? " game-card-red" : ""}${small ? " game-card-small" : ""}`} role="img" aria-label={hidden ? "Face-down card" : `${card?.rank} ${card?.suit}`}>
    {hidden ? <span aria-hidden="true">♣</span> : <><span className="game-card-rank" aria-hidden="true">{card?.rank}</span><span className="game-card-suit" aria-hidden="true">{card?.suit}</span></>}
  </span>;
}

function Seat({ name, initials, chips, position, reconnecting = false, bot = false, revealed = false }: { name: string; initials: string; chips: number; position: string; reconnecting?: boolean; bot?: boolean; revealed?: boolean }) {
  return <article className={`game-seat game-seat-${position}${reconnecting ? " game-seat-reconnecting" : ""}`} aria-label={`${name}, ${reconnecting ? "reconnecting" : "seated"}`}>
    <div className="game-seat-person"><span className={`game-avatar${bot ? " game-avatar-bot" : ""}`}>{initials}</span><div><strong>{name}</strong><small>{chips.toLocaleString()} pts {bot && "· Bot"}</small></div></div>
    {reconnecting && <p className="game-reconnecting">Reconnecting · demo state</p>}
    <div className="game-seat-cards" aria-label={`${name}'s cards`}>
      {playerCards.map((card, index) => <PlayingCard key={index} card={card} hidden={!revealed} small />)}
    </div>
  </article>;
}

export default function GamePreview() {
  const location = useLocation();
  const context = useOutletContext<{ user?: { username: string; isGuest: boolean } } | null>();
  const username = context?.user ? context.user.isGuest ? "Guest" : context.user.username : "LoremOpus";
  const tableName = typeof location.state?.tableName === "string" ? location.state.tableName : "Palm Social";
  const [phase, setPhase] = useState<Phase>("decision");
  const [balance, setBalance] = useState(2450);
  const [hand, setHand] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([{ name: "CocoKai", text: "Good luck, everyone! ♣" }]);
  const [notice, setNotice] = useState("");
  const [reconnecting, setReconnecting] = useState(true);
  const ante = 10;
  const complete = phase !== "decision";
  const initials = username.slice(0, 2).toUpperCase();

  function raise() {
    if (phase !== "decision" || balance < ante * 2) return;
    // Fixed demonstration hand: ante 10 + raise 20 return 60 after a win.
    setBalance(value => value - ante * 2 + ante * 6);
    setPhase("raised");
    setNotice("");
  }
  function nextHand() {
    if (balance < ante * 3) { setNotice("Reset the demo chips to play another sample hand."); return; }
    setBalance(value => value - ante);
    setHand(value => value + 1);
    setPhase("decision");
    setNotice("");
  }
  function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setMessages(previous => [...previous, { name: username, text: message.trim() }]);
    setMessage("");
  }

  return <div className="game-preview">
    <header className="game-nav">
      <Link className="game-brand" to="/lobbies"><span aria-hidden="true">♠</span>Reef Royale</Link>
      <nav aria-label="Game navigation"><Link to="/lobbies">Lobbies</Link><Link to="/rules">How to play</Link><Link to="/friends">Friends</Link></nav>
      <div className="game-account"><span className="game-chip-balance"><span aria-hidden="true">◉</span> {balance.toLocaleString()} <small>demo pts</small></span><button onClick={() => { setBalance(2450); setPhase("decision"); setHand(1); setNotice("Demo reset. Your account balance is unchanged."); }}>Reset chips</button><span className="game-account-divider" /><span className="game-avatar">{initials}</span><strong>{username}</strong></div>
    </header>
    <main className="game-main">
      <div className="game-toolbar"><Link className="game-back" to="/lobbies">← <span>Lobbies</span></Link><div className="game-table-title"><strong>{tableName}</strong><span>CARIBBEAN STUD · HAND {String(hand).padStart(2, "0")}</span></div><div className="game-tools"><span className="game-preview-badge">UI PREVIEW</span><button aria-label="Toggle table chat" aria-expanded={chatOpen} aria-controls="game-chat" onClick={() => setChatOpen(value => !value)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9 9.6 9.6 0 0 1-4-.9L3 21l1.4-4.5a9 9 0 1 1 16.6-5Z" /></svg></button><button aria-label="Toggle reconnecting seat preview" aria-pressed={reconnecting} onClick={() => setReconnecting(value => !value)}>ϟ</button></div></div>
      <p className="game-demo-note">Interactive preview · Sample players and hands · Your account chips are unchanged</p>
      <section className="game-stage" aria-label="Caribbean Stud table">
        <div className="game-dealer"><span className="game-eyebrow">DEALER</span><div className="game-hand" aria-label="Dealer hand">{dealerCards.map((card, index) => <PlayingCard key={index} card={card} hidden={index > 0 && phase !== "raised"} />)}</div><p>{phase === "raised" ? "Pair of kings · Dealer qualifies" : phase === "folded" ? "Hand complete" : "Waiting for decisions…"}</p></div>
        <div className="game-felt" aria-hidden="true"><div className="game-felt-inner" /><span>Reef Royale ♣<small>CARIBBEAN STUD</small></span></div>
        <Seat name="CocoKai" initials="CK" chips={1780} position="upper-left" />
        <Seat name="SunnyJ" initials="SJ" chips={3120} position="upper-right" reconnecting={reconnecting} />
        <Seat name="BreezeBot" initials="BB" chips={1000} position="lower-left" bot />
        <Seat name="CoralBot" initials="CB" chips={1000} position="lower-right" bot />
        <div className={`game-player-hand${phase === "folded" ? " game-player-folded" : ""}`}>
          <div className="game-bets" aria-label={`Ante ${ante} points${phase === "raised" ? ", raise 20 points" : ""}`}><span className="game-chip">10</span>{phase === "raised" && <span className="game-chip game-chip-raise">20</span>}</div>
          <div className="game-hand" aria-label="Your hand">{playerCards.map((card, index) => <PlayingCard key={index} card={card} />)}</div>
          <strong className="game-hand-label">{phase === "folded" ? "You folded" : "Pair of aces"}</strong>
          <div className="game-you"><span className="game-avatar">{initials}</span><div><strong>{username}</strong><small>{balance.toLocaleString()} pts · {complete ? "Hand complete" : "Your turn"}</small></div><span className="game-turn-pill">{complete ? "✓" : "You"}</span></div>
        </div>
      </section>
      <section className="game-action-bar" aria-label="Hand actions"><div className="game-round-status" role="status" aria-live="polite"><strong>{phase === "raised" ? "Your aces take the hand." : phase === "folded" ? "A fresh hand is just around the corner." : "Your hand. Your call."}</strong><span>{notice || (phase === "raised" ? "Demo win · +30 pts net · A fixed sample outcome" : phase === "folded" ? "Ante forfeited · 10 demo pts" : "Fold, or raise twice your ante to see the dealer’s hand.")}</span></div><div className="game-action-buttons"><span className="game-ante-label">Ante · 10 placed</span>{complete ? <button className="game-raise" onClick={nextHand}>Next demo hand →</button> : <><button className="game-fold" onClick={() => { setPhase("folded"); setNotice(""); }}>Fold</button><button className="game-raise" disabled={balance < 20} onClick={raise}>Raise · 20 pts</button></>}</div></section>
      {chatOpen && <aside className="game-chat" id="game-chat" aria-label="Table chat"><div className="game-chat-heading"><div><strong>Table chat</strong><small>Local preview · Messages are not sent</small></div><button aria-label="Close table chat" onClick={() => setChatOpen(false)}>×</button></div><div className="game-chat-messages" role="log" aria-live="polite">{messages.map((item, index) => <p key={index}><strong>{item.name}</strong><span>{item.text}</span></p>)}</div><form onSubmit={sendMessage}><label className="game-sr-only" htmlFor="game-message">Message</label><input id="game-message" value={message} maxLength={300} onChange={event => setMessage(event.target.value)} placeholder="Say something friendly…" autoComplete="off" /><button type="submit" disabled={!message.trim()} aria-label="Send preview message">↑</button></form></aside>}
    </main>
    <footer className="game-footer"><strong>18+</strong><p>Free play only. All points are fictional and have no cash value. Play at your pace, and take a break when you need one.</p><Link to="/rules">♧ Table rules</Link></footer>
  </div>;
}
