import { beforeEach, describe, expect, it, vi } from "vitest";
import { Friendship } from "../src/models/friendship.js";
import { Lobby } from "../src/models/lobby.js";
import { LobbyInvitation } from "../src/models/lobbyInvitation.js";
import { LobbyMember } from "../src/models/lobbyMember.js";
import { User } from "../src/models/user.js";
import { sequelize } from "../src/db/sequelize.js";
import {
  sendLobbyInvitation,
  getIncomingInvitations,
  respondToLobbyInvitation,
} from "../src/modules/invitations/invitations.service.js";

vi.mock("../src/models/friendship.js", () => ({
  Friendship: { findOne: vi.fn() },
}));

vi.mock("../src/models/lobby.js", () => ({
  Lobby: { findByPk: vi.fn() },
}));

vi.mock("../src/models/lobbyInvitation.js", () => ({
  LobbyInvitation: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../src/models/lobbyMember.js", () => ({
  LobbyMember: {
    findOne: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../src/models/user.js", () => ({
  User: { findByPk: vi.fn() },
}));

vi.mock("../src/db/sequelize.js", () => ({
  sequelize: { transaction: vi.fn() },
}));

const invitation = {
  invitationId: 1,
  lobbyId: 10,
  senderId: 42,
  recipientId: 7,
  status: "pending",
  save: vi.fn(),
};

const lobby = {
  lobbyId: 10,
  hostId: 42,
  isActive: true,
  maxPlayers: 6,
};

describe("Lobby Invitation Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(User.findByPk).mockResolvedValue({ userId: 7 } as User);

    vi.mocked(Friendship.findOne).mockResolvedValue({
      status: "accepted",
    } as Friendship);

    vi.mocked(Lobby.findByPk).mockResolvedValue(lobby as Lobby);

    vi.mocked(LobbyMember.findOne).mockResolvedValue(null);
    vi.mocked(LobbyMember.count).mockResolvedValue(1);

    vi.mocked(LobbyInvitation.findOne).mockResolvedValue(null);

    vi.mocked(LobbyInvitation.create).mockResolvedValue(
      invitation as unknown as LobbyInvitation
    );

    vi.mocked(sequelize.transaction).mockImplementation(
      async (callback: any) =>
        callback({
          LOCK: { UPDATE: "UPDATE" },
        })
    );
  });

  describe("Sending invitations", () => {
    it("sends an invitation to an accepted friend", async () => {
      const result = await sendLobbyInvitation(42, 7, 10);

      expect(result).toBe(invitation);

      expect(LobbyInvitation.create).toHaveBeenCalledWith({
        lobbyId: 10,
        senderId: 42,
        recipientId: 7,
        status: "pending",
      });
    });

    it("prevents users from inviting themselves", async () => {
      await expect(sendLobbyInvitation(42, 42, 10)).rejects.toThrow(
        "You cannot invite yourself."
      );
    });

    it("rejects invitations to nonexistent users", async () => {
      vi.mocked(User.findByPk).mockResolvedValue(null);

      await expect(sendLobbyInvitation(42, 7, 10)).rejects.toThrow(
        "User not found."
      );
    });

    it("rejects invitations to non-friends", async () => {
      vi.mocked(Friendship.findOne).mockResolvedValue(null);

      await expect(sendLobbyInvitation(42, 7, 10)).rejects.toThrow(
        "You can only invite accepted friends."
      );
    });

    it("rejects invitations to inactive lobbies", async () => {
      vi.mocked(Lobby.findByPk).mockResolvedValue({
        ...lobby,
        isActive: false,
      } as Lobby);

      await expect(sendLobbyInvitation(42, 7, 10)).rejects.toThrow(
        "Lobby not found or inactive."
      );
    });

    it("prevents non-hosts from sending invitations", async () => {
      vi.mocked(Lobby.findByPk).mockResolvedValue({
        ...lobby,
        hostId: 99,
      } as Lobby);

      await expect(sendLobbyInvitation(42, 7, 10)).rejects.toThrow(
        "Only the lobby host can invite friends."
      );
    });

    it("prevents inviting existing lobby members", async () => {
      vi.mocked(LobbyMember.findOne).mockResolvedValue({
        lobbyId: 10,
        userId: 7,
      } as LobbyMember);

      await expect(sendLobbyInvitation(42, 7, 10)).rejects.toThrow(
        "This friend is already in the lobby."
      );
    });

    it("prevents duplicate pending invitations", async () => {
      vi.mocked(LobbyInvitation.findOne).mockResolvedValue(
        invitation as unknown as LobbyInvitation
      );

      await expect(sendLobbyInvitation(42, 7, 10)).rejects.toThrow(
        "This friend already has a pending invitation."
      );
    });
  });

  describe("Retrieving invitations", () => {
    it("retrieves pending invitations for a user", async () => {
      vi.mocked(LobbyInvitation.findAll).mockResolvedValue([
        invitation as unknown as LobbyInvitation,
      ]);

      const result = await getIncomingInvitations(7);

      expect(result).toHaveLength(1);

      expect(LobbyInvitation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            recipientId: 7,
            status: "pending",
          },
        })
      );
    });
  });

  describe("Responding to invitations", () => {
    beforeEach(() => {
      invitation.status = "pending";
      invitation.save = vi.fn().mockResolvedValue(undefined);

      vi.mocked(LobbyInvitation.findByPk).mockResolvedValue(
        invitation as unknown as LobbyInvitation
      );

      vi.mocked(LobbyMember.create).mockResolvedValue({
        lobbyId: 10,
        userId: 7,
      } as LobbyMember);
    });

    it("accepts an invitation and adds the player to the lobby", async () => {
      const result = await respondToLobbyInvitation(7, 1, "accept");

      expect(LobbyMember.create).toHaveBeenCalledWith(
        {
          lobbyId: 10,
          userId: 7,
        },
        expect.objectContaining({
          transaction: expect.anything(),
        })
      );

      expect(result.status).toBe("accepted");
      expect(invitation.save).toHaveBeenCalledOnce();
    });

    it("declines an invitation without joining the lobby", async () => {
      const result = await respondToLobbyInvitation(7, 1, "decline");

      expect(result.status).toBe("declined");
      expect(LobbyMember.create).not.toHaveBeenCalled();
      expect(invitation.save).toHaveBeenCalledOnce();
    });

    it("rejects nonexistent invitations", async () => {
      vi.mocked(LobbyInvitation.findByPk).mockResolvedValue(null);

      await expect(
        respondToLobbyInvitation(7, 999, "accept")
      ).rejects.toThrow("Invitation not found.");
    });

    it("prevents users from responding to someone else's invitation", async () => {
      await expect(
        respondToLobbyInvitation(99, 1, "accept")
      ).rejects.toThrow("You cannot respond to this invitation.");
    });

    it("prevents responding to handled invitations", async () => {
      invitation.status = "accepted";

      await expect(
        respondToLobbyInvitation(7, 1, "accept")
      ).rejects.toThrow("This invitation has already been handled.");
    });

    it("prevents accepting invitations to full lobbies", async () => {
      vi.mocked(LobbyMember.count).mockResolvedValue(6);

      await expect(
        respondToLobbyInvitation(7, 1, "accept")
      ).rejects.toThrow("This lobby is full.");
    });

    it("prevents joining a lobby twice", async () => {
      vi.mocked(LobbyMember.findOne).mockResolvedValue({
        lobbyId: 10,
        userId: 7,
      } as LobbyMember);

      await expect(
        respondToLobbyInvitation(7, 1, "accept")
      ).rejects.toThrow("You are already in this lobby.");
    });
  });
});