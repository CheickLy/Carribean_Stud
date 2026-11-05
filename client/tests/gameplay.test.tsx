import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Gameplay from "../src/pages/Gameplay";

const game = vi.hoisted(() => ({ dealTable: vi.fn() }));

vi.mock("../src/services/game", () => game);

const deal = {
  dealer: { cards: ["2C", "3D", "4H", "5S", "7C"], rank: "pair" },
  player: { cards: ["AS", "KH", "QD", "JC", "10S"], rank: "high card" },
};

describe("Gameplay deal", () => {
  beforeEach(() => {
    game.dealTable.mockResolvedValue(deal);
  });

  it("shows ten face-up cards and both hand ranks", async () => {
    render(<MemoryRouter><Gameplay /></MemoryRouter>);

    expect(await screen.findByRole("img", { name: "Two of clubs" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Three of diamonds" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Four of hearts" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Five of spades" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Seven of clubs" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Ace of spades" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "King of hearts" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Queen of diamonds" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Jack of clubs" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Ten of spades" })).toBeTruthy();
    expect(screen.getByText("Pair")).toBeTruthy();
    expect(screen.getByText("High card")).toBeTruthy();
  });
});
