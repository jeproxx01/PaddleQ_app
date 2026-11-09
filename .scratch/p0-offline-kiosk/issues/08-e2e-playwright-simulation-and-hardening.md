# 08: Kiosk End-to-End Playwright Suite and Offline Hardening

**What to build:** An end-to-end integration and usability verification suite using Playwright with the Page Object Model (`KioskPageObject`) simulating a tablet kiosk in sunlight. Exercises the full open-play lifecycle: player joins, queue progression, automated dispatches, audio announcement spies, score entries, rotation capping, and organizer overrides. Verifies complete state survival across page reloads and tests rapid multi-touch safety against race conditions.

**Blocked by:** 05: Web Speech API TTS Caller and Full-Screen Court Call Flash, 07: PIN Admin Drawer with Mid-Session Adjustments and Emergency Controls

**Status:** ready-for-agent

- [ ] Playwright test suite configured for tablet viewport (1024x768) and Page Object Model (`KioskPageObject`).
- [ ] End-to-end simulation: Launch session with 4 courts $\rightarrow$ join 8 players (2 complete stacks) $\rightarrow$ verify first stack auto-dispatches to Court 1 $\rightarrow$ record match score 11–8 $\rightarrow$ verify Stack 2 dispatches.
- [ ] Spied Web Speech API assertions: Verify `window.speechSynthesis.speak` is invoked with proper court and player name parameters.
- [ ] Invariant check: Verify 10-second visual callout modal appears and dismisses cleanly.
- [ ] Rotation verification: Simulate `Winners Stay & Split` through 2 consecutive wins; verify that the winning pair is forced off court on their second win.
- [ ] Offline & reload test: Add players and start games $\rightarrow$ trigger page reload $\rightarrow$ verify all courts, timers, and queues restore without state loss.
- [ ] Rapid multi-touch race-condition safety: Rapid simultaneous join/score taps do not cause duplicate dispatches or corrupted stack states.
- [ ] Touch target audit: Verify all primary touch targets meet or exceed 56px height for tablet usability.
