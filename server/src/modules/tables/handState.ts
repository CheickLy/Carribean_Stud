// A game session represents one hand. Unknown nonterminal states are treated
// conservatively as underway, so a new admission cannot enter that hand.
export function isHandInProgress(hand: { status: string } | null): boolean {
  return Boolean(hand && !["completed", "finished", "ended", "cancelled", "waiting"].includes(hand.status));
}
