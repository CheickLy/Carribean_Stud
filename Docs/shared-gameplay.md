# Shared table gameplay

`/lobbies/:lobbyId/game` now uses the shared PostgreSQL-backed table engine, rather than the per-login solo practice game. Existing `/api/game/*` routes remain for the legacy practice implementation; the shared screen never calls them.

## Rules and table chips

- Opening the table debits the lobby’s starting chips from the player’s account once and puts that amount on the seat. An existing seat is not charged again. The clock and other players cannot create that seat. Leaving between hands, or after a skipped or settled hand, credits the remaining seat chips back to the account once, releases the seat, and removes lobby membership. Leaving during a hand folds an undecided action, keeps a locked raise, and returns the settled remainder once when the hand ends. A repeated leave or a later heartbeat does not credit or debit again. Reopening the table sends `buyIn: true` and buys in again. A player who cannot cover the buy-in is not seated.
- The server enforces the configured minimum and maximum ante. A player must cover the ante plus a possible 2× raise. Decimal chip amounts use integer cents internally.
- Automatic bet increases apply to both limits after the configured number of completed rounds.
- When bots are enabled, the host can use **Options → Add bot** to add one bot to a seat not reserved for a human member. New tables start without bots; existing tables retain their previously seated bots. A bot added during a hand waits for the next one. Duplicate requests are idempotent, and full tables/non-host requests are rejected by the server. Bots ante the minimum and raise a pair or better. They use the same deck, chip accounting, timing and settlement as humans and do not inspect other players' hands.
- Connected players with enough chips enter the next round automatically. Betting lasts at most 20 seconds; missing betting sits out without a charge. Once all antes are placed or betting expires, players have up to 30 seconds to raise/fold. Unanswered decisions fold at the deadline. After settlement, results remain for 7 seconds before the next eligible round.
- New arrivals during a round wait for the next one. Disconnected players are marked offline after 15 seconds without a heartbeat. Heartbeats do not extend the shared decision deadline.
- Leaving through the UI folds an undecided hand before navigating. A raise already submitted remains locked and settles normally even if that player leaves. The remaining chips return to the account once after settlement. Closing/refreshing uses a browser warning; the round's deadline continues on the server and does not cash the seat out.
- Dealer cards remain hidden until every decision is finished. Opponents' cards are never returned, including after settlement. Players can view their own last 20 saved hands from History at the table.

## Persistence and concurrency

Migration `012-shared-table-games.cjs` creates `table_games` and adds ante/net columns to `game_hands`. A JSONB state holds table bankrolls, presence, the deck snapshot and absolute deadlines. Every state request, command and clock tick holds the lobby row lock used by admissions. Each phase update, settlement, chip return and history insertion commits in one PostgreSQL transaction.

Requests carry a round ID. Identical ante/action retries are harmless, conflicting choices are rejected, and an old round ID cannot act on a later hand. A unique partial index additionally prevents duplicate human history rows. Expired deadlines advance before validating incoming actions; invalid late actions do not roll back that advancement. Round state survives API restarts, and overdue decisions are processed on the next tick/request. `src/index.ts` starts the autonomous one-second clock; HTTP polling every two seconds also advances the state.

Only authenticated, non-banned lobby members and the host can access game state or history. Caller identity comes from the login session, never the request body. Public responses are built explicitly and marked `Cache-Control: no-store`.

## Endpoints

All under `/api/lobbies/:lobbyId/game/`:

| Method | Endpoint | Body |
| --- | --- | --- |
| POST | `state` | `{}` heartbeat, or `{ buyIn: true }` to sit again after cashing out |
| POST | `ante` | `{ roundId, ante }` |
| POST | `action` | `{ roundId, action: "raise" \| "fold" }` |
| POST | `leave` | `{ roundId }` (null before a round exists) |
| POST | `bots` | `{ requestId }` (host only; bots must be enabled; a stable unique ID makes retries safe) |
| GET | `history` | None; only the caller's saved hands |

## Verification

Run `npm run db:migrate` in `server/` before starting the API. Run the normal server and client builds/tests. `npm run test:shared:postgres` in `server/` creates a unique temporary schema and removes it afterward. It checks concurrent commands, private views, one-time payouts/history, admission, bots, autonomous timeout, and automatic next rounds without touching application records. Server `npm run test:coverage` (also available as `test:coverage:postgres`) requires PostgreSQL and includes these database tests in coverage. Ordinary `npm test` does not require a database and skips the opt-in integration test.

For a manual multiplayer check, use two distinct authenticated browser profiles. Join the same lobby, open the table in both, and place antes in the same round. A second tab in the same profile intentionally represents the same player. Verify matching dealer up-cards, different private hands, locked decisions, shared countdowns and saved results. A player who enters during a round waits until the next betting phase.

The shared screen combines the compact card-screen design with live multiplayer state: explicit hand labels, a prominent chip balance, a single lobby return link, real occupied seats, shared countdowns, and collapsible payout details. Options also contains saved light/dark appearance, sound, motion and deal-speed preferences; Rules & hands uses the shared guide. Light remains the default, and choosing an appearance does not change the hand or timing. Dark mode keeps the same typography, spacing, keyboard controls and white card faces, with teal surfaces and contrasting text/focus indicators. Preferences are saved in the current browser profile, and older saved sound/motion settings remain compatible.

## Multi-player Gameplay acceptance

Story: As a player, I want to play at a table with other players against one dealer, so that we can participate in the same game together.

Solo hands remain available while other players join. Arrivals during a hand reserve a place in the next round. The roster beneath the round timer shows every member, including players waiting for a seat in the current hand. Opponents show private card backs and public ante/state information; their net results appear only after everyone has finished. Their card identities and ranks remain private.

Player actions wait for an in-flight background refresh rather than being discarded. The clicked round ID remains attached to the action, so an expired-hand action cannot accidentally place a bet in a newer hand.

`npm run test:multiplayer:postgres` exercises the actual login, join, game, and history HTTP routes with separate cookie sessions in a disposable schema. It verifies:

- Two signed-in players share a round ID, deadline, deck and dealer, while receiving different private hands.
- One player can win while another loses against that same dealer; both chip changes settle once.
- A second session for the same account cannot duplicate an ante, raise, payout or history record.
- A late arrival waits for the next round, which starts automatically after the results interval.
- An unauthenticated user, nonmember, or forged body user ID cannot access or act on another player's hand.
- Independent tables keep separate membership, rounds, chips and histories.

For a manual check, sign in to two different accounts in a normal and a private browser window, then join the same table. Two ordinary tabs usually share one account's cookies and therefore represent the same player.

### Table quality of life

- Going offline immediately disables ante and decision buttons and shows reconnect status. Returning online or bringing the tab back into view refreshes the authoritative server state. Recovery restores the current hand and seat without replaying a bet or restarting its deadline.
- Late arrivals see “You’re seated—joining the next hand.” They cannot place an ante in an already active hand.
- Round details show ante and raise stakes, total payout returned (including returned stakes), each bet’s net outcome, and total net change. History retains the server settlement.
- Options includes Copy invite link and a selectable lobby URL when clipboard access fails. Invite links do not include passwords; private-lobby access checks still apply. A localhost link requires access to the same machine/server.
- Pending antes and decisions have a visible turn callout and countdown. Sound effects remain opt-in and unlock when enabled or during a player action. Each new action phase sounds once; background polling does not repeat alerts. The callout has no flashing or motion.
- At widths up to 900px, the shared table uses a scrolling layout with readable text, wrapped controls, and 44px touch targets. Cards stay in a five-card row, and Options and History have scrollable panels that fit the viewport. Light/dark and reduced-motion choices remain available.

Validation covers offline recovery without replayed decisions, clipboard failure, phase alert deduplication/muting, and two independent login sessions sharing one round. The PostgreSQL acceptance test also simulates a disconnected player refreshing mid-decision and checks that cards, stakes, balance, and deadline survive.

### Host controls

Options lists Remove bot and Make host controls for the current host. Other players can see who hosts the table but cannot perform these operations; the server checks ownership under the same lobby lock used for bets and settlement.

A bot outside the current hand is removed immediately. A bot already in the hand is marked “leaving after hand,” finishes its locked action, and has its result saved before the next hand frees its seat. Removal retries are safe, and replacement bots receive fresh IDs so an old retry cannot remove a replacement.

Hosting can be handed to another connected human with confirmation. It also transfers automatically to the first connected human in seat order when the host leaves or has not sent a heartbeat for 15 seconds. Bots cannot host. If no connected human is available, ownership stays in place until one becomes available. Returning former hosts keep their membership, balance, and hand, without taking ownership back.

See [Multiplayer testing](multiplayer-testing.md) for automated acceptance checks and the two-window browser checklist.
