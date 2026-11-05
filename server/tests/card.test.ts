import { describe, expect, it } from "vitest";
import { Card } from "../src/modules/game/card.js";

describe("Card text", () => {
  it.each([
    ["AS", "A", "spades", 14],
    ["10H", "10", "hearts", 10],
    ["2C", "2", "clubs", 2],
    ["KD", "K", "diamonds", 13],
  ] as const)("fromText(%s) sets rank, suit, and rank value", (text, rank, suit, rankValue) => {
    const card = Card.fromText(text);

    expect(card.rank).toBe(rank);
    expect(card.suit).toBe(suit);
    expect(card.rankValue()).toBe(rankValue);
    expect(card.toText()).toBe(text);
  });

  it.each(["", "A", "1H", "XH", "ASX"])("fromText(%s) throws", (text) => {
    expect(() => Card.fromText(text)).toThrow();
  });
});
