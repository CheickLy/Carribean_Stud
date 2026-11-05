import { Card, RANKS, SUITS } from "./card.js";
import { Hand, type HandRankName } from "./hand.js";

export type DealtHand = {
  cards: string[];
  rank: HandRankName;
};

export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = RANKS.flatMap((rank) => SUITS.map((suit) => new Card(rank, suit)));
  }

  shuffle(): void {
    for (let index = this.cards.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const current = this.cards[index];
      this.cards[index] = this.cards[swap];
      this.cards[swap] = current;
    }
  }

  draw(count: number): Card[] {
    return this.cards.splice(0, count);
  }
}

export function dealTable(): { player: DealtHand; dealer: DealtHand } {
  const deck = new Deck();
  deck.shuffle();
  return {
    player: dealtHand(deck.draw(5)),
    dealer: dealtHand(deck.draw(5)),
  };
}

function dealtHand(cards: Card[]): DealtHand {
  return {
    cards: cards.map((card) => card.toText()),
    rank: new Hand(cards).rank().name,
  };
}
