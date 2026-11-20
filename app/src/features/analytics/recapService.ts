import type { Match, Player, SessionPlayer } from '../../db/db';

/**
 * Analytics & Session Recap domain service (ticket #14).
 *
 * All functions are pure — they accept pre-fetched data arrays and return
 * derived values. No Dexie imports here so the entire module is unit-testable
 * with fake-indexeddb-free Vitest.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerRecapRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  courtsPlayed: number;
  avgWaitTimeMs: number;
}

export interface MatchHistoryRow {
  matchId: string;
  courtNumber: number;
  team1: string;
  team2: string;
  score: string;
  winner: string;
  durationMs: number;
}

export interface SessionRecap {
  playerRows: PlayerRecapRow[];
  matchRows: MatchHistoryRow[];
}

// ---------------------------------------------------------------------------
// Courts played
// ---------------------------------------------------------------------------

/**
 * Counts how many distinct completed matches each player appeared in.
 */
export function computeCourtsPlayed(matches: Match[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of matches) {
    if (match.status !== 'completed') continue;
    for (const pid of match.playerIds) {
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Average wait time
// ---------------------------------------------------------------------------

/**
 * Computes per-player average wait time in milliseconds.
 *
 * "Wait time" for a match = match.startedAt − sessionPlayer.joinedAt for the
 * player's first appearance, or the previous match's completedAt for
 * subsequent matches (i.e. how long between finishing one game and starting
 * the next).
 *
 * Simplified model used here: for each completed match a player participated
 * in, their wait for *that* match is estimated as:
 *   match.startedAt - sessionPlayer.joinedAt   (for first match in session)
 *   match.startedAt - previousMatch.completedAt (for subsequent matches)
 *
 * When completedAt is missing for the previous match, we fall back to
 * joinedAt so we never produce a negative wait time.
 */
export function computeAvgWaitTimes(
  matches: Match[],
  sessionPlayers: SessionPlayer[]
): Map<string, number> {
  const joinedAtByPlayer = new Map<string, number>(
    sessionPlayers.map((sp) => [sp.playerId, sp.joinedAt])
  );

  // Sort completed matches by startedAt ascending
  const completed = matches
    .filter((m) => m.status === 'completed' && m.completedAt != null)
    .sort((a, b) => a.startedAt - b.startedAt);

  // Track each player's last completedAt so we can compute their wait to the next game
  const lastCompletedAt = new Map<string, number>();
  const waitSums = new Map<string, number>();
  const waitCounts = new Map<string, number>();

  for (const match of completed) {
    for (const pid of match.playerIds) {
      const prev = lastCompletedAt.get(pid) ?? joinedAtByPlayer.get(pid) ?? match.startedAt;
      const wait = Math.max(0, match.startedAt - prev);
      waitSums.set(pid, (waitSums.get(pid) ?? 0) + wait);
      waitCounts.set(pid, (waitCounts.get(pid) ?? 0) + 1);
    }
    // Update lastCompletedAt for all players in this match
    for (const pid of match.playerIds) {
      lastCompletedAt.set(pid, match.completedAt!);
    }
  }

  const avgWaits = new Map<string, number>();
  for (const [pid, sum] of waitSums) {
    const count = waitCounts.get(pid) ?? 1;
    avgWaits.set(pid, Math.round(sum / count));
  }
  return avgWaits;
}

// ---------------------------------------------------------------------------
// Full recap aggregation
// ---------------------------------------------------------------------------

export function buildSessionRecap(
  players: Player[],
  matches: Match[],
  sessionPlayers: SessionPlayer[],
  courtNumberById: Map<string, number>
): SessionRecap {
  const courtsPlayed = computeCourtsPlayed(matches);
  const avgWaits = computeAvgWaitTimes(matches, sessionPlayers);

  const playerRows: PlayerRecapRow[] = players.map((p) => ({
    playerId: p.id,
    name: p.name,
    wins: p.wins,
    losses: p.losses,
    gamesPlayed: p.gamesPlayed,
    courtsPlayed: courtsPlayed.get(p.id) ?? 0,
    avgWaitTimeMs: avgWaits.get(p.id) ?? 0,
  }));

  // Sort by wins desc, then name asc
  playerRows.sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));

  const matchRows: MatchHistoryRow[] = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
    .map((m) => {
      const playerMap = new Map(players.map((p) => [p.id, p.name]));
      const team1Names = m.team1PlayerIds.map((id) => playerMap.get(id) ?? id).join(' & ');
      const team2Names = m.team2PlayerIds.map((id) => playerMap.get(id) ?? id).join(' & ');
      const score = m.score1 != null && m.score2 != null ? `${m.score1}–${m.score2}` : '—';
      const winnerTeamNames = m.winningTeam === 1 ? team1Names : m.winningTeam === 2 ? team2Names : '—';
      return {
        matchId: m.id,
        courtNumber: courtNumberById.get(m.courtId) ?? 0,
        team1: team1Names,
        team2: team2Names,
        score,
        winner: winnerTeamNames,
        durationMs:
          m.completedAt != null ? Math.max(0, m.completedAt - m.startedAt) : 0,
      };
    });

  return { playerRows, matchRows };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatAvgWait(ms: number): string {
  if (ms === 0) return '—';
  return formatDuration(ms);
}
