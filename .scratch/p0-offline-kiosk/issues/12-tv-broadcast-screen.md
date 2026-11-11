# 12: TV Broadcast Screen (`/show`)

**What to build:** A read-only Broadcast Screen at `/sessions/[id]/show` rendered on a TV via HDMI or local-network cast. It displays live court assignments, winner moments, and queue animations for the whole venue — optimized for large screens and viewing distance. The broadcast is a passive mirror of the Kiosk's live state (courts, next games, waiting line, and recent results) and never accepts input.

**Blocked by:** 01: App Scaffold, Design System Tokens, and Session Launch Shell (persistent sidebar + routing), 02: Court Grid Board with Live Elapsed Timers and 20-Minute Alert

**Status:** ready-for-agent

- [ ] `/sessions/[id]/show` route renders a full-screen, read-only broadcast layout (no sidebar chrome, no touch controls).
- [ ] Live court grid: court number, players, status, and elapsed/countdown timers mirror the Kiosk in real time.
- [ ] "Next games" and "Waiting line" panels, styled for distance readability (large type, high contrast).
- [ ] Winner moment flash: a celebratory overlay when a match completes, then auto-dismisses.
- [ ] Queue animations: dispatched stacks visually move from the waiting line onto their court.
- [ ] Read-only enforcement: the screen ignores all input; organizer controls remain Kiosk-only.
- [ ] State updates flow from the same local store so the TV reflects the Kiosk without a network hop.
