import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HAND_RANKS } from "../src/modules/game/hand.js";
import { Deck, dealTable } from "../src/modules/game/deal.js";
import { gameRouter } from "../src/modules/game/game.routes.js";

function appAs(userId?: number) {
  const testApp = express();
  testApp.use((req, _res, next) => {
    req.session = { userId } as typeof req.session;
    next();
  });
  testApp.use("/api/game", gameRouter);
  return testApp;
}

describe("Deck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps all 52 cards and changes their order", () => {
    const original = new Deck().draw(52).map((card) => card.toText());
    vi.spyOn(Math, "random").mockReturnValue(0);
    const deck = new Deck();

    deck.shuffle();

    const shuffled = deck.draw(52).map((card) => card.toText());
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled).size).toBe(52);
    expect([...shuffled].sort()).toEqual([...original].sort());
    expect(shuffled).not.toEqual(original);
  });
});

describe("dealTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shuffles once before either hand is drawn", () => {
    const shuffle = vi.spyOn(Deck.prototype, "shuffle");
    const draw = vi.spyOn(Deck.prototype, "draw");

    dealTable();

    expect(shuffle).toHaveBeenCalledOnce();
    expect(draw).toHaveBeenCalledTimes(2);
    expect(shuffle.mock.invocationCallOrder[0]).toBeLessThan(draw.mock.invocationCallOrder[0]);
  });

  it("deals ten distinct cards with ranked hands", () => {
    const deal = dealTable();
    const cards = [...deal.player.cards, ...deal.dealer.cards];

    expect(deal.player.cards).toHaveLength(5);
    expect(deal.dealer.cards).toHaveLength(5);
    expect(new Set(cards).size).toBe(10);
    expect(HAND_RANKS).toContain(deal.player.rank);
    expect(HAND_RANKS).toContain(deal.dealer.rank);
  });
});

describe("GET /api/game/deal", () => {
  it("requires a session", async () => {
    const response = await request(appAs()).get("/api/game/deal");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required.");
  });

  it("returns both hands for a signed-in player", async () => {
    const response = await request(appAs(7)).get("/api/game/deal");

    expect(response.status).toBe(200);
    expect(response.body.player.cards).toHaveLength(5);
    expect(response.body.dealer.cards).toHaveLength(5);
    expect(HAND_RANKS).toContain(response.body.player.rank);
    expect(HAND_RANKS).toContain(response.body.dealer.rank);
  });
});
