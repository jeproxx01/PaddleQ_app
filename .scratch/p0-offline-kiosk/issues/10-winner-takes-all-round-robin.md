# 10: Winner Takes All Round Robin Tournament Mode

**What to build:** The `Winner Takes All` Game Mode — a bracketed round-robin tournament where individual entrants are auto-paired into balanced 2-person teams using a Seeded High-Low draw (guaranteeing that no two Advanced players are ever teamed together). Teams compete across a pre-generated round-robin schedule, accumulating total points across all matches to top the live leaderboard. Features live standings on both Kiosk and TV Broadcast views and triggers a grand Prize Winner victory ceremony upon final match completion.

**Blocked by:** 01: Scaffold & Session Shell, 04: QMaster Composite Dispatch Engine, 06: Fast Numeric Scorekeeper with Game Modes

**Status:** resolved

- [x] `winner-takes-all-round-robin` value wired through `sessions.gameMode` and selectable in Wizard and Settings.
- [x] Seeded High-Low Balanced Pairing Algorithm: sorts players by skill level descending and pairs top-half seeds with bottom-half players, strictly preventing Advanced + Advanced teams.
- [x] Even-count requirement & standby handling: requires an even number of entrants (odd entrants held on waitlist/standby).
- [x] Automated round-robin schedule generator: circle method generates complete round-by-round fixtures where every pair plays every other pair once.
- [x] Fixture dispatch engine: open courts automatically pull the next scheduled round-robin fixture whose teams are not currently active on court.
- [x] Cumulative point tracking: every point scored is accumulated to team standings in `tournamentTeams` (wins/losses and point differential also tracked).
- [x] Live Leaderboard component: surfaces real-time rank, record, point differential, and total points on Kiosk and TV Broadcast screens.
- [x] Prize Winner celebration: celebratory victory podium and banner announce the grand champion once all tournament fixtures conclude.
- [x] Vitest invariants: Advanced dispersion invariant verified; round-robin fixture completeness verified; cumulative point sorting and tie-breaking verified.
