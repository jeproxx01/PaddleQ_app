# 02: Court Grid Board with Live Elapsed Timers and 20-Minute Alert

**What to build:** The primary court grid board displayed on the Kiosk. Shows all configured courts (1 to 12) rendered as high-contrast "Electric Obsidian" cards. Each Court card displays the court number, status pill (`OPEN` or `IN PLAY`), assigned player names when active, and a live elapsed match timer formatted in tabular monospace font. If a match exceeds 20 minutes, the timer text shifts from Electric Cyan (`#00E5FF`) to Warm Tangerine (`#FF8A00`) as a soft alert.

**Blocked by:** 01: App Scaffold, Design System Tokens, and Session Launch Shell

**Status:** resolved

- [x] Court cards dynamically render according to the session's active court count (1 to 12).
- [x] Court cards display clear status pills: `OPEN` in subtle border and `IN PLAY` in Electric Cyan (`#00E5FF`).
- [x] Active Court cards show the 4 player names currently playing on that court.
- [x] Each active court runs a real-time elapsed match timer in tabular monospace numbers (`font-mono` / `tabular-nums`) to prevent text jitter.
- [x] Live match timers automatically shift color to Warm Tangerine (`#FF8A00`) when the match duration exceeds 20 minutes (1200 seconds), providing a soft warning of stalled games.
- [x] Responsive grid layout cleanly displays 1 to 12 courts on tablet viewports (1024x768) and scales cleanly for external TV mirroring.
