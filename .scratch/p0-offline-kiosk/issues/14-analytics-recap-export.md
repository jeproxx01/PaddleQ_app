# 14: Analytics, Session Recap & Excel Export

**What to build:** A session recap dashboard on the Summary route (`/sessions/[id]/summary`) showing per-player Win/Loss, courts played, and average wait time, plus an Excel (`.xlsx`) export of the session data. The recap aggregates the Win/Loss records (from `#06`) and dispatch/wait-time data (from `#04`) into a single read-only view the organizer can review and share offline.

**Blocked by:** 04: QMaster Composite Dispatch Engine and Explainable Assignment (wait-time data), 06: Fast Numeric Scorekeeper with Game Modes and Post-Match Choice (Win/Loss records)

**Status:** ready-for-agent

- [ ] Summary route (`/sessions/[id]/summary`) renders the recap dashboard within the persistent sidebar layout.
- [x] Per-player Win/Loss summary with wins, losses, and games played.
- [ ] Courts played per player (aggregated from match history).
- [ ] Average wait time per player (from dispatch timestamps).
- [ ] `.xlsx` export generated entirely client-side (offline-capable) with no external service.
- [ ] Export includes per-player stats and match history rows, downloaded as a file.
- [ ] Vitest unit tests cover the recap aggregation and `.xlsx` serialization logic.

## Comments

- Per-player Win/Loss + games-played recap and CSV export landed on the Summary route as a partial start of this ticket (built alongside #15's tournament summary). Remaining: courts played, average wait time, and `.xlsx` export.
