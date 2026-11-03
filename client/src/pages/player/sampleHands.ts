// Sample hands for the preview until real hand results are connected.
export const sampleHands = [
  { id: 1, date: "Oct 29, 2026 · 8:42 PM", table: "Palm Social", ante: 25, choice: "Raise", hand: "Flush", result: "Win", net: 175 },
  { id: 2, date: "Oct 29, 2026 · 8:37 PM", table: "Palm Social", ante: 25, choice: "Fold", hand: "High card", result: "Loss", net: -25 },
  { id: 3, date: "Oct 28, 2026 · 7:12 PM", table: "Blue Lagoon", ante: 20, choice: "Raise", hand: "Two pair", result: "Win", net: 60 },
  { id: 4, date: "Oct 28, 2026 · 7:05 PM", table: "Blue Lagoon", ante: 20, choice: "Raise", hand: "Pair", result: "Tie", net: 0 },
  { id: 5, date: "Oct 27, 2026 · 9:14 PM", table: "Sunset Regulars", ante: 15, choice: "Raise", hand: "Pair", result: "Loss", net: -45 },
  { id: 6, date: "Oct 27, 2026 · 9:08 PM", table: "Sunset Regulars", ante: 15, choice: "Raise", hand: "Straight", result: "Win", net: 75 },
  { id: 7, date: "Oct 26, 2026 · 6:21 PM", table: "Palm Social", ante: 10, choice: "Fold", hand: "High card", result: "Loss", net: -10 },
  { id: 8, date: "Oct 26, 2026 · 6:15 PM", table: "Palm Social", ante: 10, choice: "Raise", hand: "Pair", result: "Win", net: 20 },
] as const;

export const sampleSummary = {
  hands: sampleHands.length,
  wins: sampleHands.filter((hand) => hand.net > 0).length,
  losses: sampleHands.filter((hand) => hand.net < 0).length,
  ties: sampleHands.filter((hand) => hand.net === 0).length,
  net: sampleHands.reduce((total, hand) => total + hand.net, 0),
};
