import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import "./GameRules.css";
import { HANDS } from "../components/HandGuide";

const steps = [
  { title: "Starting a hand", text: "Each player plays against the dealer, not against the other players at the table. Everyone receives five cards; one dealer card is visible." },
  { title: "Ante bet", text: "Place an ante to enter the hand. The table's minimum and maximum bets set the allowed amount." },
  { title: "Player choices", text: "After seeing your cards, fold to end the hand and lose your ante, or raise to stay in." },
  { title: "Raise amount", text: "The raise is exactly twice your ante. An ante of 10 chips means a 20-chip raise." },
  { title: "Dealer qualification", text: "The dealer needs at least an ace and a king, or a pair or better, to qualify. If the dealer does not qualify, your ante wins 1 to 1 and your raise is returned." },
  { title: "Comparing hands", text: "If the dealer qualifies, the stronger five-card hand wins. A player win pays the ante and the raise according to the table; a loss loses both bets. A tie returns both bets." },
];

export default function GameRules() {
  const navigate = useNavigate();
  const [backPath, setBackPath] = useState("/");

  useEffect(() => {
    let active = true;
    getCurrentUser().then((user) => { if (active && user) setBackPath("/play"); }).catch(() => {});
    return () => { active = false; };
  }, []);

  return <main className="rules-page">
    <div className="rules-container">
      <header className="rules-header"><div className="rules-header-actions"><button type="button" aria-label="Back" onClick={() => navigate(backPath)}>←</button><button type="button" className="rules-play" onClick={() => navigate("/lobbies")}>Play now</button></div><div><p className="rules-kicker">REEF ROYALE / HOW TO PLAY</p><h1>Caribbean Stud rules</h1><p>A quick reference for the hand, your choices, and the payout schedule.</p></div></header>
      <div className="rules-layout">
        <article className="rules-article">
          <section className="rules-intro"><strong>TLDR</strong><p>Place an ante, look at your five cards, then fold or raise. The dealer must qualify before hands are compared.</p></section>
          <div className="rules-grid">{steps.map((step, index) => <section key={step.title}><h2><span>{String(index + 1).padStart(2, "0")}</span>{step.title}</h2><p>{step.text}</p></section>)}</div>
        </article>
        <aside className="rules-payout" aria-labelledby="hand-guide-title"><h2 id="hand-guide-title">Hand guide</h2><p>Strongest hands first. Raise payouts apply when the dealer qualifies and your hand wins.</p><div className="rules-table-wrap"><table><thead><tr><th scope="col">Your hand</th><th scope="col">Raise</th></tr></thead><tbody>{HANDS.map((hand) => <tr key={hand.rank}><th scope="row">{hand.rank === "pair" ? "One pair" : hand.rank.charAt(0).toUpperCase() + hand.rank.slice(1)}<span className="rules-hand-example">{hand.example}</span></th><td>{hand.payout} to 1</td></tr>)}</tbody></table></div><small>A winning ante pays 1 to 1. Solo practice points are separate from your account balance.</small></aside>
      </div>
    </div>
  </main>;
}
