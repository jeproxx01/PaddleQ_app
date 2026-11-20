# 09: Winner vs Loser Pools Game Mode

**What to build:** The `Winner/Winner vs Loser/Loser` Game Mode — a dual-pool queue system where winning pairs stay together in the Winners Pool to challenge another winning pair, losing pairs stay together in the Losers Pool to face another losing pair, and fresh entrants enter as unranked neutral pairs. Open courts prioritize pairing two waiting teams from the Winners Pool, followed by two waiting teams from the Losers Pool, falling back to neutral/FIFO dispatch when pool pairs are unavailable so courts never stay stalled.

**Blocked by:** 01: Scaffold & Session Shell, 04: QMaster Composite Dispatch Engine, 06: Fast Numeric Scorekeeper with Game Modes

**Status:** resolved

- [x] `winner-vs-loser-pools` value wired through `sessions.gameMode` and selectable in the Wizard and Settings drawer.
- [x] Dual-pool queueing: on match completion, winning pair remains partnered and re-enters queue with `pool: 'winners'`.
- [x] Losing pair remains partnered and re-enters queue with `pool: 'losers'`.
- [x] Pool-based dispatch: open courts check for $\ge 2$ waiting winner pair stacks and dispatch Winner vs Winner.
- [x] Loser pool dispatch: open courts check for $\ge 2$ waiting loser pair stacks and dispatch Loser vs Loser.
- [x] Neutral entry: fresh waiting players/pairs enter as unranked/neutral, dispatching normally and advancing winners to the Winners Pool and losers to the Losers Pool.
- [x] Visual rack badges: "Winners Pool" and "Losers Pool" indicators rendered on stack cards in the Paddle Rack.
- [x] Vitest invariants: winning pairs enter Winners Pool; losing pairs enter Losers Pool; two winner pairs dispatch against each other; courts fallback safely when pool pairs are unavailable.
