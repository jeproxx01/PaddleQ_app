# 04: QMaster Composite Dispatch Engine and Explainable Assignment

**What to build:** The automated dispatch engine that assigns waiting players to open courts. Whenever a court is or becomes `OPEN`, the engine evaluates a sliding candidate window of the oldest 6 to 8 waiting players in the FIFO line, ranking possible foursomes to optimize skill balance (Beginner, Intermediate, Advanced) and partner novelty (avoiding recent opponents/partners) without violating FIFO fairness. Automatically transitions the court to `IN PLAY` and attaches a tappable "Why these 4?" badge to the court card displaying the exact Selection Criteria used.

**Blocked by:** 02: Court Grid Board with Live Elapsed Timers and 20-Minute Alert, 03: Multi-Entry Queueing and Visual Paddle Rack

**Status:** resolved

- [x] Dispatch engine evaluates open courts whenever a court transitions to `OPEN` or new players join the queue.
- [x] Evaluation window strictly restricted to the oldest 6 to 8 eligible waiting players to prevent anyone from skipping ahead in the FIFO backbone.
- [x] Candidate foursomes ranked by priority criteria: Waited Longest (FIFO) $\rightarrow$ Skill Mix balance $\rightarrow$ New Partners (penalizing players who shared a court in the last 2 matches).
- [x] Team Lock pairs are preserved intact when evaluating candidate foursomes.
- [x] Dispatched court transitions from `OPEN` to `IN PLAY` with assigned players and starts its match timer.
- [x] Tappable "Why these 4?" badge renders on the Court card, opening an explanation tooltip/modal detailing the applied criteria (e.g., "Waited longest · Skill mix · New partners").
- [x] Vitest invariant tests verify that no eligible player outside the candidate window jumps ahead, and incomplete courts are never starved while 4+ eligible players wait.

## Retrofit (QMaster Parity — required)

> [!WARNING]
> The dispatch window widens from 6–8 to the first-14, the ranking criteria gain a repeat-opponent penalty, and a full audit trail is added.

- [ ] **Widen the candidate window** from the oldest 6–8 to the **first 14 eligible waiting players** in FIFO order.
- [ ] **Update the ranking criteria** to balance all five skill tiers (not three) and add a **repeat-opponent penalty** (penalizing any repeat pairing from recent matches, not just repeat partners).
- [ ] **Add the audit trail**: log every dispatch decision with timestamp, chosen foursome, and reasoning.
- [ ] **Update the "Why these 4?" generator** to reflect the new criteria strings (e.g., "Waited longest", "Skill mix", "New partners", "No repeat opponents").
- [ ] **Keep Team Lock pairs intact** and apply Mixed Doubles / gender mixing rules when ranking foursomes.
- [ ] **Update Vitest invariants** for the first-14 window and repeat-opponent penalty.
