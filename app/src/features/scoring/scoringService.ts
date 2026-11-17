import { db, type Match } from '../../db/db';
import { recordTournamentResult } from '../tournament/tournamentService';
import { applyWinLoss } from './winLoss';

/**
 * Scorekeeping domain service (ticket #06).
 *
 * Records match scores, tracks per-player Win/Loss, applies the session's Game
 * Mode rotation rules, and supports correction, undo, and abandon.
 *
 * The "winners stay" re-pairing mechanics (re-queueing the staying pair against
 * the next waiting players) are handled by the post-match transition caller,
 * using the `winnersStay` / `stayingPlayerIds` fields returned below.
 */

export const MAX_WIN_LIMIT = 2;

export interface RecordScoreResult {
  matchId: string;
  courtId: string;
  winningTeam: 1 | 2;
  winnersStay: boolean;
  capped: boolean;
  rotatingPlayerIds: string[];
  stayingPlayerIds: string[];
}

function winningAndLosingIds(match: Match, winningTeam: 1 | 2): [string[], string[]] {
  const winningIds = winningTeam === 1 ? match.team1PlayerIds : match.team2PlayerIds;
  const losingIds = winningTeam === 1 ? match.team2PlayerIds : match.team1PlayerIds;
  return [winningIds, losingIds];
}

export async function recordScore(
  sessionId: string,
  matchId: string,
  score1: number,
  score2: number,
  winningTeam: 1 | 2
): Promise<RecordScoreResult> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'in_play') {
    throw new Error('Match is not in play');
  }
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const [winningIds, losingIds] = winningAndLosingIds(match, winningTeam);

  const now = Date.now();
  await db.matches.update(matchId, {
    score1,
    score2,
    winningTeam,
    status: 'completed',
    completedAt: now,
  });

  await applyWinLoss(winningIds, losingIds, 1);

  // If session is Winner vs Loser Pools, route winning pair to Winners Pool and losing pair to Losers Pool
  if (session.gameMode === 'winner-vs-loser-pools') {
    await db.stacks.bulkAdd([
      {
        id: crypto.randomUUID(),
        sessionId,
        entryType: 'pair',
        playerIds: winningIds,
        teamLockId: crypto.randomUUID(),
        teamLockPlayerIds: [winningIds[0], winningIds[1]],
        pool: 'winners',
        queuedAt: now,
        status: 'waiting',
      },
      {
        id: crypto.randomUUID(),
        sessionId,
        entryType: 'pair',
        playerIds: losingIds,
        teamLockId: crypto.randomUUID(),
        teamLockPlayerIds: [losingIds[0], losingIds[1]],
        pool: 'losers',
        queuedAt: now + 1,
        status: 'waiting',
      },
    ]);
  }

  // If session is Winner Takes All, update the tournament fixture & standings
  if (session.gameMode === 'winner-takes-all-round-robin') {
    const fixture = await db.tournamentFixtures
      .where('sessionId')
      .equals(sessionId)
      .and((f) => f.matchId === matchId || (f.courtId === match.courtId && f.status === 'in_play'))
      .first();

    if (fixture) {
      await recordTournamentResult(fixture.id, score1, score2, matchId);
    }
  }

  // Open the court so the next dispatch can fill it.
  await db.courts.update(match.courtId, {
    status: 'open',
    activeMatchId: undefined,
    updatedAt: now,
  });

  const rotatingPlayerIds = [...winningIds, ...losingIds];
  const stayingPlayerIds: string[] = [];

  return {
    matchId,
    courtId: match.courtId,
    winningTeam,
    winnersStay: false,
    capped: false,
    rotatingPlayerIds,
    stayingPlayerIds,
  };
}

export async function abandonMatch(sessionId: string, matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'in_play') {
    throw new Error('Match is not in play');
  }

  const now = Date.now();
  await db.matches.update(matchId, { status: 'abandoned', completedAt: now });
  await db.courts.update(match.courtId, {
    status: 'open',
    activeMatchId: undefined,
    updatedAt: now,
  });
}

export async function correctScore(
  matchId: string,
  score1: number,
  score2: number,
  winningTeam: 1 | 2
): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'completed') {
    throw new Error('Match is not completed');
  }

  // Reverse the previous Win/Loss before applying the corrected result.
  if (match.winningTeam) {
    const [oldWinningIds, oldLosingIds] = winningAndLosingIds(match, match.winningTeam);
    await applyWinLoss(oldWinningIds, oldLosingIds, -1);
  }

  await db.matches.update(matchId, { score1, score2, winningTeam });

  const [newWinningIds, newLosingIds] = winningAndLosingIds(match, winningTeam);
  await applyWinLoss(newWinningIds, newLosingIds, 1);
}

export async function undoLastScore(sessionId: string): Promise<string | undefined> {
  const completed = (await db.matches.where('sessionId').equals(sessionId).toArray())
    .filter((m) => m.status === 'completed')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const match = completed[0];
  if (!match) return undefined;

  // Reverse the recorded Win/Loss.
  if (match.winningTeam) {
    const [winningIds, losingIds] = winningAndLosingIds(match, match.winningTeam);
    await applyWinLoss(winningIds, losingIds, -1);
  }

  const revertedConsecutiveWins = Math.max(0, match.consecutiveWins - 1);

  await db.matches.update(match.id, {
    score1: undefined,
    score2: undefined,
    winningTeam: undefined,
    status: 'in_play',
    completedAt: undefined,
    consecutiveWins: revertedConsecutiveWins,
  });

  await db.courts.update(match.courtId, {
    status: 'in_play',
    activeMatchId: match.id,
    updatedAt: Date.now(),
  });

  return match.id;
}
