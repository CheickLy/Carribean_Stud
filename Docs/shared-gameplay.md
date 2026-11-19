# Shared table gameplay

`/lobbies/:lobbyId/game` now uses the shared PostgreSQL-backed table engine, rather than the per-login solo practice game. Existing `/api/game/*` routes remain for the legacy practice implementation; the shared screen never calls them.

## Rules and table chips

- Each lobby member receives the configured starting chips once per table. These are persistent table chips, separate from their account balance. Reopening the table or opening another tab does not refill them. Joining retains the existing account-balance eligibility check and does not charge that balance.
- The server enforces the configured minimum and maximum ante. A player must cover the ante plus a possible 2× raise. Decimal chip amounts use integer cents internally.
- Automatic bet increases apply to both limits after the configured number of completed rounds.
- When bots are enabled, the host can use **Options → Add bot** to add one bot to a seat not reserved for a human member. New tables start without bots; existing tables retain their previously seated bots. A bot added during a hand waits for the next one. Duplicate requests are idempotent, and full tables/non-host requests are rejected by the server. Bots ante the minimum and raise a pair or better. They use the same deck, chip accounting, timing and settlement as humans and do not inspect other players' hands.
- Connected players with enough chips enter the next round automatically. Betting lasts at most 20 seconds; missing betting sits out without a charge. Once all antes are placed or betting expires, players have up to 30 seconds to raise/fold. Unanswered decisions fold at the deadline. After settlement, results remain for 7 seconds before the next eligible round.
- New arrivals during a round wait for the next one. Disconnected players are marked offline after 15 seconds without a heartbeat. Heartbeats do not extend the shared decision deadline.
- Leaving through the UI folds an undecided hand before navigating. A raise already submitted remains locked and settles normally even if that player leaves. Closing/refreshing uses a browser warning; the round's deadline continues on the server.
- Dealer cards remain hidden until every decision is finished. Opponents' cards are never returned, including after settlement. Players can view their own last 20 saved hands from History at the table.

## Persistence and concurrency

Migration `012-shared-table-games.cjs` creates `table_games` and adds ante/net columns to `game_hands`. A JSONB state holds table bankrolls, presence, the deck snapshot and absolute deadlines. Every state request, command and clock tick holds the lobby row lock used by admissions. Each phase update, settlement, chip return and history insertion commits in one PostgreSQL transaction.

Requests carry a round ID. Identical ante/action retries are harmless, conflicting choices are rejected, and an old round ID cannot act on a later hand. A unique partial index additionally prevents duplicate human history rows. Expired deadlines advance before validating incoming actions; invalid late actions do not roll back that advancement. Round state survives API restarts, and overdue decisions are processed on the next tick/request. `src/index.ts` starts the autonomous one-second clock; HTTP polling every two seconds also advances the state.

Only authenticated, non-banned lobby members and the host can access game state or history. Caller identity comes from the login session, never the request body. Public responses are built explicitly and marked `Cache-Control: no-store`.

## Endpoints

All under `/api/lobbies/:lobbyId/game/`:

| Method | Endpoint | Body |
| --- | --- | --- |
| POST | `state` | `{}` (heartbeat) |
| POST | `ante` | `{ roundId, ante }` |
| POST | `action` | `{ roundId, action: "raise" \| "fold" }` |
| POST | `leave` | `{ roundId }` (null before a round exists) |
| POST | `bots` | `{ requestId }` (host only; bots must be enabled; a stable unique ID makes retries safe) |
| GET | `history` | None; only the caller's saved hands |

## Verification

Run `npm run db:migrate` in `server/` before starting the API. Run the normal server and client builds/tests. `npm run test:shared:postgres` in `server/` creates a unique temporary schema and removes it afterward. It checks concurrent commands, private views, one-time payouts/history, admission, bots, autonomous timeout, and automatic next rounds without touching application records. Server `npm run test:coverage` (also available as `test:coverage:postgres`) requires PostgreSQL and includes these database tests in coverage. Ordinary `npm test` does not require a database and skips the opt-in integration test.

For a manual multiplayer check, use two distinct authenticated browser profiles. Join the same lobby, open the table in both, and place antes in the same round. A second tab in the same profile intentionally represents the same player. Verify matching dealer up-cards, different private hands, locked decisions, shared countdowns and saved results. A player who enters during a round waits until the next betting phase.

The shared screen combines the compact card-screen design with live multiplayer state: explicit hand labels, a prominent chip balance, a single lobby return link, real occupied seats, shared countdowns, and collapsible payout details. Options also contains saved sound/motion/deal-speed preferences; Rules & hands uses the shared guide.
