import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { Lobby } from "../src/models/lobby.js";
import { createLobby } from "../src/modules/tables/tables.service.js";

vi.mock("../src/models/lobby.js", () => ({
  Lobby: {
    create: vi.fn(),
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