import { describe, expect, it } from "vitest";
import { Card } from "../src/game/card.js";
import { compareHands, Hand } from "../src/game/hand.js";

const categories = [
  { name: "high card", strength: 0, cards: ["2C", "5D", "7H", "9S", "JC"] },
  { name: "pair", strength: 1, cards: ["2C", "2D", "5H", "9S", "KC"] },
  { name: "two pair", strength: 2, cards: ["2C", "2D", "5H", "5S", "KC"] },
  { name: "three of a kind", strength: 3, cards: ["2C", "2D", "2H", "5S", "KC"] },
  { name: "straight", strength: 4, cards: ["9C", "10D", "JH", "QS", "KC"] },
  { name: "flush", strength: 5, cards: ["2H", "5H", "7H", "9H", "KH"] },
  { name: "full house", strength: 6, cards: ["2C", "2D", "2H", "5S", "5C"] },
  { name: "four of a kind", strength: 7, cards: ["2C", "2D", "2H", "2S", "KC"] },
  { name: "straight flush", strength: 8, cards: ["5H", "6H", "7H", "8H", "9H"] },
  { name: "royal flush", strength: 9, cards: ["10S", "JS", "QS", "KS", "AS"] },
] as const;

const straights = {
  wheel: ["AC", "2D", "3H", "4S", "5C"],
  six: ["2C", "3D", "4H", "5S", "6C"],
  seven: ["3C", "4D", "5H", "6S", "7C"],
  eight: ["4C", "5D", "6H", "7S", "8C"],
  nine: ["5C", "6D", "7H", "8S", "9C"],
  ten: ["6C", "7D", "8H", "9S", "10C"],
  jack: ["7C", "8D", "9H", "10S", "JC"],
  queen: ["8C", "9D", "10H", "JS", "QC"],
  king: ["9C", "10D", "JH", "QS", "KC"],
  ace: ["10C", "JD", "QH", "KS", "AC"],
} as const;

function cards(texts: readonly string[]): Card[] {
  return texts.map((text) => Card.fromText(text));
}

function expectWinner(
  left: readonly string[],
  right: readonly string[],
  winner: "left" | "right" | "tie",
) {
  const leftHand = Hand.fromTexts(left);
  const rightHand = Hand.fromTexts(right);
  const swapped = winner === "tie" ? "tie" : winner === "left" ? "right" : "left";
  const comparison = winner === "left" ? 1 : winner === "right" ? -1 : 0;

  expect(compareHands(leftHand, rightHand)).toBe(winner);
  expect(compareHands(rightHand, leftHand)).toBe(swapped);
  expect(leftHand.compare(rightHand)).toBe(comparison);
  expect(rightHand.compare(leftHand)).toBe(comparison === 0 ? 0 : -comparison);
}

describe("Hand ranking", () => {
  it.each(categories)("ranks $name at strength $strength", ({ name, strength, cards: texts }) => {
    expect(Hand.fromTexts(texts).rank()).toMatchObject({ name, strength });
  });

  it("rejects a short, long, or duplicate hand", () => {
    const four = cards(["AS", "KD", "QH", "JC"]);
    const six = cards(["AS", "KD", "QH", "JC", "10S", "9H"]);
    const duplicate = cards(["AS", "AS", "KD", "QH", "JC"]);

    expect(() => new Hand(four)).toThrow();
    expect(() => new Hand(six)).toThrow();
    expect(() => new Hand(duplicate)).toThrow();
    expect(() => Hand.fromTexts(["AS", "KD", "QH", "JC"])).toThrow();
    expect(() => Hand.fromTexts(["AS", "KD", "QH", "JC", "10S", "9H"])).toThrow();
    expect(() => Hand.fromTexts(["AS", "AS", "KD", "QH", "JC"])).toThrow();
  });

  it("throws on bad card text before ranking", () => {
    expect(() => Hand.fromTexts(["AS", "KH", "QD", "JC", "XX"])).toThrow();
  });
});

describe("compareHands", () => {
  it("ranks each category above the one under it", () => {
    for (let index = 0; index < categories.length - 1; index += 1) {
      expectWinner(categories[index + 1].cards, categories[index].cards, "left");
    }
  });

  it("ranks a royal flush above high card", () => {
    expectWinner(categories[9].cards, categories[0].cards, "left");
  });

  it("ignores card order", () => {
    const left = ["AS", "KD", "QH", "JC", "9S"];
    const right = ["2C", "3D", "4H", "5S", "7C"];

    expectWinner(left, right, "left");
    expectWinner([...left].reverse(), [...right].reverse(), "left");
  });

  it("ties the same ranks in different suits", () => {
    expectWinner(
      ["AS", "KD", "QH", "JC", "9S"],
      ["AH", "KC", "QD", "JS", "9C"],
      "tie",
    );
  });

  it("uses the fifth high-card kicker", () => {
    expectWinner(
      ["AH", "KD", "QS", "JC", "9S"],
      ["AD", "KC", "QH", "JS", "8C"],
      "left",
    );
  });

  it("uses the lowest pair kicker", () => {
    expectWinner(
      ["AC", "AD", "KH", "QS", "5C"],
      ["AH", "AS", "KD", "QC", "4D"],
      "left",
    );
  });

  it("uses the two-pair kicker when both pairs match", () => {
    expectWinner(
      ["AC", "AD", "KH", "KS", "QC"],
      ["AH", "AS", "KD", "KC", "JD"],
      "left",
    );
  });

  it("uses the lower pair when the higher pair matches", () => {
    expectWinner(
      ["AC", "AD", "KH", "KS", "QC"],
      ["AH", "AS", "QD", "QC", "KD"],
      "left",
    );
  });

  it("uses the higher pair when it is the first difference", () => {
    expectWinner(
      ["KC", "KD", "QH", "QS", "AC"],
      ["QC", "QD", "JH", "JS", "AD"],
      "left",
    );
  });

  it("uses the second three-of-a-kind kicker", () => {
    expectWinner(
      ["2C", "2D", "2H", "AS", "KC"],
      ["2S", "2C", "2D", "AD", "QS"],
      "left",
    );
  });

  it("uses the fifth flush card", () => {
    expectWinner(
      ["AH", "KH", "QH", "JH", "9H"],
      ["AD", "KD", "QD", "JD", "8D"],
      "left",
    );
  });

  it("uses the four-of-a-kind kicker", () => {
    expectWinner(
      ["2C", "2D", "2H", "2S", "AC"],
      ["2C", "2D", "2H", "2S", "KD"],
      "left",
    );
  });

  it("ranks three aces over three kings in a full house", () => {
    expectWinner(
      ["AC", "AD", "AH", "KC", "KD"],
      ["KC", "KD", "KH", "AC", "AD"],
      "left",
    );
  });

  it("ranks a 6-high straight over the wheel", () => {
    expectWinner(straights.six, straights.wheel, "left");
  });

  it("ranks an ace-high straight over a king-high straight", () => {
    expectWinner(straights.ace, straights.king, "left");
  });

  it("ranks every higher straight over the wheel", () => {
    for (const higher of [
      straights.six,
      straights.seven,
      straights.eight,
      straights.nine,
      straights.ten,
      straights.jack,
      straights.queen,
      straights.king,
      straights.ace,
    ]) {
      expectWinner(higher, straights.wheel, "left");
    }
  });

  it("ranks a 6-high straight flush over the wheel straight flush", () => {
    expectWinner(
      ["2H", "3H", "4H", "5H", "6H"],
      ["AH", "2H", "3H", "4H", "5H"],
      "left",
    );
  });

  it("ranks a royal flush over a king-high straight flush", () => {
    expectWinner(
      ["10S", "JS", "QS", "KS", "AS"],
      ["9S", "10S", "JS", "QS", "KS"],
      "left",
    );
  });
});
