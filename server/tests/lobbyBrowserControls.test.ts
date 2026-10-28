import { describe, expect, it } from "vitest";
import { selectLobbies, type BrowserLobby } from "../../client/src/pages/lobbyBrowserControls";
const rows = [
  { lobbyId: 1, creator: "Zoe", createdAt: "2026-01-01", startingMoney: "20", minBet: "10", isPrivate: true, seatsAvailable: 1 },
  { lobbyId: 2, creator: "Alice", createdAt: "2026-01-02", startingMoney: "100", minBet: "2", isPrivate: false, seatsAvailable: 0 },
  { lobbyId: 3, creator: "Bob", createdAt: "2026-01-03", startingMoney: "50", minBet: "5", isPrivate: true, seatsAvailable: 2 },
] as BrowserLobby[];
const ids = (rows: BrowserLobby[]) => rows.map(row => row.lobbyId);
describe("Table controls", () => {
  it.each([
    ["creator", [2, 3, 1]], ["createdAt", [1, 2, 3]],
    ["startingMoney", [1, 3, 2]], ["minBet", [2, 3, 1]],
  ])("sorts %s in both directions", (key, expected) => {
    expect(ids(selectLobbies(rows, key as string, "asc", "all", false))).toEqual(expected);
    expect(ids(selectLobbies(rows, key as string, "desc", "all", false))).toEqual([...(expected as number[])].reverse());
  });
  it("combines filters with sorting and restores newest first defaults", () => {
    expect(ids(selectLobbies(rows, "minBet", "asc", "private", true))).toEqual([3, 1]);
    expect(selectLobbies(rows, "minBet", "asc", "public", true)).toEqual([]);
    expect(ids(selectLobbies(rows, "createdAt", "desc", "all", false))).toEqual([3, 2, 1]);
    expect(ids(rows)).toEqual([1, 2, 3]);
  });
});
