import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import "./GameRules.css";

type Payout = { hand: string; ante: string; raise: string };

const payouts: Payout[] = [
  { hand: "Royal flush", ante: "1 to 1", raise: "100 to 1" },
  { hand: "Straight flush", ante: "1 to 1", raise: "50 to 1" },
  { hand: "Four of a kind", ante: "1 to 1", raise: "20 to 1" },
  { hand: "Full house", ante: "1 to 1", raise: "7 to 1" },
  { hand: "Flush", ante: "1 to 1", raise: "5 to 1" },
  { hand: "Straight", ante: "1 to 1", raise: "4 to 1" },
  { hand: "Three of a kind", ante: "1 to 1", raise: "3 to 1" },
  { hand: "Two pair", ante: "1 to 1", raise: "2 to 1" },
  { hand: "One pair or high card", ante: "1 to 1", raise: "1 to 1" },
];

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
      <header className="rules-header"><div><p className="rules-kicker">REEF ROYALE / HOW TO PLAY</p><h1>Caribbean Stud rules</h1><p>A quick reference for the hand, your choices, and the payout schedule.</p></div><button type="button" onClick={() => navigate(backPath)}>← Back</button></header>
      <div className="rules-layout">
        <div><section className="rules-intro"><strong>THE SHORT VERSION</strong><p>Place an ante, look at your five cards, then fold or raise. The dealer must qualify before hands are compared.</p></section><div className="rules-grid">{steps.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{step.title}</h2><p>{step.text}</p></article>)}</div><section className="rules-note"><h2>Optional rules and side bets</h2><p>Some Caribbean Stud tables offer optional side bets. Reef Royale does not currently show a side-bet option, so the base-game payouts below are the relevant guide.</p></section></div>
        <aside className="rules-payout"><p className="rules-kicker">PAYOUT REFERENCE</p><h2>Winning hands</h2><p>When the dealer qualifies and your hand wins, the ante pays 1 to 1. The raise pays according to your hand.</p><div className="rules-table-wrap"><table><thead><tr><th scope="col">Your hand</th><th scope="col">Ante</th><th scope="col">Raise</th></tr></thead><tbody>{payouts.map((row) => <tr key={row.hand}><th scope="row">{row.hand}</th><td>{row.ante}</td><td>{row.raise}</td></tr>)}</tbody></table></div><small>These reference payouts must be checked against the S6 game engine before live settlement is enabled.</small></aside>
      </div>
    </div>
  </main>;
}
