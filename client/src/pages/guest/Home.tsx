import LoginSection from "../../components/LoginSection";
import { useNavigate } from "react-router-dom";
import "../../styles/Home.css";

const lobbies = [
  { name: "Palm Social", host: "CocoKai", detail: "Beginner friendly", seats: "5 / 6 players", points: "10–100 pts" },
  { name: "Sunset Regulars", host: "SunnyJ", detail: "Easygoing", seats: "4 / 6 players", points: "25–250 pts" },
  { name: "The Blue Lagoon", host: "ReefRider", detail: "Bots welcome", seats: "2 / 4 players", points: "10–150 pts" },
];

export default function Home() {
  const navigate = useNavigate();
  return <div className="home">
    <div className="home-ribbon"><span>✦ Free points. No cash value.</span><span>♣ Your table, your people.</span><span>♠ Learn a hand at a time.</span><span>18+ Play for the fun of it.</span></div>
    <section className="home-section home-hero">
      <p className="home-eyebrow">CARIBBEAN STUD. FREE TO PLAY.</p>
      <h1>Play cards. Meet other players.</h1>
      <p>Join a table, play against the dealer, and chat with other players.</p>
      <div className="home-grid three">
        <article className="home-feature blue"><span className="home-feature-icon">♧</span><h3>Free to play. No real money.</h3><p>Play with fictional points. No deposits, withdrawals, or cash wagering.</p></article>
        <article className="home-feature peach"><span className="home-feature-icon">♧</span><h3>Public or private tables.</h3><p>Join a public lobby or create a password-protected table for friends.</p></article>
        <article className="home-feature cream"><span className="home-feature-icon">♧</span><h3>Learn before you play.</h3><p>Follow the guided tutorial or watch a table before joining a game.</p></article>
      </div>
    </section>
    <section className="home-lobbies">
      <div className="home-section">
        <div className="home-heading"><div><p className="home-eyebrow">PUBLIC LOBBIES</p><h2>Find a table.</h2><p>Join a public lobby or watch a hand before taking a seat.</p></div><button type="button" className="home-secondary" onClick={() => navigate("/lobbies")}>Browse all lobbies</button></div>
        <div className="home-grid three">{lobbies.map(lobby => <article className="home-lobby" key={lobby.name}><div className="home-lobby-top"><span className="home-card-suit">♣</span><span className="home-pill">Public</span></div><h3>{lobby.name}</h3><p>Hosted by {lobby.host} · {lobby.detail}</p><div className="home-lobby-meta"><span>{lobby.seats}</span><span>{lobby.points}</span></div><div className="home-buttons"><button type="button" onClick={() => navigate("/lobbies")}>Join table</button><button type="button" className="home-secondary" onClick={() => navigate("/lobbies")}>Watch</button></div></article>)}</div>
        <p className="home-fineprint">Example lobbies. Player counts are not live.</p>
      </div>
    </section>
    <section className="home-friends"><div className="home-section home-friends-inner"><div className="home-chat"><span className="home-pill">Lobby chat</span><p><strong>🟡 CocoKai</strong><br/>First time here. Any tips? 🌴</p><p><strong>⚪ MayaReef</strong><br/>Welcome! We're taking it easy today.</p><button type="button" className="home-secondary" onClick={() => navigate("/friends")}>♧ Invite a friend</button></div><div><p className="home-eyebrow">PLAY WITH FRIENDS</p><h2>Invite friends to your table.</h2><p>Chat with other players, add friends, and send invitations to your lobby.</p><strong className="home-accent">Public and private lobbies · Unlimited spectators</strong></div></div></section>
    <section id="how-to-play" className="home-section home-guide"><div className="home-heading"><div><p className="home-eyebrow">HOW TO PLAY</p><h2>Your hand against the dealer’s.</h2><p>Caribbean Stud is played against the dealer, not against your tablemates.</p></div><button type="button" className="home-buttons-primary" onClick={() => document.getElementById("how-to-play")?.scrollIntoView({ behavior: "smooth" })}>▷ How to play</button></div><div className="home-grid three">{[{n:"01",t:"Take your seat",d:"Choose a table that fits your point balance. Set your ante to enter a hand."},{n:"02",t:"Check your cards",d:"Check your hand alongside the dealer’s visible card. The rest stays face-down."},{n:"03",t:"Make your move",d:"Choose raise or fold. The tutorial walks through the reveal and the hand result."}].map(step=><article className="home-step" key={step.n}><span>{step.n}</span><h3>{step.t}</h3><p>{step.d}</p></article>)}</div><div className="home-guide-note"><span>A quick introduction, not a full rules reference. Review the in-game guide before playing.</span><span>Read the how-to-play guide →</span></div></section>
    <LoginSection onRegisterClick={() => navigate("/register")} onAuthenticated={() => navigate("/lobbies")} />
    <footer className="home-footer"><div className="home-section home-footer-inner"><div className="home-age">18+</div><div><h3>Play responsibly. Respect other players.</h3><p>Reef Royale is for adults 18 and over. Points are fictional and have no cash value. Take breaks and treat other players with respect.</p></div><span className="home-footer-guide">Our club guide</span></div></footer>
  </div>;
}
