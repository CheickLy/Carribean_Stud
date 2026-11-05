import { Card } from "./card.js";

export const HAND_RANKS = [
  "high card",
  "pair",
  "two pair",
  "three of a kind",
  "straight",
  "flush",
  "full house",
  "four of a kind",
  "straight flush",
  "royal flush",
] as const;

export type HandRankName = (typeof HAND_RANKS)[number];

export type RankedHand = {
  name: HandRankName;
  strength: number;
  tieBreakers: number[];
};

const CATEGORIES: Record<string, { name: HandRankName; strength: number }> = {
  "41": { name: "four of a kind", strength: 7 },
  "32": { name: "full house", strength: 6 },
  "311": { name: "three of a kind", strength: 3 },
  "221": { name: "two pair", strength: 2 },
  "2111": { name: "pair", strength: 1 },
  "11111": { name: "high card", strength: 0 },
};

export class Hand {
  readonly cards: readonly Card[];

  constructor(cards: readonly Card[]) {
    if (cards.length !== 5) {
      throw new Error("A hand must contain five cards.");
    }
    const seen = new Set(cards.map((card) => card.toText()));
    if (seen.size !== cards.length) {
      throw new Error("A hand cannot contain a duplicate card.");
    }
    this.cards = [...cards];
  }

  static fromTexts(texts: readonly string[]): Hand {
    return new Hand(texts.map((text) => Card.fromText(text)));
  }

  rank(): RankedHand {
    return rankCards(this.cards);
  }

  compare(other: Hand): -1 | 0 | 1 {
    return compareRanked(this.rank(), other.rank());
  }
}

export function compareHands(left: Hand, right: Hand): "left" | "right" | "tie" {
  const result = left.compare(right);
  if (result > 0) {
    return "left";
  }
  if (result < 0) {
    return "right";
  }
  return "tie";
}

function rankCards(cards: readonly Card[]): RankedHand {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const value = card.rankValue();
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const flush = cards.every((card) => card.suit === cards[0]?.suit);
  const straightHigh = straightHighCard(counts);

  if (flush && straightHigh !== null) {
    if (straightHigh === 14) {
      return { name: "royal flush", strength: 9, tieBreakers: [14] };
    }
    return { name: "straight flush", strength: 8, tieBreakers: [straightHigh] };
  }

  const groups = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return right[0] - left[0];
  });
  const tieBreakers = groups.map(([value]) => value);

  if (straightHigh !== null) {
    return { name: "straight", strength: 4, tieBreakers: [straightHigh] };
  }
  if (flush) {
    return { name: "flush", strength: 5, tieBreakers };
  }

  const category = CATEGORIES[groups.map(([, count]) => count).join("")];
  if (!category) {
    throw new Error("Unable to rank hand.");
  }
  return { name: category.name, strength: category.strength, tieBreakers };
}

function straightHighCard(counts: Map<number, number>): number | null {
  if (counts.size !== 5) {
    return null;
  }
  const unique = [...counts.keys()].sort((left, right) => left - right);
  if (unique.join(",") === "2,3,4,5,14") {
    return 5;
  }
  if (unique[4] - unique[0] === 4) {
    return unique[4];
  }
  return null;
}

function compareRanked(left: RankedHand, right: RankedHand): -1 | 0 | 1 {
  if (left.strength !== right.strength) {
    return left.strength > right.strength ? 1 : -1;
  }
  const length = Math.max(left.tieBreakers.length, right.tieBreakers.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left.tieBreakers[index] ?? 0;
    const rightValue = right.tieBreakers[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1;
    }
  }
  return 0;
}
