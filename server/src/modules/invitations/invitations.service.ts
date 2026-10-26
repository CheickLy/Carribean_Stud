import { Op } from "sequelize";
import { Friendship } from "../../models/friendship.js";
import { Lobby } from "../../models/lobby.js";
import { LobbyInvitation } from "../../models/lobbyInvitation.js";
import { LobbyMember } from "../../models/lobbyMember.js";
import { User } from "../../models/user.js";
import { sequelize } from "../../db/sequelize.js";

export async function sendLobbyInvitation(
  senderId: number,
  recipientId: number,
  lobbyId: number
) {
  if (senderId === recipientId) {
    throw new Error("You cannot invite yourself.");
  }

  const recipient = await User.findByPk(recipientId);

  if (!recipient) {
    throw new Error("User not found.");
  }

  const friendship = await Friendship.findOne({
    where: {
      status: "accepted",
      [Op.or]: [
        { userId: senderId, friendId: recipientId },
        { userId: recipientId, friendId: senderId },
      ],
    },
  });

  if (!friendship) {
    throw new Error("You can only invite accepted friends.");
  }

  const lobby = await Lobby.findByPk(lobbyId);

  if (!lobby || !lobby.isActive) {
    throw new Error("Lobby not found or inactive.");
  }

  if (lobby.hostId !== senderId) {
    throw new Error("Only the lobby host can invite friends.");
  }

  const existingMember = await LobbyMember.findOne({
    where: { lobbyId, userId: recipientId },
  });

  if (existingMember) {
    throw new Error("This friend is already in the lobby.");
  }

  const existingInvitation = await LobbyInvitation.findOne({
    where: {
      lobbyId,
      recipientId,
      status: "pending",
    },
  });

  if (existingInvitation) {
    throw new Error("This friend already has a pending invitation.");
  }

  return LobbyInvitation.create({
    lobbyId,
    senderId,
    recipientId,
    status: "pending",
  });
}

export async function getIncomingInvitations(userId: number) {
  return LobbyInvitation.findAll({
    where: {
      recipientId: userId,
      status: "pending",
    },
    include: [
      {
        model: Lobby,
        as: "lobby",
        attributes: ["lobbyId", "name", "isPrivate", "maxPlayers"],
      },
      {
        model: User,
        as: "sender",
        attributes: ["userId", "username"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

export async function respondToLobbyInvitation(
  userId: number,
  invitationId: number,
  action: "accept" | "decline"
) {
  return sequelize.transaction(async (transaction) => {
    const invitation = await LobbyInvitation.findByPk(invitationId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    if (invitation.recipientId !== userId) {
      throw new Error("You cannot respond to this invitation.");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation has already been handled.");
    }

    if (action === "decline") {
      invitation.status = "declined";
      await invitation.save({ transaction });
      return invitation;
    }

    const lobby = await Lobby.findByPk(invitation.lobbyId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lobby || !lobby.isActive) {
      throw new Error("Lobby not found or inactive.");
    }

    const existingMember = await LobbyMember.findOne({
      where: {
        lobbyId: lobby.lobbyId,
        userId,
      },
      transaction,
    });

    if (existingMember) {
      throw new Error("You are already in this lobby.");
    }

    const memberCount = await LobbyMember.count({
      where: { lobbyId: lobby.lobbyId },
      transaction,
    });

    const hostIsMember = await LobbyMember.findOne({
      where: {
        lobbyId: lobby.lobbyId,
        userId: lobby.hostId,
      },
      transaction,
    });

    const occupiedSeats = memberCount + (hostIsMember ? 0 : 1);

    if (occupiedSeats >= lobby.maxPlayers) {
      throw new Error("This lobby is full.");
    }

    await LobbyMember.create(
      {
        lobbyId: lobby.lobbyId,
        userId,
      },
      { transaction }
    );

    invitation.status = "accepted";
    await invitation.save({ transaction });

    return invitation;
  });
}