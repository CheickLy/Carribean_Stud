# Iteration 3 acceptance checks: Olu

Use two browser windows with different accounts for table tests. Start PostgreSQL, the server, and the client; apply the server migrations first. Use a table with at least two player seats and a small minimum ante. The checks below use virtual chips only.

| Story | Steps | Expected result |
| --- | --- | --- |
| [S14 Table chat](https://github.com/CheickLy/Carribean_Stud/issues/37) | Join the same table in both windows. Open **Chat**. Send a message from each player, then refresh. Try an empty message and a message longer than 300 characters. | Both players see the messages in order after refresh. Invalid messages are rejected. A visitor who has not joined cannot read the chat. |
| [S16 Spectate table](https://github.com/CheickLy/Carribean_Stud/issues/38) | On **Tables**, choose **Watch** for a public table. Compare the view with a player's live table. Try a private table without a password, then with its password. | The hand and seats update without taking a seat. Private tables require the password. No player's private cards appear in the spectator response. |
| [S19 Wins and losses](https://github.com/CheickLy/Carribean_Stud/issues/39) | Play a hand through to settlement, then open **Profile → Statistics**. Play another hand and reload. | Hands, wins/losses/ties, win rate, decisions, and net chips reflect saved results for that account only. A new account shows zeros. |
| [S36 Game history](https://github.com/CheickLy/Carribean_Stud/issues/40) | Open **Profile → Game History**. Click a hand's **Session** link, then **All hands**. Check newest-first order, date filters, clear filters, and previous/next after more than ten hands. | The session view lists that session's hands, and **All hands** returns to the full history. Only the signed-in player's hands appear. Invalid dates or page numbers are rejected by the server. |
| [S37 Leave table](https://github.com/CheickLy/Carribean_Stud/issues/41) | Leave between hands. Rejoin and check table chips. During a hand, choose **Leave table**, confirm, then return after settlement. Also cancel the warning once. | Cancel keeps the player seated. Confirm folds an undecided hand, waits for settlement, releases the seat, and restores the saved table-chip amount on rejoin. The account-chip wording needs a team decision. |
| [S39 Starting bots](https://github.com/CheickLy/Carribean_Stud/issues/42) | On **Create table**, turn on **Allow bots**, choose a starting count, then create the table. Lower the seat count before creating a second table. | The starting bots occupy the selected number of seats and play by the same rules. The dropdown never offers a count that fills every seat. |

## Automated checks

- Client: `npm.cmd run test:coverage` — 113 tests passed after the UI changes.
- Client: `npm.cmd run build` — production build passed.
- Server: `npm.cmd run test:coverage` — 358 tests passed with PostgreSQL enabled.
- Server: `npm.cmd run test:multiplayer:postgres` — passed against PostgreSQL, including the new multiplayer story paths.
- The coverage summaries are in `Docs/iteration3-client-coverage-summary.json` and `Docs/iteration3-server-coverage-summary.json`.
- The measured statement coverage is 76.92% for the client and 93.12% for the server. Counting all covered statements together gives 81.62% statement coverage and 85.72% branch coverage.

## Report and board

- Paste the relevant sections from `Docs/iteration-3-olu-report.tex` into the team report and upload `Docs/iteration-3-gameplay-class-diagram.png` to its System Design / Diagrams section.
- Fill in actual hours for each story. Update Iteration 2 Table 4 and add Olu's missing Iteration 2 reflection.
- The six story issues have been created. Add them to the project board and use **Acceptance Testing** until the professor or CTO accepts them.
