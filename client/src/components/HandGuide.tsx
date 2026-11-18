import { useEffect } from "react";

const HANDS = [
  { rank: "royal flush", example: "A♠ K♠ Q♠ J♠ 10♠", description: "Ace-high straight, all in one suit.", payout: 100 },
  { rank: "straight flush", example: "9♥ 8♥ 7♥ 6♥ 5♥", description: "Five consecutive cards in one suit.", payout: 50 },
  { rank: "four of a kind", example: "9♠ 9♥ 9♦ 9♣ K♠", description: "Four cards of the same rank.", payout: 20 },
  { rank: "full house", example: "Q♠ Q♥ Q♦ 6♣ 6♥", description: "Three of a kind plus a pair.", payout: 7 },
  { rank: "flush", example: "A♦ J♦ 8♦ 5♦ 2♦", description: "Five cards in one suit.", payout: 5 },
  { rank: "straight", example: "9♠ 8♥ 7♦ 6♣ 5♥", description: "Five consecutive ranks. An ace can be high or low.", payout: 4 },
  { rank: "three of a kind", example: "7♠ 7♥ 7♦ K♣ 2♥", description: "Three cards of the same rank.", payout: 3 },
  { rank: "two pair", example: "J♠ J♥ 4♦ 4♣ A♥", description: "Two different pairs.", payout: 2 },
  { rank: "pair", example: "10♠ 10♥ K♦ 8♣ 3♥", description: "Two cards of the same rank.", payout: 1 },
  { rank: "high card", example: "A♠ J♥ 9♦ 6♣ 3♥", description: "No combination above; highest cards decide.", payout: 1 },
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
        <div><p>CARIBBEAN STUD</p><h2 id="hand-guide-title">Hand rankings</h2><span>Strongest to weakest · Raise payouts</span></div>
        <div className="hand-guide-actions">
          <button className="hand-guide-expand" type="button" aria-expanded={expanded} aria-label={expanded ? "Collapse hand rankings" : "Expand hand rankings"} onClick={onToggleExpanded}>{expanded ? "⌄" : "⌃"}</button>
          <button type="button" aria-label="Close hand rankings" onClick={onClose}>×</button>
        </div>
      </header>
      <p className="hand-guide-note">Dealer qualifies with ace-king or a pair or better. A winning ante pays 1 to 1. If the dealer does not qualify, your ante wins and your raise returns.</p>
      <ol className="hand-guide-list">{HANDS.map((hand) => <li key={hand.rank} className={currentRank === hand.rank ? "hand-guide-current" : undefined} aria-current={currentRank === hand.rank ? "true" : undefined}>
        <div><strong>{hand.rank === "pair" ? "One pair" : hand.rank.charAt(0).toUpperCase() + hand.rank.slice(1)}</strong>{currentRank === hand.rank && <span className="hand-guide-badge">Your hand</span>}<small>{hand.description}</small><span className="hand-guide-example" aria-label={`Example: ${hand.example}`}>{hand.example}</span></div>
        <span className="hand-guide-payout">{hand.payout} to 1</span>
      </li>)}</ol>
      <p className="hand-guide-note">Payouts apply when the dealer qualifies and you win. Ties return both bets. Within a category, compare matching ranks, then remaining cards from highest to lowest. Suits do not break ties.</p>
    </aside>;
}
