# 07: PIN Admin Drawer with Mid-Session Adjustments and Emergency Controls

**What to build:** A slide-out organizer control drawer secured by the session's 4-digit PIN. Provides authorized tools to adjust active court counts (1 to 12), switch the session Rotation Mode (`4-In / 4-Out` vs `Winners Stay & Split`), unlock Team Locks, manually remove absent/no-show players, disband stuck Stacks, override player skill levels, end the active session, and trigger a "Load Demo Session" seed button for instant 4-court/12-player testing.

**Blocked by:** 02: Court Grid Board with Live Elapsed Timers and 20-Minute Alert, 03: Multi-Entry Queueing and Visual Paddle Rack, 06: Fast Numeric Scorekeeper with Rotation Modes and Post-Match Choice

**Status:** ready-for-agent

- [ ] Slide-out PIN Admin Drawer accessible via an unobtrusive lock icon on the Kiosk header.
- [ ] 4-digit PIN keypad verification matching the PIN established during Session Launch (default `1234`).
- [ ] Court count stepper to dynamically scale active courts between 1 and 12 during live open play.
- [ ] Rotation Mode toggle to switch between `4-In / 4-Out` and `Winners Stay & Split` mid-session.
- [ ] Manual Team Lock unlock list: allows organizer to dissolve partner locks back into solo queue entries.
- [ ] Emergency Queue Controls: 1-tap "Remove Player" to evict no-shows and "Disband Stack" to unblock stalled groups.
- [ ] Player skill level override: allows organizer to adjust a player's tier (Beginner, Intermediate, Advanced) in the session directory.
- [ ] "Load Demo Session" seed button: instantly populates 4 active courts and 12 mock players with varying skill levels for verification.
- [ ] "End Session" action with confirmation prompt, finalizing records and clearing active kiosk state.
