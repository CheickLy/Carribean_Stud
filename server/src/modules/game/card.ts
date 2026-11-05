export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

const SUIT_BY_LETTER: Record<string, Suit> = {
  C: "clubs",
  D: "diamonds",
  H: "hearts",
  S: "spades",
};

const LETTER_BY_SUIT: Record<Suit, string> = {
  clubs: "C",
  diamonds: "D",
  hearts: "H",
  spades: "S",
};

export class Card {
  readonly rank: Rank;
  readonly suit: Suit;

  constructor(rank: Rank, suit: Suit) {
    this.rank = rank;
    this.suit = suit;
  }

  rankValue(): number {
    return RANKS.indexOf(this.rank) + 2;
  }

  toText(): string {
    return `${this.rank}${LETTER_BY_SUIT[this.suit]}`;
  }

  static fromText(text: string): Card {
    const suit = SUIT_BY_LETTER[text.slice(-1)];
    const rankText = text.slice(0, -1);
    if (!suit || !(RANKS as readonly string[]).includes(rankText)) {
      throw new Error(`Invalid card text: ${text}`);
    }
    return new Card(rankText as Rank, suit);
  }
}
