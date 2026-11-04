import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import express from "express";
import request from "supertest";
import { Lobby } from "../src/models/lobby.js";
import { LobbyMember } from "../src/models/lobbyMember.js";
import { User } from "../src/models/user.js";
import { Session } from "../src/models/session.js";
import { sequelize } from "../src/db/sequelize.js";
import { joinLobby } from "../src/modules/tables/join.service.js";
import { tablesRouter } from "../src/modules/tables/tables.routes.js";
vi.mock("../src/models/lobby.js", () => ({ Lobby: { findByPk: vi.fn() } }));
vi.mock("../src/models/lobbyMember.js", () => ({ LobbyMember: { findOne: vi.fn(), count: vi.fn(), create: vi.fn() } }));
vi.mock("../src/models/user.js", () => ({ User: { findByPk: vi.fn() } }));
vi.mock("../src/models/session.js", () => ({ Session: { findOne: vi.fn() } }));
vi.mock("../src/db/sequelize.js", () => ({ sequelize: { transaction: vi.fn() } }));
const transaction = { LOCK: { UPDATE: "UPDATE" } };
const lobby = { lobbyId: 1, hostId: 10, isActive: true, maxPlayers: 2, startingMoney: "200.00", isPrivate: false };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sequelize.transaction).mockImplementation(async (callback: any) => callback(transaction));
  vi.mocked(Lobby.findByPk).mockResolvedValue({ ...lobby } as Lobby);
  vi.mocked(User.findByPk).mockResolvedValue({ userId: 7, balance: "200.00" } as User);
  vi.mocked(LobbyMember.findOne).mockResolvedValue(null);
  vi.mocked(LobbyMember.count).mockResolvedValue(0);
  vi.mocked(Session.findOne).mockResolvedValue(null);
});
describe("table admission", () => {
  it("locks the lobby before counting and includes the host's implicit seat", async () => {
    expect(await joinLobby(1, 7)).toEqual({ lobbyId: 1, alreadyJoined: false, waitingForNextHand: false });
    expect(Lobby.findByPk).toHaveBeenCalledWith(1, { transaction, lock: "UPDATE" });
    expect(vi.mocked(Lobby.findByPk).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(LobbyMember.count).mock.invocationCallOrder[0]);
    expect(LobbyMember.create).toHaveBeenCalledWith({ lobbyId: 1, userId: 7, waitingForSessionId: null }, { transaction });
  });
  it("requires a correct private password", async () => {
    vi.mocked(Lobby.findByPk).mockResolvedValue({ ...lobby, isPrivate: true, passcode: await bcrypt.hash("secret", 4) } as Lobby);
    await expect(joinLobby(1, 7)).rejects.toThrow("Incorrect table password");
    await expect(joinLobby(1, 7, "wrong")).rejects.toThrow("Incorrect table password");
    expect(LobbyMember.create).not.toHaveBeenCalled();
    await expect(joinLobby(1, 7, "secret")).resolves.toHaveProperty("lobbyId", 1);
  });
  it("rejects a full table", async () => {
    vi.mocked(LobbyMember.count).mockResolvedValue(1);
    await expect(joinLobby(1, 7)).rejects.toThrow("full");
    expect(LobbyMember.create).not.toHaveBeenCalled();
  });
  it("counts a host membership only once", async () => {
    vi.mocked(LobbyMember.count).mockResolvedValue(1);
    vi.mocked(LobbyMember.findOne).mockImplementation(async (options: any) => options.where.userId === 10 ? {} as LobbyMember : null);
    await expect(joinLobby(1, 7)).resolves.toHaveProperty("alreadyJoined", false);
  });
  it.each([null, { isBanned: true, balance: "500" }, { balance: "199.99" }])("rejects invalid accounts or insufficient funds: %j", async user => {
    vi.mocked(User.findByPk).mockResolvedValue(user as User | null);
    await expect(joinLobby(1, 7)).rejects.toThrow();
    expect(LobbyMember.create).not.toHaveBeenCalled();
  });
  it.each([null, { ...lobby, isActive: false }])("rejects unavailable tables", async row => {
    vi.mocked(Lobby.findByPk).mockResolvedValue(row as Lobby | null);
    await expect(joinLobby(1, 7)).rejects.toThrow("no longer available");
  });
  it("makes retries idempotent at a full private table", async () => {
    vi.mocked(Lobby.findByPk).mockResolvedValue({ ...lobby, isPrivate: true } as Lobby);
    vi.mocked(LobbyMember.findOne).mockResolvedValue({ userId: 7 } as LobbyMember);
    await expect(joinLobby(1, 7)).resolves.toHaveProperty("alreadyJoined", true);
    expect(LobbyMember.create).not.toHaveBeenCalled();
  });
  it.each([["in_progress", 12, true], ["completed", null, false]])("handles %s hands", async (status, blockedId, waiting) => {
    vi.mocked(Session.findOne).mockResolvedValue({ sessionId: 12, status } as Session);
    expect(await joinLobby(1, 7)).toHaveProperty("waitingForNextHand", waiting);
    expect(LobbyMember.create).toHaveBeenCalledWith(expect.objectContaining({ waitingForSessionId: blockedId }), { transaction });
  });
});
function appAs(userId?: number) {
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.session = { userId } as typeof req.session; next(); });
  app.use("/api/lobbies", tablesRouter); return app;
}
describe("join endpoint", () => {
  it("uses the authenticated identity", async () => {
    expect((await request(appAs(7)).post("/api/lobbies/1/join").send({ userId: 99, startingMoney: 0 })).status).toBe(200);
    expect(LobbyMember.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 7 }), expect.anything());
  });
  it("rejects anonymous and malformed requests", async () => {
    expect((await request(appAs()).post("/api/lobbies/1/join").send({})).status).toBe(401);
    for (const id of ["bad", "0", "-1", "1.5"]) expect((await request(appAs(7)).post(`/api/lobbies/${id}/join`).send({})).status).toBe(400);
    expect((await request(appAs(7)).post("/api/lobbies/1/join").send({ passcode: 123 })).status).toBe(400);
    expect(LobbyMember.create).not.toHaveBeenCalled();
  });
  it("returns conflict when the last seat was taken", async () => {
    vi.mocked(LobbyMember.count).mockResolvedValue(1);
    expect((await request(appAs(7)).post("/api/lobbies/1/join").send({})).status).toBe(409);
  });
});
