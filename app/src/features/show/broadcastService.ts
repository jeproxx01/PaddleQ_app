import { db, type Match, type Player } from '../../db/db';

/**
 * Broadcast service (ticket #12).
 *
 * Pure data queries for the read-only TV Broadcast Screen: recent completed
 * match results and the next-games waiting line. These are view-model projections
 * over the same IndexedDB store the Kiosk writes to, so the TV mirrors the Kiosk
 * without a network hop.
 */

export interface RecentResult {
  matchId: string;
  courtNumber: number;
  team1Names: string[];
  team2Names: string[];
  score1?: number;
  score2?: number;
  winningTeam?: 1 | 2;
  completedAt: number;
}

export interface NextGame {
  stackId: string;
  playerNames: string[];
  playerCount: number;
  isFull: boolean;
}

/**
 * Returns the most recent completed matches for the session, most recent first.
 */
export async function getRecentResults(
  sessionId: string,
  limit: number
): Promise<RecentResult[]> {
  const completedMatches = (
    await db.matches
      .where('sessionId')
      .equals(sessionId)
      .and((m: Match) => m.status === 'completed' && m.completedAt != null)
      .toArray()
  )
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, limit);

  if (completedMatches.length === 0) return [];

  // Gather all player IDs and court IDs in one pass
  const allPlayerIds = Array.from(
    new Set(completedMatches.flatMap((m) => m.playerIds))
  );
  const allCourtIds = Array.from(
    new Set(completedMatches.map((m) => m.courtId))
  );

  const players = await db.players.where('id').anyOf(allPlayerIds).toArray();
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  const courts = await db.courts.where('id').anyOf(allCourtIds).toArray();
  const courtMap = new Map(courts.map((c) => [c.id, c]));

  return completedMatches.map((match) => ({
    matchId: match.id,
    courtNumber: courtMap.get(match.courtId)?.courtNumber ?? 0,
    team1Names: match.team1PlayerIds.map(
      (id) => playerMap.get(id)?.name ?? 'Player'
    ),
    team2Names: match.team2PlayerIds.map(
      (id) => playerMap.get(id)?.name ?? 'Player'
    ),
    score1: match.score1,
    score2: match.score2,
    winningTeam: match.winningTeam,
    completedAt: match.completedAt!,
  }));
}

/**
 * Returns the waiting stacks (next games in queue) for the broadcast display.
 */
export async function getNextGames(
  sessionId: string,
  limit: number
): Promise<NextGame[]> {
  const waitingStacks = (
    await db.stacks
      .where('sessionId')
      .equals(sessionId)
      .and((s) => s.status === 'waiting')
      .toArray()
  )
    .sort((a, b) => a.queuedAt - b.queuedAt)
    .slice(0, limit);

  if (waitingStacks.length === 0) return [];

  const allPlayerIds = Array.from(
    new Set(waitingStacks.flatMap((s) => s.playerIds))
  );
  const players = await db.players.where('id').anyOf(allPlayerIds).toArray();
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  return waitingStacks.map((stack) => ({
    stackId: stack.id,
    playerNames: stack.playerIds.map(
      (id) => playerMap.get(id)?.name ?? 'Player'
    ),
    playerCount: stack.playerIds.length,
    isFull: stack.playerIds.length === 4,
  }));
}
