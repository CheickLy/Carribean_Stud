import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import arrowLeft from "../assets/gameplay/arrow-left.svg";
import suitClub from "../assets/gameplay/suit-club.svg";
import suitClubMark from "../assets/gameplay/suit-club-mark.svg";
import suitDiamond from "../assets/gameplay/suit-diamond.svg";
import suitHeart from "../assets/gameplay/suit-heart.svg";
import suitSpade from "../assets/gameplay/suit-spade.svg";
import { dealTable, getGame, heartbeat, playAction, resetGame, type GameState } from "../services/game";
import HandGuide from "../components/HandGuide";
import "../styles/Gameplay.css";

type FaceCard = { rank: string; suit: string; red?: boolean; name: string };

const SUIT_ART: Record<string, { src: string; name: string; red: boolean }> = {
  C: { src: suitClub, name: "clubs", red: false },
  D: { src: suitDiamond, name: "diamonds", red: true },
  H: { src: suitHeart, name: "hearts", red: true },
  S: { src: suitSpade, name: "spades", red: false },
};

const RANK_NAMES: Record<string, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  "10": "Ten",
  "9": "Nine",
  "8": "Eight",
  "7": "Seven",
  "6": "Six",
  "5": "Five",
  "4": "Four",
  "3": "Three",
  "2": "Two",
};

function faceCard(text: string): FaceCard {
  const suit = SUIT_ART[text.slice(-1)];
  const rank = text.slice(0, -1);
  return {
    rank,
    suit: suit.src,
    red: suit.red,
    name: `${RANK_NAMES[rank]} of ${suit.name}`,
  };
}

function rankLabel(rank: string) {
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

function handLabel(owner: string, rank: string, cards: string[]) {
  if (rank === "pair") {
    const counts = new Map<string, number>();
    for (const card of cards) {
      const value = card.slice(0, -1);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const pair = [...counts].find(([, count]) => count === 2)?.[0];
    if (pair) return `${owner} · Pair of ${RANK_NAMES[pair].toLowerCase()}s`;
  }
  return `${owner} · ${rankLabel(rank)}`;
}

function PlayingCard({ rank, suit, red, name, index = 0, reveal = false }: FaceCard & { index?: number; reveal?: boolean }) {
  return (
    <div className={`gameplay-card${reveal ? " gameplay-card-reveal" : ""}`} style={{ "--card-index": index } as CSSProperties} role="img" aria-label={name}>
      <span className={red ? "gameplay-rank gameplay-rank-red" : "gameplay-rank"}>{rank}</span>
      <img src={suit} alt="" width={31} height={31} />
    </div>
  );
}

export default function Gameplay() {
  const context = useOutletContext<{ user?: { username: string; isGuest: boolean } } | null>();
  const username = context?.user ? (context.user.isGuest ? "Guest" : context.user.username) : "You";
  const location = useLocation();
  const [connection, setConnection] = useState<"connected" | "reconnecting" | "restored">("connected");
  const [clock, setClock] = useState(Date.now());
  const [game, setGame] = useState<GameState | null>(null);
  const deal = game?.round;
  const payout = deal?.settled && typeof deal.net === "number" ? (() => {
    const folded = deal.net === -deal.ante;
    const anteNet = deal.net > 0 ? deal.ante : deal.net === 0 ? 0 : -deal.ante;
    return { folded, anteNet, raiseNet: deal.net - anteNet };
  })() : null;
  const points = (value: number) => `${value > 0 ? "+" : ""}${value.toLocaleString()} pts`;
  const [ante, setAnte] = useState(10);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [dealSequence, setDealSequence] = useState(0);
  const [motion, setMotion] = useState<"none" | "deal" | "reveal">("none");
  async function update(operation: () => Promise<GameState>, animation: "none" | "deal" | "reveal" = "none") {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await operation();
      setMotion(animation);
      if (animation === "deal") setDealSequence((value) => value + 1);
      setGame(next);
      setConnection("connected");
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update game."); setConnection("reconnecting"); }
    finally { pending.current = false; setBusy(false); }
  }
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const guideButton = useRef<HTMLButtonElement>(null);
  function closeGuide() {
    setGuideOpen(false);
    setGuideExpanded(false);
    guideButton.current?.focus();
  }
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([{ name: "CocoKai", text: "Good luck, everyone! ♣" }]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setMessages((previous) => [...previous, { name: username, text: message.trim() }]);
    setMessage("");
  }

  useEffect(() => {
    let active = true;
    let checking = false;
    let first = true;
    async function sync() {
      if (!active || checking || pending.current) return;
      checking = true;
      pending.current = true;
      try {
        const next = await heartbeat(location.pathname);
        if (!active) return;
        setGame(next);
        setError("");
        setConnection((previous) => previous === "reconnecting" || (first && next.round && !next.round.settled) ? "restored" : previous);
        first = false;
      } catch {
        if (active) setConnection("reconnecting");
      } finally {
        checking = false;
        pending.current = false;
      }
    }
    void sync();
    const timer = window.setInterval(() => void sync(), 5000);
    const offline = () => setConnection("reconnecting");
    window.addEventListener("online", sync);
    window.addEventListener("offline", offline);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", offline);
    };
  }, [location.pathname]);
  useEffect(() => {
    if (connection !== "reconnecting") return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [connection]);

  return (
    <main className={`gameplay${guideOpen ? " gameplay-guide-open" : ""}${guideExpanded ? " gameplay-guide-expanded" : ""}`}>
      <div className="gameplay-fit">
        <div className="gameplay-board">
          <Link className="gameplay-lobbies" to="/lobbies">
            <img src={arrowLeft} alt="" width={17} height={17} />
            Lobbies
          </Link>
          <div className="gameplay-tools">
            <button type="button" aria-label="Toggle table chat" aria-expanded={chatOpen} aria-controls="game-chat" onClick={() => setChatOpen((value) => !value)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9 9.6 9.6 0 0 1-4-.9L3 21l1.4-4.5a9 9 0 1 1 16.6-5Z" /></svg>
            </button>
            <button ref={guideButton} className="gameplay-guide-button" type="button" aria-expanded={guideOpen} aria-controls="hand-guide" onClick={() => guideOpen ? closeGuide() : setGuideOpen(true)}>Rules & hands</button>
          </div>

          {connection !== "connected" && <p className={`gameplay-connection gameplay-connection-${connection}`} role="status">
            {connection === "restored" ? "Connection restored · Your hand and balance are saved." : game?.round && !game.round.settled && game.reconnectDeadline
              ? clock >= game.reconnectDeadline ? "Reconnect window expired. Waiting to confirm the automatic fold." : `Reconnecting… ${Math.ceil((game.reconnectDeadline - clock) / 1000)}s remaining before automatic fold.`
              : "Reconnecting… We’ll restore your table automatically."}
          </p>}
          {error && <p className="gameplay-deal-error" role="alert">{error}</p>}
          {!game && !error && <p className="gameplay-deal-status" role="status">Loading table...</p>}

          <div key={`dealer-${dealSequence}`} className={`gameplay-dealer ${motion === "deal" ? "gameplay-dealing" : ""} ${deal?.settled && deal.message === "Dealer wins." ? "gameplay-winning-hand" : ""}`} aria-label="Dealer hand">
            {deal && <p className="gameplay-hand-rank gameplay-dealer-rank">{deal.settled ? handLabel("Dealer", deal.dealer.rank!, deal.dealer.cards) : "Dealer · four cards hidden"}</p>}
            {deal?.dealer.cards.map((text, index) => {
              const card = faceCard(text);
              return <PlayingCard key={card.name} {...card} index={index} reveal={motion === "reveal" && index > 0} />;
            })}
            {deal && !deal.settled && Array.from({ length: 4 }, (_, i) => <div key={i} className="gameplay-card gameplay-card-back" style={{ "--card-index": i + 1 } as CSSProperties} role="img" aria-label="Hidden dealer card"><span className="gameplay-card-pattern">♣</span></div>)}
          </div>

          <div className="gameplay-rail" aria-hidden="true" />
          <div className="gameplay-inset" aria-hidden="true" />

          <p className="gameplay-table-caption">CARIBBEAN STUD · SOLO TABLE</p>

          <div className="gameplay-bet-spots" aria-hidden="true"><span>ANTE</span><span>RAISE</span></div>
          <p className="gameplay-wordmark">
            Reef Royale
            <img src={suitClubMark} alt="" width={25} height={25} />
          </p>
          <p key={`ante-${dealSequence}`} className={`gameplay-ante ${motion === "deal" ? "gameplay-chip-landing" : ""}`} aria-label={`Ante ${deal?.ante ?? ante}`}>{deal?.ante ?? ante}</p>
          {deal?.settled && deal.message !== "You folded." && <p key={`raise-${dealSequence}`} className="gameplay-raise-chip" aria-label={`Raise ${deal.ante * 2}`}>{deal.ante * 2}</p>}
          <p key={`result-${dealSequence}-${deal?.settled}`} className={`gameplay-result ${deal?.settled ? "gameplay-settled" : ""} ${deal?.settled && deal.net! > 0 ? "gameplay-payout-win" : ""}`} role="status">{deal?.settled ? `${(deal.message?.startsWith("Dealer does not qualify.") ? "Dealer doesn’t qualify" : (deal.message ?? "Hand complete").replace(/[.!]$/, ""))} · ${points(deal.net!)}` : deal ? "Raise or fold" : "Choose your ante"}</p>
          {deal && payout && <details className="gameplay-breakdown"><summary>Details</summary>
            <dl>
              <div><dt>Ante · {deal.ante} staked</dt><dd>{points(payout.anteNet)}</dd></div>
              <div><dt>Raise · {payout.folded ? "not placed" : `${deal.ante * 2} staked`}</dt><dd>{payout.folded ? "—" : payout.raiseNet === 0 ? "Returned · 0 pts" : points(payout.raiseNet)}</dd></div>
            </dl>
          </details>}

          <div key={`player-${dealSequence}`} className={`gameplay-player-hand ${motion === "deal" ? "gameplay-dealing" : ""} ${deal?.settled && deal.message === "You win!" ? "gameplay-winning-hand" : ""} ${deal?.settled && deal.message === "You folded." ? "gameplay-folded-hand" : ""}`} aria-label="Your hand">
            {deal && <p className="gameplay-hand-rank gameplay-player-rank">{handLabel("You", deal.player.rank!, deal.player.cards)}</p>}
            {deal?.player.cards.map((text, index) => {
              const card = faceCard(text);
              return <PlayingCard key={card.name} {...card} index={index} />;
            })}
          </div>

          <section className="gameplay-seat" aria-label="Your seat">
            <span className="gameplay-identity">
              <span className="gameplay-player-name">{username}</span>
              <strong className="gameplay-player-balance">{game ? game.balance.toLocaleString() : "—"} <span>pts</span></strong>
            </span>
          </section>

          <div className="gameplay-bets" aria-label="Bet controls">
            {(!deal || deal.settled) ? <>
              <span className="gameplay-ante-label">Ante</span>
              <div className="gameplay-ante-presets" role="group" aria-label="Quick ante">
                {[5, 10, 25, 50].map(value => <button key={value} type="button" aria-label={`Set ante to ${value} points`} aria-pressed={ante === value} disabled={busy || connection === "reconnecting" || !game || value * 3 > game.balance} onClick={() => setAnte(value)}>{value}</button>)}
              </div>
              <label><span className="game-sr-only">Custom ante</span><input aria-label="Ante points" type="number" min="1" max="100" value={ante} onChange={(event) => setAnte(Number(event.target.value))} /></label>
              <button type="button" disabled={busy || connection === "reconnecting" || !game || !Number.isInteger(ante) || ante < 1 || ante > 100 || ante * 3 > game.balance} onClick={() => void update(() => dealTable(ante), "deal")}>{busy ? "Dealing…" : "Deal"}</button>
              {game && game.balance < 3 && <button disabled={busy || connection === "reconnecting"} onClick={() => void update(resetGame)}>Reset practice points</button>}
            </> : <>
              <button type="button" disabled={busy || connection === "reconnecting"} onClick={() => void update(() => playAction('fold'), "reveal")}>Fold</button>
              <button type="button" className="gameplay-raise" disabled={busy || connection === "reconnecting"} onClick={() => void update(() => playAction('raise'), "reveal")}>Raise · {deal.ante * 2} pts</button>
            </>}
            {error && <button disabled={busy || connection === "reconnecting"} onClick={() => void update(getGame)}>Refresh table</button>}
          </div>
          {game && (!deal || deal.settled) && Number.isInteger(ante) && ante >= 1 && ante <= 100 && ante * 3 > game.balance && <p className="gameplay-ante-help" role="status">You need {(ante * 3).toLocaleString()} pts for the ante and raise; you have {game.balance.toLocaleString()}.</p>}
        </div>
      </div>
      <HandGuide currentRank={deal?.player.rank} open={guideOpen} onClose={closeGuide} expanded={guideExpanded} onToggleExpanded={() => setGuideExpanded((value) => !value)} />
      {chatOpen && <aside className="game-chat" id="game-chat" aria-label="Table chat"><div className="game-chat-messages" role="log" aria-live="polite">{messages.map((item, index) => <p key={index}><strong>{item.name}</strong><span>{item.text}</span></p>)}</div><form onSubmit={sendMessage}><label className="game-sr-only" htmlFor="game-message">Message (press Enter to add to local preview)</label><input id="game-message" value={message} maxLength={300} onChange={(event) => setMessage(event.target.value)} placeholder="Message · Enter to send" aria-describedby="game-chat-note" autoComplete="off" /></form><small className="game-chat-note" id="game-chat-note">Local preview · Messages are not sent</small></aside>}
    </main>
  );
}
