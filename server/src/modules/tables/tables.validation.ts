export interface CreateLobbyInput {
    name: string;
    maxPlayers: number;
    startingMoney: number;
    botsEnabled: boolean;
    increaseAmount: number;
    increaseEveryHands: number;
    minBet: number;
    maxBet: number;
    isPrivate: boolean;
    passcode?: string;
    autoIncr: boolean;
}

export function validateLobby(input: unknown): string[] {
    const errors: string[] = [];
    if (typeof input != "object" || input === null || Array.isArray(input)) {
        return ["Invalid lobby settings."];
    }
    const lobby = input as Record<string, unknown>;
    if (
        typeof lobby.name !== "string" ||
        lobby.name.trim().length < 3 ||
        lobby.name.trim().length > 40
    ) {
        errors.push("Lobby name must be between 3 and 40 characters.");
    }
    if (
        typeof lobby.maxPlayers !== "number" ||
        !Number.isInteger(lobby.maxPlayers) ||
        lobby.maxPlayers < 2 ||
        lobby.maxPlayers > 6
    ) {
        errors.push("A lobby must allow between 2 and 6 players.");
    }
    if (
        typeof lobby.minBet !== "number" ||
        !Number.isFinite(lobby.minBet) ||
        lobby.minBet <= 0
    ) {
        errors.push("Minimum bet must be greater than zero.");
    }
    if (
        typeof lobby.maxBet !== "number" ||
        !Number.isFinite(lobby.maxBet) ||
        typeof lobby.minBet !== "number" ||
        !Number.isFinite(lobby.minBet) ||
        lobby.maxBet < lobby.minBet
    ){
        errors.push("Maximum bet must be at least the minimum bet.");
    }
    if (
        typeof lobby.startingMoney !== "number" ||
        !Number.isFinite(lobby.startingMoney) ||
        typeof lobby.minBet !== "number" ||
        !Number.isFinite(lobby.minBet) ||
        lobby.startingMoney < lobby.minBet
    ) {
        errors.push("Starting money must be at least the minimum bet.");
    }
    if (typeof lobby.isPrivate !== "boolean") {
        errors.push("Privacy setting must be true or false");
    }
    if (typeof lobby.botsEnabled !== "boolean") {
        errors.push("Bots setting must be true or false");
    }
    if (typeof lobby.autoIncr !== "boolean") {
        errors.push("Auto increment setting must be true or false");
    }
    if (
        lobby.isPrivate === true &&
        (typeof lobby.passcode !== "string" ||
            lobby.passcode.trim().length < 4)
    ) {
        errors.push("Private lobbies require a password of at least 4 characters.");
    }

    if (lobby.autoIncr === true) {
        if (
            typeof lobby.increaseAmount !== "number" ||
            !Number.isFinite(lobby.increaseAmount) ||
            lobby.increaseAmount <= 0
        ) {
            errors.push("Automatic increase amount must be greater than zero.");
        }
        if (
            typeof lobby.increaseEveryHands !== "number" ||
            !Number.isInteger(lobby.increaseEveryHands) ||
            lobby.increaseEveryHands <= 0
        ) {
            errors.push("Automatic increase interval must be a positive number of hands.");
        }
    }
    return errors;
}
