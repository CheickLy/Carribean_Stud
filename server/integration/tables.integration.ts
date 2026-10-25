import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { sequelize } from "../src/db/sequelize.js";
import { User } from "../src/models/user.js";
import { Lobby } from "../src/models/lobby.js";
import {
  createLobby,
  getPublicLobbies,
} from "../src/modules/tables/tables.service.js";

async function main() {
  // Safety: never run this against the development database.
  if (
    process.env.NODE_ENV !== "test" ||
    sequelize.getDatabaseName() !== "reefroyale_test"
  ) {
    throw new Error("Integration test must use reefroyale_test.");
  }

  const testId = `${Date.now()}_${process.pid}`;
  let userId: number | undefined;

  try {
    await sequelize.authenticate();

    const user = await User.create({
      username: `test_${testId}`,
      email: `test_${testId}@example.com`,
      passwordHash: "integration-test-only",
      role: "player",
    });

    userId = user.userId;

    const publicLobby = await createLobby(
      {
        name: `Public Test ${testId}`,
        maxPlayers: 4,
        startingMoney: 200,
        botsEnabled: true,
        increaseAmount: 10,
        increaseEveryHands: 15,
        minBet: 5,
        maxBet: 50,
        isPrivate: false,
        autoIncr: true,
      },
      userId
    );

    const privateLobby = await createLobby(
      {
        name: `Private Test ${testId}`,
        maxPlayers: 6,
        startingMoney: 500,
        botsEnabled: false,
        increaseAmount: 10,
        increaseEveryHands: 15,
        minBet: 10,
        maxBet: 100,
        isPrivate: true,
        passcode: "reef1234",
        autoIncr: false,
      },
      userId
    );

    assert.equal(publicLobby.hostId, userId);
    assert.equal(publicLobby.maxPlayers, 4);
    assert.equal(publicLobby.botsEnabled, true);
    assert.equal(Number(publicLobby.startingMoney), 200);
    assert.equal(Number(publicLobby.minBet), 5);
    assert.equal(Number(publicLobby.maxBet), 50);

    assert.equal(privateLobby.isPrivate, true);
    assert.equal("passcode" in privateLobby, false);

    const savedPrivateLobby = await Lobby.findByPk(
      Number(privateLobby.lobbyId)
    );

    assert.ok(savedPrivateLobby);
    assert.ok(savedPrivateLobby.passcode);
    assert.notEqual(savedPrivateLobby.passcode, "reef1234");

    assert.equal(
      await bcrypt.compare("reef1234", savedPrivateLobby.passcode),
      true
    );

    const publicLobbies = await getPublicLobbies();

    assert.ok(
      publicLobbies.some(
        (lobby) => lobby.lobbyId === Number(publicLobby.lobbyId)
      )
    );

    assert.ok(
      !publicLobbies.some(
        (lobby) => lobby.lobbyId === Number(privateLobby.lobbyId)
      )
    );

    assert.ok(
      publicLobbies.every(
        (lobby) => !Object.hasOwn(lobby.toJSON(), "passcode")
      )
    );

    console.log("PASS: Public lobby saved with correct settings");
    console.log("PASS: Private lobby password hashed");
    console.log("PASS: Password excluded from creation response");
    console.log("PASS: Public retrieval excludes private lobbies");
    console.log("PASS: Public retrieval excludes password hashes");
  } finally {
    if (userId !== undefined) {
      // Remove dependent records before deleting the test user.
      await Lobby.destroy({ where: { hostId: userId } });
      await User.destroy({ where: { userId } });
      console.log("Test records cleaned up");
    }

    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Integration test failed:", error);
  process.exitCode = 1;
});
