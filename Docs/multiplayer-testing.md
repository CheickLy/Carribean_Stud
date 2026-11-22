# Multiplayer verification

Run the full client and server suites:

```sh
npm test --prefix client
npm test --prefix server
npm run build --prefix client
npm run build --prefix server
```

With the configured local PostgreSQL server running, run the complete server coverage check:

```sh
npm run test:coverage --prefix server
```

This enables the shared-game and multiplayer PostgreSQL integration tests as well as unit tests. The existing 80% statement, branch, function, and line thresholds remain enforced. Integration tests create and remove isolated schemas; they do not alter application records.

For just the multiplayer story:

```sh
npm run test:multiplayer:postgres --prefix server
```

This test exercises real HTTP login cookies and routes through PostgreSQL. It covers independent players, shared dealer and deadline, private hands, late arrival, several rounds, simultaneous and retried actions, disconnect/reload recovery, individual payouts, persistent history, bot removal before and during a hand, and manual/automatic host transfer. It verifies a removed bot settles exactly once and a former host keeps access without retaining privileges. These are HTTP-to-database acceptance tests, not automated browser tests.

## Two-window browser checklist

Use a normal browser window and an Incognito/private window so each has a separate login cookie. Two normal windows in the same profile may represent the same player. Only use a local test table with fictional chips.

1. Join the same lobby in both windows. If one arrives after betting starts, verify its reserved-seat message and wait for the next hand.
2. At the start of a fresh betting phase, place an ante in both windows. Check the same hand number, dealer up-card and countdown. Each window should see its own five cards and only card backs for its opponent.
3. Refresh one window while deciding. Its seat, cards, stake and remaining server deadline should return. The other window should keep progressing.
4. Raise in one window and fold in the other. Both should see the completed dealer hand, separate net results and one history record per participant. Verify the next hand starts automatically.
5. Repeat while disconnecting one window for less than 15 seconds, then reconnecting it. Controls should disable while disconnected and recover without resubmitting an action. Also test missing the decision deadline: the server must fold automatically.
6. In Options, add a bot, then remove it during its hand. Its departure should remain pending until settlement. A queued bot with no current hand should disappear immediately.
7. Transfer host to the other player. Old host controls should disappear, new host controls should appear, and both players should retain their cards and balances. Then have the new host leave; ownership should return to the remaining connected player. Repeat by closing the host's game window and allowing the 15-second heartbeat grace period to expire.
8. Check Options, History, Rules, cards and actions at a narrow phone width in both themes. No control should overlap another or require reading scaled-down desktop text.

In this verification pass, the automated HTTP/database flows and full suites passed. Live normal/Incognito windows showed player states, private-card placeholders and automatic host changes, but native browser automation returned stale snapshots and could not reliably verify an entire two-window UI hand. Treat the full browser checklist as outstanding manual verification.
