import LoginSection from "../../components/LoginSection";
import RegistrationSection from "../../components/RegistrationSection";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Home.css";

const lobbies = [
  { name: "Palm Social", host: "CocoKai", detail: "Beginner friendly", seats: "5 / 6 players", points: "10–100 pts" },
  { name: "Sunset Regulars", host: "SunnyJ", detail: "Easygoing", seats: "4 / 6 players", points: "25–250 pts" },
  { name: "The Blue Lagoon", host: "ReefRider", detail: "Bots welcome", seats: "2 / 4 players", points: "10–150 pts" },
];

type HomeProps = {
  user?: { username: string; balance: string; isGuest: boolean; role: string } | null;
  loading?: boolean;
  sharedNavigation?: boolean;
  onLogout?: () => Promise<void>;
};

export default function Home({ user, loading = false, onLogout, sharedNavigation = false }: HomeProps) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<"login" | "register" | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!window.matchMedia) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!video) return;
    const syncMotion = () => {
      if (motion.matches) video.pause();
      else void video.play().catch(() => setVideoPlaying(false));
    };
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => motion.removeEventListener("change", syncMotion);
  }, []);
  const lastButton = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!dialog) return;
    lastButton.current = document.activeElement as HTMLElement;
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDialog(null); };
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])'));
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("keydown", keepFocusInside);
    return () => { document.removeEventListener("keydown", closeOnEscape); document.removeEventListener("keydown", keepFocusInside); lastButton.current?.focus(); };
  }, [dialog]);
  return <div className="home">
    {!sharedNavigation && <header className="home-nav"><strong>ReefRoyale</strong><nav aria-label="Main navigation"><a className="home-nav-explore" href="#tables">Explore tables</a>{loading ? <span role="status">Loading account...</span> : user ? <>
      <button type="button" className="home-nav-chat" onClick={() => navigate(user.isGuest ? "/lobbies" : "/profile")} aria-label={user.isGuest ? "Guest account" : "Your profile"}>{user.isGuest ? "Guest" : user.username} · {Number(user.balance).toLocaleString()} chips</button>
      <button type="button" className="home-nav-login" onClick={() => navigate("/lobbies")}>Tables</button>
      {user.role === "admin" && <button type="button" className="home-nav-chat" onClick={() => navigate("/admin")}>Admin</button>}
      {user.isGuest && <button type="button" className="home-nav-register" onClick={() => setDialog("register")}>Save progress</button>}
      <button type="button" className="home-nav-chat" onClick={() => void onLogout?.()}>Log out</button>
    </> : <><button type="button" className="home-nav-login" onClick={() => setDialog("login")}>Log in</button><button type="button" className="home-nav-register" onClick={() => setDialog("register")}>Register</button></>}</nav></header>}
    <section className="home-beach" aria-label="Welcome to Reef Royale">
      <video ref={videoRef} className="home-beach-video" muted loop playsInline preload="auto" onPlay={() => setVideoPlaying(true)} onPause={() => setVideoPlaying(false)} aria-hidden="true">
        <source src="/media/beach-waves.mp4" type="video/mp4" />
      </video>
      <div className="home-beach-shade" aria-hidden="true" />
      <div className="home-beach-center">
        <div className="home-beach-hand" role="img" aria-label="Royal flush: ten, jack, queen, king and ace of spades">
          {["10", "J", "Q", "K", "A"].map(rank => <div className="home-beach-glass-card" aria-hidden="true" key={rank}><span>{rank}<br />♠</span><b>♠</b><span className="home-beach-glass-card-reverse">{rank}<br />♠</span></div>)}
        </div>
        <p className="home-beach-description">Play Caribbean Stud against the dealer and share a table with friends.<br />Free to play with fictional points, never real money.</p>
        <div className="home-beach-actions">
          <button type="button" className="home-beach-play" onClick={() => navigate("/lobbies")}>Play now</button>
          <button type="button" className="home-beach-play home-beach-signin" onClick={() => navigate("/login")}>Sign in</button>
        </div>
      </div>
      <button type="button" className="home-beach-motion" onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play().catch(() => setVideoPlaying(false)); else video.pause(); }} aria-label={videoPlaying ? "Pause beach video" : "Play beach video"}>{videoPlaying ? "Ⅱ" : "▶"}</button>
    </section>
    <div className="home-story">
      <section className="story-section story-join" id="tables">
        <div className="story-copy"><h1><span>01</span> <em>Find Your Table</em></h1><p>Pull up a chair, meet other players, and play your hand against the dealer.</p><button className="story-cta" onClick={() => navigate("/lobbies")}>View tables <span aria-hidden="true">↗</span></button></div>
        <div className="story-table-scene"><div className="story-board-preview" role="img" aria-label="Illustration of the Reef Royale solo game board"><div className="story-board-dealer">{[{rank:"K",suit:"♣"},{rank:"K",suit:"♦"},{rank:"J",suit:"♥"},{rank:"7",suit:"♠"},{rank:"2",suit:"♣"}].map((card,i) => <div className="story-flip-card" key={i}><span className="story-flip-inner"><span className="story-flip-back">♣</span><span className={`story-flip-face${card.suit === "♥" || card.suit === "♦" ? " is-red" : ""}`}>{card.rank}<b>{card.suit}</b></span></span></div>)}</div><div className="story-board-felt"><div className="story-board-bets"><span>ANTE</span><span>RAISE</span></div><strong>Reef Royale ♣</strong><div className="story-chip-stacks" aria-hidden="true"><span className="story-chip-stack"><i /><i /><i /></span><span className="story-chip-stack"><i /><i /><i /><i /></span><span className="story-chip-stack"><i /><i /><i /></span></div><div className="story-board-hand">{[{rank:"A",suit:"♠"},{rank:"A",suit:"♥"},{rank:"8",suit:"♣"},{rank:"6",suit:"♦"},{rank:"3",suit:"♠"}].map((card,i) => <div className="story-flip-card" key={i}><span className="story-flip-inner"><span className="story-flip-back">♣</span><span className={`story-flip-face${card.suit === "♥" || card.suit === "♦" ? " is-red" : ""}`}>{card.rank}<b>{card.suit}</b></span></span></div>)}</div></div></div></div>
      </section>
      <section className="story-section story-invite">
        <div className="story-friends-scene"><div className="story-friends-panel"><div className="story-friends-title"><span>Friends</span><span aria-hidden="true">•••</span></div>{[{name:"MayaReef", initial:"M", status:"Online"},{name:"CocoKai", initial:"C", status:"Online"},{name:"SunnyJ", initial:"S", status:"At a table"}].map((friend, index) => <div className="story-friend" key={friend.name}><b className={`story-avatar story-avatar-${index}`}>{friend.initial}</b><span><strong>{friend.name}</strong><small>{friend.status}</small></span><button onClick={() => navigate("/friends")}>Invite</button></div>)}</div></div>
        <div className="story-copy"><h2><span>02</span> <em>Invite Friends</em></h2><p>Bring your favorite people together. Create a private table, send an invitation, and enjoy the game.</p><button className="story-cta" onClick={() => navigate("/friends")}>Find your friends <span aria-hidden="true">↗</span></button></div>
      </section>
      <section className="story-learn"><div className="story-learn-intro"><h2><span>03</span> How to Play</h2><p>New to Caribbean Stud? Start with the basics and take each hand at your own pace.</p><button className="story-cta" onClick={() => navigate("/rules")}>Learn the game <span aria-hidden="true">↗</span></button></div><div className="story-steps">{[{n:"01",title:"Take a seat.",text:"Choose a table and place your ante to join a hand."},{n:"02",title:"Read the table.",text:"Look at your cards and the dealer’s one visible card."},{n:"03",title:"Make your move.",text:"Raise or fold, then see how your hand compares."}].map(step => <article key={step.n}><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
    </div>
    {dialog && <div className="home-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><div className={`home-dialog ${dialog === "register" ? "home-register-dialog" : ""}`} ref={dialogRef} role="dialog" aria-modal="true" aria-label={dialog === "login" ? "Log in" : "Register"}><div className="home-dialog-top"><strong>{dialog === "login" ? "Log in" : "Create your account"}</strong><button type="button" onClick={() => setDialog(null)} aria-label="Close dialog">×</button></div>{dialog === "login" ? <LoginSection onRegisterClick={() => setDialog("register")} onAuthenticated={(role) => navigate(role === "admin" ? "/admin" : "/lobbies")} /> : <RegistrationSection onBackToLogin={() => setDialog("login")} onRegistered={() => navigate("/lobbies")} />}</div></div>}

  </div>;
}
