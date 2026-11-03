import { Op } from "sequelize";
import { User } from "../../models/user.js";
import { LobbyMember } from "../../models/lobbyMember.js";
import bcrypt from "bcryptjs";
import { Lobby } from "../../models/lobby.js";
import { validateLobby, type CreateLobbyInput } from "./tables.validation.js";

export async function createLobby(
    input: CreateLobbyInput,
    hostId: number
){
    const errors = validateLobby(input);

    if (errors.length > 0) {
        throw new Error(errors.join(", "));
    }
    const hashedPasscode =
        input.isPrivate && input.passcode
        ? await bcrypt.hash(input.passcode, 10)
        : null;
        
    const lobby = await Lobby.create({
        hostId,
    name: input.name.trim(),
    isPrivate: input.isPrivate,
    passcode: hashedPasscode,
    minBet: input.minBet,
    maxBet: input.maxBet,
    maxPlayers: input.maxPlayers,
    startingMoney: input.startingMoney,
    botsEnabled: input.botsEnabled,
    autoIncr: input.autoIncr,
    increaseAmount: input.increaseAmount ?? 10,
    increaseEveryHands: input.increaseEveryHands ?? 15,
    allowBets: true,
    isActive: true,
    });

    const result = lobby.toJSON() as Record<string, unknown>;
    delete result.passcode;
    return result;
}
export async function getLobbies() {
  const lobbies = await Lobby.findAll({
    where: { isActive: true },
    attributes: { exclude: ["passcode"] },
    order: [["createdAt", "DESC"], ["lobbyId", "DESC"]],
  });
  if (lobbies.length === 0) return [];

  const [hosts, members] = await Promise.all([
    User.findAll({
      where: { userId: { [Op.in]: [...new Set(lobbies.map(lobby => lobby.hostId))] } },
      attributes: ["userId", "username"],
    }),
    LobbyMember.findAll({
      where: { lobbyId: { [Op.in]: lobbies.map(lobby => lobby.lobbyId) } },
      attributes: ["lobbyId", "userId"],
    }),
  ]);
  const creators = new Map(hosts.map(host => [host.userId, host.username]));
  const occupants = new Map<number, Set<number>>();
  for (const member of members) {
    const seats = occupants.get(member.lobbyId) ?? new Set<number>();
    seats.add(member.userId);
    occupants.set(member.lobbyId, seats);
  }
  return lobbies.map(lobby => {
    const seats = occupants.get(lobby.lobbyId) ?? new Set<number>();
    seats.add(lobby.hostId);
    return {
      ...lobby.toJSON(),
      creator: creators.get(lobby.hostId) ?? "Unknown creator",
      seatsAvailable: Math.max(0, lobby.maxPlayers - seats.size),
    };
  });
}

export async function getLobbyDetails(lobbyId: number, userId: number) {
  const lobby = await Lobby.findByPk(lobbyId, { attributes: { exclude: ["passcode"] } });
  if (!lobby || !lobby.isActive) return null;
  const members = await LobbyMember.findAll({ where: { lobbyId }, attributes: ["userId"] });
  const playerIds = [...new Set([lobby.hostId, ...members.map(member => member.userId)])];
  if (!playerIds.includes(userId)) return null;
  const players = await User.findAll({
    where: { userId: { [Op.in]: playerIds } },
    attributes: ["userId", "username", "isGuest"],
  });
  return {
    ...lobby.toJSON(),
    isHost: lobby.hostId === userId,
    players: players.map(player => ({
      userId: player.userId,
      username: player.isGuest ? "Guest" : player.username,
      isHost: player.userId === lobby.hostId,
    })),
    seatsAvailable: Math.max(0, lobby.maxPlayers - playerIds.length),
  };
}
