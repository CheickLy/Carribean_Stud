import { User } from "../src/models/user.js";
import { LobbyMember } from "../src/models/lobbyMember.js";
vi.mock("../src/models/user.js", () => ({ User: { findAll: vi.fn() } }));
vi.mock("../src/models/lobbyMember.js", () => ({ LobbyMember: { findAll: vi.fn() } }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { Lobby } from "../src/models/lobby.js";
import { createLobby, getLobbies, getLobbyDetails } from "../src/modules/tables/tables.service.js";

vi.mock("../src/models/lobby.js", () => ({
  Lobby: {
    create: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn(),
  },
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

describe("Create Lobby Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a public lobby with valid settings", async () => {
    vi.mocked(Lobby.create).mockResolvedValue({
      toJSON: () => ({
        lobbyId: 1,
        hostId: 1,
        ...validLobby,
        passcode: null,
      }),
    } as any);

    const result = await createLobby(validLobby, 1);

    expect(Lobby.create).toHaveBeenCalledOnce();
    expect(result.name).toBe("Friday Night Poker");
    expect(result).not.toHaveProperty("passcode");
  });

  it("hashes passwords before saving private lobbies", async () => {
    vi.mocked(Lobby.create).mockImplementation(async (values: any) => {
      return {
        toJSON: () => ({
          lobbyId: 2,
          ...values,
        }),
      } as any;
    });

    const privateLobby = {
      ...validLobby,
      isPrivate: true,
      passcode: "reefroyale123",
    };

    await createLobby(privateLobby, 1);

    const savedValues = vi.mocked(Lobby.create).mock.calls[0][0] as any;

    expect(savedValues.passcode).not.toBe("reefroyale123");

    expect(
      await bcrypt.compare("reefroyale123", savedValues.passcode)
    ).toBe(true);
  });

  it("rejects invalid lobby settings", async () => {
    const invalidLobby = {
      ...validLobby,
      maxPlayers: 10,
    };

    await expect(createLobby(invalidLobby, 1)).rejects.toThrow();

    expect(Lobby.create).not.toHaveBeenCalled();
  });

  it("uses the authenticated host ID when creating a lobby", async () => {
    vi.mocked(Lobby.create).mockResolvedValue({
      toJSON: () => ({
        lobbyId: 3,
        hostId: 42,
        ...validLobby,
      }),
    } as any);

    await createLobby(validLobby, 42);

    expect(Lobby.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: 42,
      })
    );
  });
});
 describe("Browse tables", () => {
  it("includes private tables, excludes passcodes, and counts the host only once", async () => {
    const rows = [
      { lobbyId: 1, hostId: 42, maxPlayers: 2, isPrivate: true },
      { lobbyId: 2, hostId: 42, maxPlayers: 3, isPrivate: false },
    ];
    vi.mocked(Lobby.findAll).mockResolvedValue(rows.map(row => ({ ...row, toJSON: () => row })) as any);
    vi.mocked(User.findAll).mockResolvedValue([{ userId: 42, username: "Alice" }] as any);
    vi.mocked(LobbyMember.findAll).mockResolvedValue([
      { lobbyId: 1, userId: 42 }, { lobbyId: 1, userId: 7 },
      { lobbyId: 2, userId: 7 },
    ] as any);
    const result = await getLobbies();
    expect(Lobby.findAll).toHaveBeenCalledWith({
      where: { isActive: true },
      attributes: { exclude: ["passcode"] },
      order: [["createdAt", "DESC"], ["lobbyId", "DESC"]],
    });
    expect(result).toEqual([
      { ...rows[0], creator: "Alice", seatsAvailable: 0 },
      { ...rows[1], creator: "Alice", seatsAvailable: 1 },
    ]);
  });
});

describe("Lobby details", () => {
  it("keeps room details restricted to members", async () => {
    vi.mocked(Lobby.findByPk).mockResolvedValue({ lobbyId: 1, hostId: 42, isActive: true, maxPlayers: 6, toJSON: () => ({ lobbyId: 1 }) } as any);
    vi.mocked(LobbyMember.findAll).mockResolvedValue([{ userId: 7 }] as any);
    expect(await getLobbyDetails(1, 99)).toBeNull();
    vi.mocked(User.findAll).mockResolvedValue([{ userId: 42, username: "Alice", isGuest: false }, { userId: 7, username: "guest_random", isGuest: true }] as any);
    expect(await getLobbyDetails(1, 42)).toEqual({
      lobbyId: 1, isHost: true, seatsAvailable: 4,
      players: [{ userId: 42, username: "Alice", isHost: true }, { userId: 7, username: "Guest", isHost: false }],
    });
    expect(Lobby.findByPk).toHaveBeenCalledWith(1, { attributes: { exclude: ["passcode"] } });
  });
});
