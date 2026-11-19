import { useEffect } from "react";

export const HANDS = [
  { rank: "royal flush", example: "A♠ K♠ Q♠ J♠ 10♠", payout: 100 },
  { rank: "straight flush", example: "9♥ 8♥ 7♥ 6♥ 5♥", payout: 50 },
  { rank: "four of a kind", example: "9♠ 9♥ 9♦ 9♣ K♠", payout: 20 },
  { rank: "full house", example: "Q♠ Q♥ Q♦ 6♣ 6♥", payout: 7 },
  { rank: "flush", example: "A♦ J♦ 8♦ 5♦ 2♦", payout: 5 },
  { rank: "straight", example: "9♠ 8♥ 7♦ 6♣ 5♥", payout: 4 },
  { rank: "three of a kind", example: "7♠ 7♥ 7♦ K♣ 2♥", payout: 3 },
  { rank: "two pair", example: "J♠ J♥ 4♦ 4♣ A♥", payout: 2 },
  { rank: "pair", example: "10♠ 10♥ K♦ 8♣ 3♥", payout: 1 },
  { rank: "high card", example: "A♠ J♥ 9♦ 6♣ 3♥", payout: 1 },
];

export default function HandGuide({ currentRank, open, onClose, expanded, onToggleExpanded }: {
  currentRank?: string | null; open: boolean; onClose: () => void;
  expanded: boolean; onToggleExpanded: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
  if (!open) return null;
  return <aside className="hand-guide" id="hand-guide" aria-labelledby="hand-guide-title">
      <header className="hand-guide-header">
        <div><h2 id="hand-guide-title">Rules & hands</h2><span>Hands ranked strongest first</span></div>
        <div className="hand-guide-actions">
          <button className="hand-guide-expand" type="button" aria-expanded={expanded} aria-label={expanded ? "Collapse hand rankings" : "Expand hand rankings"} onClick={onToggleExpanded}>{expanded ? "⌄" : "⌃"}</button>
          <button type="button" aria-label="Close hand rankings" onClick={onClose}>×</button>
        </div>
      </header>
      <div className="hand-guide-columns" aria-hidden="true"><span>Hand</span><span>Raise payout</span></div>
      <ol className="hand-guide-list">{HANDS.map((hand) => <li key={hand.rank} className={currentRank === hand.rank ? "hand-guide-current" : undefined} aria-current={currentRank === hand.rank ? "true" : undefined}>
        <div><strong>{hand.rank === "pair" ? "One pair" : hand.rank.charAt(0).toUpperCase() + hand.rank.slice(1)}</strong>{currentRank === hand.rank && <span className="hand-guide-badge">Your hand</span>}<span className="hand-guide-example" aria-label={`Example: ${hand.example}`}>{hand.example}</span></div>
        <span className="hand-guide-payout">{hand.payout}:1</span>
      </li>)}</ol>
      <details className="hand-guide-rules">
        <summary>Game rules</summary>
        <p>Dealer qualifies with ace-king or a pair or better. A winning ante pays 1:1. A raise is twice your ante.</p>
        <p>If the dealer does not qualify, your ante wins and your raise returns. Ties return both bets.</p>
        <p>An ace can be high or low in a straight. Raise payouts apply when the dealer qualifies and you win. Compare matching ranks, then remaining cards from highest to lowest. Suits do not break ties.</p>
      </details>
    </aside>;
}
