# 09: Challenge Court (King-of-the-Court) Game Mode

**What to build:** The `Challenge Court` Game Mode — a king-of-the-court variant where the winning pair holds the court and faces the next waiting pair. When a Challenge Court match completes, the winning pair stays on (incrementing `consecutiveWins`) and the next eligible waiting pair is dispatched to challenge them; the losing pair rotates to the back of the queue. A **streak cap** (defaulting to the Max Win Limit of 2) forces the holders off after the cap is reached, rotating them out like any other winners. Reuses the existing dispatch engine to select the challenging pair and the "Why these 4?" badge to explain it.

**Blocked by:** 01: App Scaffold, Design System Tokens, and Session Launch Shell (game mode enum retrofit), 04: QMaster Composite Dispatch Engine and Explainable Assignment, 06: Fast Numeric Scorekeeper with Game Modes and Post-Match Choice

**Status:** ready-for-agent

- [ ] `challenge-court` value wired through `sessions.gameMode` (from the `#01` retrofit) and selectable in the Wizard and Settings drawer.
- [ ] Challenge Court designation: a court can be marked as the Challenge Court; its card shows the streak count and the current holder pair.
- [ ] Hold-and-challenge transition: on match completion, the winning pair stays on court and the losing pair rotates out.
- [ ] Next waiting pair is dispatched to challenge the holders via the dispatch engine (first-14 window, Team Lock intact).
- [ ] Streak cap enforcement: holders reaching the cap are forced off and rotated to the queue, clearing the court for a fresh dispatch.
- [ ] Win/Loss tracking increments for Challenge Court results, and the streak count resets appropriately.
- [ ] "Why these 4?" badge explains the challenger selection on the Challenge Court card.
- [ ] Vitest invariants: holders stay below the streak cap; a challenger pair is always dispatched when a complete waiting pair exists; Team Locks are preserved.
