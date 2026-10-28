import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { createLobby, getLobbies, getLobbyDetails } from "../src/modules/tables/tables.service.js";
import express from "express";
import { tablesRouter } from "../src/modules/tables/tables.routes.js";

vi.mock("../src/modules/tables/tables.service.js", () => ({
  createLobby: vi.fn(),
  getLobbies: vi.fn(),
  getLobbyDetails: vi.fn(),
}));

const validLobby = {
  name: "Friday Night Poker",
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

describe("Create Table API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("creates a lobby for an authenticated user", async () => {
  const testApp = express();

  testApp.use(express.json());


  testApp.use((req, _res, next) => {
  req.session = {
    userId: 42,
  } as typeof req.session;

  next();
});

  testApp.use("/api/lobbies", tablesRouter);

  vi.mocked(createLobby).mockResolvedValue({
    lobbyId: 1,
    hostId: 42,
    ...validLobby,
  });

  const response = await request(testApp)
    .post("/api/lobbies")
    .send(validLobby);

  expect(response.status).toBe(201);
  expect(response.body.lobbyId).toBe(1);
  expect(response.body.hostId).toBe(42);

  expect(createLobby).toHaveBeenCalledWith(validLobby, 42);
});

  it("returns active lobbies", async () => {
    vi.mocked(getLobbies).mockResolvedValue([
      { lobbyId: 1, name: "Friday Night Poker" },
    ] as any);

    const response = await request(app).get("/api/lobbies");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Friday Night Poker");
  });

  it("rejects invalid lobby settings", async () => {
    const response = await request(app)
      .post("/api/lobbies")
      .send({ ...validLobby, maxPlayers: 10 });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(createLobby).not.toHaveBeenCalled();
  });

  it("requires authentication to create a lobby", async () => {
    const response = await request(app)
      .post("/api/lobbies")
      .send(validLobby);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      "You must be signed in to create a table."
    );
    expect(createLobby).not.toHaveBeenCalled();
  });

  it("rejects malformed requests", async () => {
    const response = await request(app)
      .post("/api/lobbies")
      .send({});

    expect(response.status).toBe(400);
    expect(createLobby).not.toHaveBeenCalled();
  });
});
describe("Lobby room API", () => {
  const testApp = express();
  testApp.use((req, _res, next) => { req.session = { userId: 42 } as typeof req.session; next(); });
  testApp.use("/api/lobbies", tablesRouter);
  it("returns the member's lobby", async () => {
    vi.mocked(getLobbyDetails).mockResolvedValue({ lobbyId: 1, isHost: true } as any);
    const response = await request(testApp).get("/api/lobbies/1");
    expect(response.status).toBe(200);
    expect(getLobbyDetails).toHaveBeenCalledWith(1, 42);
  });
  it("rejects nonmembers and invalid IDs", async () => {
    vi.mocked(getLobbyDetails).mockResolvedValue(null);
    expect((await request(testApp).get("/api/lobbies/1")).status).toBe(404);
    expect((await request(testApp).get("/api/lobbies/nope")).status).toBe(400);
    expect((await request(app).get("/api/lobbies/1")).status).toBe(401);
  });
});
