# 06: Fast Numeric Scorekeeper with Game Modes and Post-Match Choice

**What to build:** Big-Pad numeric score entry on active courts and rotation rule execution. Tapping "Record Score" on an in-play Court card opens a full-screen keypad for fast numeric score entry (e.g., 11–8) with 1-tap winner selection. When score is confirmed, the system executes the session's active Game Mode:
- In `Open Play`: All four players rotate off into the queue.
- In `Winner/Winner vs Loser/Loser`: Winning pair remains partnered in the Winners Pool; losing pair remains partnered in the Losers Pool (see `#09`).
- In `Winner Takes All`: Scores update the active round-robin fixture, increment cumulative team points, and refresh the live leaderboard (see `#10`).
Completing a match marks the court as `OPEN`, immediately triggering the next automated dispatch. Also includes **soft win-by-2 enforcement**, **score correction** after submission, **undo last score**, **abandon match**, and per-player **Win/Loss tracking**.

**Blocked by:** 04: QMaster Composite Dispatch Engine and Explainable Assignment

**Status:** ready-for-agent

- [x] "Record Score" touch action on active Court cards opens a full-screen Big-Pad numeric keypad.
- [x] 1-tap toggle to designate the winning pair/team.
- [x] Flexible numeric score acceptance (accepts any numeric entry such as 11–9, 15–13 without rigidly blocking on "win by 2" formatting).
- [x] In `Open Play`, all four players exit court into the queue.
- [x] In `Winner/Winner vs Loser/Loser`, winning pair enters the Winners Pool and losing pair enters the Losers Pool (`#09`).
- [x] In `Winner Takes All`, match results update cumulative points in the tournament standings (`#10`).
- [x] Court transitions to `OPEN` and immediately dispatches the next waiting Stack or scheduled tournament fixture.
- [x] Match history and player game counts update in IndexedDB.
- [x] Soft win-by-2 enforcement: flag non-conforming scores with a gentle warning without blocking submission.
- [x] Score correction after submission: edit a completed match's score and re-run the rotation outcome.
- [x] Undo last score: revert the most recent score entry in one tap.
- [x] Abandon match: remove an in-play match from the court without recording a score (marks `matches.status = 'abandoned'`).
- [x] Per-player Win/Loss tracking: increment `players.wins` / `players.losses` on every completed match.
- [x] Vitest invariants verify score recording, queue transitions, and mode handoffs.
