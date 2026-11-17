# Game-mode pivot to three tournament-focused modes

PaddleQ originally carried six game modes; this change retires `Winners Stay & Split`, `Challenge Court`, and `Time-Based`, leaving exactly three — `Open Play`, `Winner/Winner vs Loser/Loser`, and `Winner Takes All`. We made the cut because each surviving mode maps to a distinct, commonly-requested open-play structure (free rotation, dual-pool queueing, bracketed tournament), while the retired modes each duplicated rotation logic already covered elsewhere and fragmented the dispatch and scoring engines across six `gameMode` branches.

**Consequences:**

- `GAME_MODES` in `app/src/db/db.ts` holds only the three values; the `winners-stay-split`, `challenge-court`, and `time-based` branches were removed from the dispatch and scoring engines.
- The retired modes' tickets are marked `wontfix` and superseded (`superseded-challenge-court-mode.md`, `superseded-time-based-game-mode.md`); their implementations remain recoverable from git history if a venue later needs one.
