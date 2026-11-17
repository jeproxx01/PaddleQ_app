# Coding Standards

Read during review, not implementation. These rules sit on top of `GLOSSARY.md` (domain vocabulary) and `docs/adr/` (recorded decisions). The code-review skill's smell baseline still applies.

## Domain vocabulary

Code, UI strings, and comments use the canonical term from `GLOSSARY.md`. Never use a synonym listed under a glossary entry's `_Avoid_`. In particular: `Leaderboard` is the live ranking (Kiosk/Broadcast), `Standings` is the final tournament table (Summary) — don't cross them.

## Completing a match is atomic

Every code path that completes a `Match` must do all three in the same operation:

1. `matches.status = 'completed'` with `score1`/`score2`/`winningTeam`,
2. free the court (`courts.status = 'open'`, clear `activeMatchId`),
3. apply per-player Win/Loss via `applyWinLoss` from `features/scoring/winLoss.ts`.

A completed match always has a winner — reject tied scores instead of recording a winnerless result.

## Reuse domain primitives

`applyWinLoss` (per-player Win/Loss) and `recordTournamentResult` (tournament scoring) are the single sources for their math. Import them; don't re-implement the score/Win-Loss arithmetic inline.
