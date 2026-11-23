# Iteration 3: Olu's work

## Planned stories

| Story | Points | Work |
| --- | ---: | --- |
| S14 Table Chat | 5 | Seated players can exchange ordered messages at their table. |
| S16 Spectate Table | 2 | A visitor can watch public table state without occupying a seat. Private tables require the password. |
| S19 Track Wins and Losses | 3 | The profile uses saved hand results for wins, losses, ties, win rate, and net chips. |
| S36 Review My Game History | 5 | The profile lists the player's own saved hands newest first, with pages and date/session filters. |
| S37 Leave Table | 2 | Leaving releases the seat after the current hand settles. Rejoining restores that table's remaining chips once. |
| S39 Configure Table Bots | 3 | The host chooses a starting bot count when creating a table. Bots use the existing shared game rules. |

Planned total: **20 points**. Record actual hours for each story in the team report; the estimate of one to two hours per story is not an exact time log.

## Verification

- Server build and client build pass.
- Backend: 358 tests pass, including the PostgreSQL multiplayer checks. The checks cover table chat access and ordering, spectator privacy and private-table passwords, account-specific results/history, rejoining after leaving, and starting bot counts.
- Frontend: 110 tests pass. New checks cover empty statistics, message failure and retry, and the spectator screen.
- Current statement coverage: server **93.12%**, client **68.32%**. Current branch coverage: server **88.52%**, client **83.87%**. The simple mean of the two statement percentages is **80.72%**. The tool-generated JSON summaries are in `Docs/iteration3-server-coverage-summary.json` and `Docs/iteration3-client-coverage-summary.json`.
- The simplified gameplay class diagram is `Docs/iteration-3-gameplay-class-diagram.png`. Upload it to Overleaf and place it under System Design / Diagrams.

## Team decisions and report follow-up

- Table chips are separate from account chips in the current shared game. S37 keeps the remaining table-chip balance for a later rejoin and does not credit the account wallet. The team should confirm this interpretation against the spreadsheet's wording about returning chips.
- Update the GitHub Projects cards for these six stories. Move implemented work to Acceptance Testing, then let the professor/CTO approve cards before Done.
- Add the actual time spent on each story, each person's completed points, a personal reflection, current coverage results, and the diagram to the Iteration 3 report. Export and commit the updated PDF.
- In Iteration 2 Table 4, Olu's six completed points were left blank. If the other members' numbers are correct, enter **6** for Olu and **24** for the team total.
