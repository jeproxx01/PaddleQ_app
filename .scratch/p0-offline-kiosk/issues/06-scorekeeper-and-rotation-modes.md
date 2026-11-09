# 06: Fast Numeric Scorekeeper with Rotation Modes and Post-Match Choice

**What to build:** Big-Pad numeric score entry on active courts and rotation rule execution. Tapping "Record Score" on an in-play Court card opens a full-screen keypad for fast numeric score entry (e.g., 11–8) with 1-tap winner selection. When score is confirmed, the system executes the session's active Rotation Mode:
- In `4-In / 4-Out`: All four players rotate off and are prompted with Post-Match Choice (*Stay Together*, *Same Players New Teams*, *Shuffle*).
- In `Winners Stay & Split`: The winning pair remains on court, splitting partners for the next game unless capped. Automatically enforces the 2-consecutive-win limit (Max Win Limit), rotating capped winners off.
Completing a match marks the court as `OPEN`, immediately triggering the next automated dispatch.

**Blocked by:** 04: QMaster Composite Dispatch Engine and Explainable Assignment

**Status:** ready-for-agent

- [ ] "Record Score" touch action on active Court cards opens a full-screen Big-Pad numeric keypad.
- [ ] 1-tap toggle to designate the winning pair/team.
- [ ] Flexible numeric score acceptance (accepts any numeric entry such as 11–9, 15–13 without rigidly blocking on "win by 2" formatting).
- [ ] In `4-In / 4-Out`, all four players exit court into the queue according to their Post-Match Choice:
  - *Stay Together*: Exits into queue as a locked Pair (Team Lock) at the back.
  - *Same Players New Teams*: Immediate rematch re-pairing the four players on court.
  - *Shuffle*: Exits as four separate Solo entries at the back of the queue.
- [ ] In `Winners Stay & Split`, winning pair remains on court with `consecutiveWins` incremented by 1, and losing pair rotates into the back of the queue.
- [ ] Max Win Limit enforced: If a winning pair reaches 2 consecutive wins in `Winners Stay & Split`, they are capped and forced off the court back into the queue.
- [ ] Court transitions to `OPEN` and immediately dispatches the next waiting Stack.
- [ ] Match history and player game counts update in IndexedDB.
- [ ] Invariant tests in Vitest verify the 2-win cap, score recording, and queue re-entry state transitions.
