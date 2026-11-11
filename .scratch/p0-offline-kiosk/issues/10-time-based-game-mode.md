# 10: Time-Based Game Mode

**What to build:** The `Time-Based` Game Mode — courts run on a configurable countdown clock (default 15 minutes) instead of a fixed score target. Each Time-Based Court card shows a live countdown in tabular monospace font. At 2 minutes remaining the timer flashes a Warm Tangerine (`#FF8A00`) warning. At time-up, the system auto-calls the end of the match (speech + visual flash via `#05`) and auto-ends it, triggering the next dispatch. Players may still record a score before time-up if a match finishes early.

**Blocked by:** 02: Court Grid Board with Live Elapsed Timers and 20-Minute Alert (countdown timer), 05: Web Speech API TTS Caller and Full-Screen Court Call Flash, 06: Fast Numeric Scorekeeper with Game Modes and Post-Match Choice

**Status:** ready-for-agent

- [ ] `time-based` value wired through `sessions.gameMode` (from the `#01` retrofit) and selectable in the Wizard and Settings drawer.
- [ ] `sessions.timeLimitMinutes` field with a sensible default (15) and configurable duration in the Wizard/Settings.
- [ ] Countdown clock rendered on Time-Based Court cards (monospace tabular numbers), distinct from the elapsed timer.
- [ ] Warning flash at 2 minutes remaining (Warm Tangerine `#FF8A00`).
- [ ] Auto-call at time-up: speech synthesis + full-screen visual flash announcing end of match.
- [ ] Auto-end at time-up: match transitions to completed, court flips to `OPEN`, and the next dispatch triggers.
- [ ] Early score recording still supported: finishing before time-up ends the countdown and dispatches normally.
- [ ] Vitest invariants: countdown reaching zero auto-ends the match; warning state activates at the 2-minute threshold; no dispatch fires while a Time-Based match is still running.
