import { isHandInProgress } from "./handState.js";
import type { Transaction } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "../../db/sequelize.js";
import { Lobby } from "../../models/lobby.js";
import { LobbyMember } from "../../models/lobbyMember.js";
import { User } from "../../models/user.js";
import { Session } from "../../models/session.js";

export class JoinError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Every admission path must hold the lobby row lock until membership is saved.
// This serializes direct joins and invitation acceptance across server processes.
export async function admitPlayer(lobby: Lobby, userId: number, transaction: Transaction) {
  const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!user) throw new JoinError(401, "Please sign in to join a table.");
  if (user.isBanned) throw new JoinError(403, "This account is disabled.");
  const existing = await LobbyMember.findOne({ where: { lobbyId: lobby.lobbyId, userId }, transaction });
  if (existing || userId === lobby.hostId) return { lobbyId: lobby.lobbyId, alreadyJoined: true };

  const members = await LobbyMember.count({ where: { lobbyId: lobby.lobbyId }, transaction });
  const hostMember = await LobbyMember.findOne({ where: { lobbyId: lobby.lobbyId, userId: lobby.hostId }, transaction });
  if (members + (hostMember ? 0 : 1) >= lobby.maxPlayers) throw new JoinError(409, "This table is full.");
  const buyIn = Number(lobby.startingMoney);
  if (!Number.isFinite(buyIn) || buyIn <= 0) throw new JoinError(409, "This table has an invalid buy-in.");
  if (!Number.isFinite(Number(user.balance)) || Number(user.balance) < buyIn) {
    throw new JoinError(403, `You need ${buyIn.toLocaleString()} chips to join this table.`);
  }
  const hand = await Session.findOne({ where: { lobbyId: lobby.lobbyId }, order: [["sessionId", "DESC"]], transaction });
  const waitingForSessionId = hand && isHandInProgress(hand) ? hand.sessionId : null;
  await LobbyMember.create({ lobbyId: lobby.lobbyId, userId, waitingForSessionId }, { transaction });
  return { lobbyId: lobby.lobbyId, alreadyJoined: false, waitingForNextHand: waitingForSessionId !== null };
}

export async function joinLobby(lobbyId: number, userId: number, passcode?: string) {
  return sequelize.transaction(async transaction => {
    const lobby = await Lobby.findByPk(lobbyId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!lobby || !lobby.isActive) throw new JoinError(404, "Table not found or no longer available.");
    const existing = await LobbyMember.findOne({ where: { lobbyId, userId }, transaction });
    if (lobby.isPrivate && userId !== lobby.hostId && !existing &&
        (!lobby.passcode || !passcode || !(await bcrypt.compare(passcode, lobby.passcode)))) {
      throw new JoinError(403, "Incorrect table password.");
    }
    return admitPlayer(lobby, userId, transaction);
  });
}
