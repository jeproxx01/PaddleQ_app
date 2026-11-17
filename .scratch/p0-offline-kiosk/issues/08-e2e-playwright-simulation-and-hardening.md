# 08: Kiosk End-to-End Playwright Suite and Offline Hardening

**What to build:** An end-to-end integration and usability verification suite using Playwright with the Page Object Model (`KioskPageObject`) simulating a tablet kiosk in sunlight. Exercises the full multi-screen workflow and open-play lifecycle: Landing → Wizard → Lobby → Live, player joins, check-in states, queue progression, automated dispatches, audio announcement spies, score entries, rotation capping, and organizer overrides. Verifies complete state survival across page reloads and tests rapid multi-touch safety against race conditions. Covers the active game modes: `Open Play`, `Winner/Winner vs Loser/Loser`, `Winner Takes All`, QR check-in, the `/show` broadcast, device linking, and analytics export.

**Blocked by:** 05: Web Speech API TTS Caller and Full-Screen Court Call Flash, 07: PIN Admin Drawer with Mid-Session Adjustments and Emergency Controls, 09: Winner vs Loser Pools Game Mode, 10: Winner Takes All Round Robin Tournament Mode

**Status:** ready-for-agent

- [ ] Playwright test suite configured for tablet viewport (1024x768) and Page Object Model (`KioskPageObject`).
- [ ] End-to-end simulation: Launch session with 4 courts $\rightarrow$ join 8 players (2 complete stacks) $\rightarrow$ verify first stack auto-dispatches to Court 1 $\rightarrow$ record match score 11–8 $\rightarrow$ verify Stack 2 dispatches.
- [ ] Spied Web Speech API assertions: Verify `window.speechSynthesis.speak` is invoked with proper court and player name parameters.
- [ ] Invariant check: Verify 10-second visual callout modal appears and dismisses cleanly.
- [ ] Dual-pool verification: Simulate `Winner/Winner vs Loser/Loser`; verify winning pair enters Winners Pool and losing pair enters Losers Pool.
- [ ] Tournament mode verification: Simulate `Winner Takes All`; verify Seeded High-Low pairs are created with 0 Advanced-Advanced pairings, round-robin fixtures dispatch, and leaderboard sums points.
- [ ] Offline & reload test: Add players and start games $\rightarrow$ trigger page reload $\rightarrow$ verify all courts, timers, and queues restore without state loss.
- [ ] Rapid multi-touch race-condition safety: Rapid simultaneous join/score taps do not cause duplicate dispatches or corrupted stack states.
- [ ] Touch target audit: Verify all primary touch targets meet or exceed 56px height for tablet usability.
- [ ] Workflow journey: Landing → 4-step Wizard → Lobby (check-in states) → Live (sidebar routes render).
- [ ] Check-in states: Verify `Not here` / `Ready` / `Resting` transitions and the Ready→queue handoff.
- [ ] QR check-in (post `#11`): Scan flow lands on a local-network position page.
- [ ] Broadcast screen (post `#12`): `/show` renders live court, tournament leaderboard, and queue state read-only.
- [ ] Device linking (post `#13`): Link two devices via join code and verify role-scoped behavior.
- [ ] Analytics export (post `#14`): Session recap renders and `.xlsx` export downloads.
