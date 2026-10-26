import { describe, expect, it } from "vitest";
import { validateLobby } from "../src/modules/tables/tables.validation.js";


const validLobby = {
  name: "Saturday Night Poker",
  maxPlayers: 6,
  startingMoney: 500,
  minBet: 10,
  maxBet: 100,
  isPrivate: false,
  botsEnabled: true,
  autoIncr: false,
  increaseAmount: 10,
  increaseEveryHands: 15,
};

describe("Create Lobby Validation", () => {
  it("accepts valid lobby settings", () => {
    expect(validateLobby(validLobby)).toEqual([]);
  });

  it("rejects lobby names shorter than 3 characters", () => {
    expect(validateLobby({ ...validLobby, name: "AB" }))
      .toContain("Lobby name must be between 3 and 40 characters.");
  });

  it("rejects tables with more than 6 players", () => {
    expect(validateLobby({ ...validLobby, maxPlayers: 8 }))
      .toContain("A lobby must allow between 2 and 6 players.");
  });

  it("rejects tables with fewer than 2 players", () => {
    expect(validateLobby({ ...validLobby, maxPlayers: 1 }))
      .toContain("A lobby must allow between 2 and 6 players.");
  });

  it("rejects negative minimum bets", () => {
    expect(validateLobby({ ...validLobby, minBet: -10 }))
      .toContain("Minimum bet must be greater than zero.");
  });

  it("rejects maximum bets smaller than minimum bets", () => {
    expect(validateLobby({ ...validLobby, minBet: 100, maxBet: 50 }))
      .toContain("Maximum bet must be at least the minimum bet.");
  });

  it("rejects insufficient starting money", () => {
    expect(validateLobby({ ...validLobby, startingMoney: 5 }))
      .toContain("Starting money must be at least the minimum bet.");
  });

  it("requires a password for private lobbies", () => {
    expect(validateLobby({ ...validLobby, isPrivate: true }))
      .toContain("Private lobbies require a password of at least 4 characters.");
  });

  it("accepts private lobbies with valid passwords", () => {
    const lobby = {
      ...validLobby,
      isPrivate: true,
      passcode: "reefroyale123",
    };

    expect(validateLobby(lobby)).toEqual([]);
  });

  it("rejects invalid automatic bet increases", () => {
    const lobby = {
      ...validLobby,
      autoIncr: true,
      increaseAmount: -5,
      increaseEveryHands: 0,
    };

    const errors = validateLobby(lobby);

    expect(errors).toContain(
      "Automatic increase amount must be greater than zero."
    );

    expect(errors).toContain(
      "Automatic increase interval must be a positive number of hands."
    );
  });

  it("rejects malformed requests", () => {
    expect(validateLobby(null)).toContain("Invalid lobby settings.");
    expect(validateLobby([])).toContain("Invalid lobby settings.");
  });
});