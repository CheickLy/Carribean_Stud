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
 export async function getPublicLobbies() {
  const lobbies = await Lobby.findAll({
    where: {
      isPrivate: false,
      isActive: true,
    },
    attributes: {
      exclude: ["passcode"],
    },
    order: [["lobbyId", "DESC"]],
  });

  return lobbies;
}