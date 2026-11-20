# 07: PIN Admin Drawer with Mid-Session Adjustments and Emergency Controls

**What to build:** A slide-out organizer control drawer secured by the session's 4-digit PIN, opened from the Settings route (`/sessions/[id]/settings`) where the PIN itself is also set (not the wizard). Provides authorized tools to adjust active court counts (1 to 12), switch the session Game Mode (`Open Play` / `Winner/Winner vs Loser/Loser` / `Winner Takes All`), unlock Team Locks, manually remove absent/no-show players, disband stuck Stacks, override player skill levels (five tiers), define court groups, save/load session presets, review the dispatch audit trail, end the active session, and trigger a "Load Demo Session" seed button for instant 4-court/12-player testing.

**Blocked by:** 02: Court Grid Board with Live Elapsed Timers and 20-Minute Alert, 03: Multi-Entry Queueing and Visual Paddle Rack, 06: Fast Numeric Scorekeeper with Game Modes and Post-Match Choice

**Status:** ready-for-agent

- [x] Slide-out PIN Admin Drawer accessible via the Settings route (`/sessions/[id]/settings`), not a header lock icon.
- [x] PIN set in Settings (default `1234`) and 4-digit keypad verification.
- [x] Court count stepper to dynamically scale active courts between 1 and 12 during live open play.
- [x] Game Mode toggle to switch between `Open Play`, `Winner/Winner vs Loser/Loser`, and `Winner Takes All` mid-session.
- [x] Manual Team Lock unlock list: allows organizer to dissolve partner locks back into solo queue entries.
- [x] Emergency Queue Controls: 1-tap "Remove Player" to evict no-shows and "Disband Stack" to unblock stalled groups.
- [x] Player skill level override: allows organizer to adjust a player's tier (five tiers) in the session directory.
- [ ] Court groups: define and label court groups (e.g., "Beginner courts").
- [ ] Session presets: save/load common configurations (court count, game mode, target score).
- [ ] Favorites / shortcuts: quick actions pinned to the drawer.
- [ ] Dispatch audit trail viewer: list logged dispatch decisions with timestamp and reasoning.
- [x] "Load Demo Session" seed button: instantly populates 4 active courts and 12 mock players with varying skill levels for verification.
- [x] "End Session" action with confirmation prompt, finalizing records and clearing active kiosk state.
