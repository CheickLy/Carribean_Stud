# Iteration 2: Olu's work

## Stories and implementation

| Story | Work in this branch | Integration note |
| --- | --- | --- |
| S17 View My Profile | Added a signed-in profile with avatar, username, chip balance, and links to statistics and history. | Statistics and history show labeled sample hands until completed games are saved. |
| S40 Read Game Rules | Added a public rules page linked from the guest home and player home. | The payout table is a reference and needs comparison with the S6 settlement code when it is available. |
| S41 Admin Review Support Requests | Added the Reports screen, admin-only ticket list/update API, status and resolution note, and database migration. | A temporary database ticket was listed, updated, read again, and removed. The S11 submission flow is not in this checkout. |
| S38 Sign Out | Added player and admin sign-out controls, connected to the existing session logout endpoint, and routed admins to their dashboard after login. | Leaving an active game seat must be tested when table gameplay is available. |

The player home now shows live public lobbies, account information, and a rules link. Avatar selection has animal choices and a local image upload option. Login and registration use separate dialogs. The design note is in `Docs/sign-in-design.md`.

## Testing on November 1, 2026

- Client build: passed.
- Client UI tests: 5 passed. They cover login and registration dialogs, admin login route, profile access, player logout, public rules, and support ticket editing.
- Server build: passed.
- Server tests: 114 passed across 16 files after merging the current team main. The new tests cover admin-only support access and accepted-friend messaging.
- Live local support check: admin login succeeded; a temporary ticket was listed, changed to resolved with a note, and read back as resolved. The ticket was then removed.
- Server coverage: 83.03% statements, 74.87% branches, 89.74% functions, 84.02% lines.
- Client coverage: 15.18% statements, 65.97% branches, 25.67% functions, 15.18% lines. Many existing client pages have no automated tests yet.
- The latest team main included a lobby sorting test without its helper or controls. The helper and controls were added during merge integration; the lobby tests now pass.

The generated coverage summaries and a printable image are in `Docs/coverage/`. The full HTML coverage reports can be regenerated with `npm run test:coverage` in each package. The client percentage is below the assignment's overall coverage target, so the team needs more UI tests before claiming that target.

## Team follow-up

- Connect the S11 support request submission flow and test submission through admin resolution.
- Compare the S40 payout details with the finished S6 game logic.
- Confirm S38 behavior when a user signs out from an active table.
- Add client tests for the team's other screens and record the final combined coverage honestly.
- Copy accepted stories, actual hours, and points into the shared story tracker and GitHub Project. Only the story owners can supply actual time spent.
- Incorporate this section and the team's results into the shared LaTeX report, PDF, retrospective, and gameplay sequence diagram. Those editable team sources are not in this repository checkout.
