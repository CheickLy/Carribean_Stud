# Joining tables

Players choose Join Table in the browser, confirm the chip requirement, and enter a password for private tables. A successful join opens the table room. A full table disables the browser button; the server still checks capacity because availability can change after browsing. Expired sessions return to login and then the browser.

`POST /api/lobbies/:lobbyId/join` accepts an optional `passcode`. Identity comes from the session. Starting balance is the required buy-in: a player must have at least that many chips, but joining does not debit their account. Existing members and the host can rejoin without another seat or buy-in check. Disabled or deleted accounts cannot join. Password hashes never appear in join responses.

Direct joins and invitation acceptance use the same admission function. A host invitation grants private-table access without a password. Both paths lock the lobby row inside a PostgreSQL transaction before checking membership and counting seats; the host occupies one seat even without a membership record. The account is also locked while its balance is checked. Repeated joins return the existing seat. Invitations do not bypass account, capacity, or buy-in checks.

A new member joining during a hand records that hand's session ID in `waiting_for_session_id`. Room details mark the player as waiting while that session is current and nonterminal. Completing that hand or moving to a new session makes the player eligible. Joining never adds a game-hand record or deals cards. The current application still has a disabled Start game control; the gameplay engine is a separate feature. When implemented, hand creation must hold the same lobby row lock, snapshot eligible members, and reject actions from members waiting for that session.

Game sessions represent hands. `completed`, `finished`, `ended`, and `cancelled` are terminal; `waiting` has not started. Other statuses are conservatively treated as underway. Keep the gameplay implementation consistent with `handState.ts`.

Apply the schema change from `server`:

```sh
npm run db:migrate -- --name 009-lobby-member-waiting.cjs
```

Validation:

```sh
cd client
npm run build
npm test
cd ../server
npm run build
npm test
npm run test:join:postgres
```

The PostgreSQL check uses the configured database with a unique temporary schema and removes that schema afterward. It verifies simultaneous joins for the last seat, invitation/direct-join competition, idempotent retries, unchanged balances, and next-hand eligibility without touching application tables.
