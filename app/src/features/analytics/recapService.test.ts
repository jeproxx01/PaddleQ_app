import { describe, it, expect } from 'vitest';
import type { Match, Player, SessionPlayer } from '../../db/db';
import {
  computeCourtsPlayed,
  computeAvgWaitTimes,
  buildSessionRecap,
  formatDuration,
  formatAvgWait,
} from './recapService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkPlayer(id: string, name: string, wins = 0, losses = 0): Player {
  return {
    id,
    name,
    skillLevel: 'intermediate',
    gender: 'any',
    gamesPlayed: wins + losses,
    wins,
    losses,
    createdAt: 1000,
  };
}

function mkMatch(
  id: string,
  courtId: string,
  playerIds: string[],
  opts: Partial<Match> = {}
): Match {
  return {
    id,
    sessionId: 'sess-1',
    courtId,
    gameMode: 'open-play',
    playerIds,
    team1PlayerIds: playerIds.slice(0, 2),
    team2PlayerIds: playerIds.slice(2, 4),
    consecutiveWins: 0,
    selectionReasons: [],
    mixedDoubles: false,
    status: 'completed',
    startedAt: 1000,
    completedAt: 61000, // 1 minute
    ...opts,
  };
}

function mkSessionPlayer(playerId: string, joinedAt: number): SessionPlayer {
  return {
    id: `sp-${playerId}`,
    sessionId: 'sess-1',
    playerId,
    checkInState: 'ready',
    joinedAt,
  };
}

// ---------------------------------------------------------------------------
// computeCourtsPlayed
// ---------------------------------------------------------------------------

describe('computeCourtsPlayed', () => {
  it('counts how many completed matches each player appeared in', () => {
    const p1 = 'p1'; const p2 = 'p2'; const p3 = 'p3'; const p4 = 'p4';
    const matches: Match[] = [
      mkMatch('m1', 'c1', [p1, p2, p3, p4]),
      mkMatch('m2', 'c2', [p1, p2, p3, p4]),
      mkMatch('m3', 'c1', [p1, p2, p3, p4]),
    ];
    const counts = computeCourtsPlayed(matches);
    expect(counts.get(p1)).toBe(3);
    expect(counts.get(p4)).toBe(3);
  });

  it('ignores abandoned and in_play matches', () => {
    const p1 = 'p1'; const p2 = 'p2'; const p3 = 'p3'; const p4 = 'p4';
    const matches: Match[] = [
      mkMatch('m1', 'c1', [p1, p2, p3, p4]),
      mkMatch('m2', 'c1', [p1, p2, p3, p4], { status: 'abandoned' }),
      mkMatch('m3', 'c1', [p1, p2, p3, p4], { status: 'in_play', completedAt: undefined }),
    ];
    const counts = computeCourtsPlayed(matches);
    expect(counts.get(p1)).toBe(1);
  });

  it('returns empty map when no matches', () => {
    expect(computeCourtsPlayed([])).toEqual(new Map());
  });
});

// ---------------------------------------------------------------------------
// computeAvgWaitTimes
// ---------------------------------------------------------------------------

describe('computeAvgWaitTimes', () => {
  it('computes wait from joinedAt to first match start', () => {
    const p1 = 'p1'; const p2 = 'p2'; const p3 = 'p3'; const p4 = 'p4';
    // Player joined at t=0, match started at t=5000 → wait = 5000ms
    const matches = [
      mkMatch('m1', 'c1', [p1, p2, p3, p4], { startedAt: 5000, completedAt: 65000 }),
    ];
    const sessionPlayers = [p1, p2, p3, p4].map((id) => mkSessionPlayer(id, 0));
    const avgs = computeAvgWaitTimes(matches, sessionPlayers);
    expect(avgs.get(p1)).toBe(5000);
  });

  it('computes wait between consecutive matches for same player', () => {
    const p1 = 'p1'; const p2 = 'p2'; const p3 = 'p3'; const p4 = 'p4';
    // Match 1: started=1000, completed=11000; Match 2: started=16000 → wait=5000ms
    const matches = [
      mkMatch('m1', 'c1', [p1, p2, p3, p4], { startedAt: 1000, completedAt: 11000 }),
      mkMatch('m2', 'c2', [p1, p2, p3, p4], { startedAt: 16000, completedAt: 26000 }),
    ];
    const sessionPlayers = [p1, p2, p3, p4].map((id) => mkSessionPlayer(id, 0));
    const avgs = computeAvgWaitTimes(matches, sessionPlayers);
    // Wait 1 = 1000 - 0 = 1000, wait 2 = 16000 - 11000 = 5000 → avg = 3000
    expect(avgs.get(p1)).toBe(3000);
  });

  it('never returns a negative wait time', () => {
    const p1 = 'p1'; const p2 = 'p2'; const p3 = 'p3'; const p4 = 'p4';
    // joinedAt after match start (clock skew edge case)
    const matches = [
      mkMatch('m1', 'c1', [p1, p2, p3, p4], { startedAt: 100, completedAt: 5000 }),
    ];
    const sessionPlayers = [p1, p2, p3, p4].map((id) => mkSessionPlayer(id, 500));
    const avgs = computeAvgWaitTimes(matches, sessionPlayers);
    expect(avgs.get(p1)).toBeGreaterThanOrEqual(0);
  });

  it('returns empty map when no completed matches', () => {
    const result = computeAvgWaitTimes(
      [mkMatch('m1', 'c1', ['p1', 'p2', 'p3', 'p4'], { status: 'in_play', completedAt: undefined })],
      [mkSessionPlayer('p1', 0)]
    );
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildSessionRecap
// ---------------------------------------------------------------------------

describe('buildSessionRecap', () => {
  it('populates courtsPlayed and avgWaitTimeMs on player rows', () => {
    const p1 = mkPlayer('p1', 'Alice', 2, 1);
    const p2 = mkPlayer('p2', 'Bob', 1, 2);
    const p3 = mkPlayer('p3', 'Carol', 0, 1);
    const p4 = mkPlayer('p4', 'Dave', 0, 1);
    const matches = [
      mkMatch('m1', 'c1', ['p1', 'p2', 'p3', 'p4'], {
        startedAt: 2000,
        completedAt: 62000,
        winningTeam: 1,
      }),
    ];
    const sessionPlayers = ['p1', 'p2', 'p3', 'p4'].map((id) => mkSessionPlayer(id, 0));
    const courtNumberById = new Map([['c1', 1]]);

    const { playerRows, matchRows } = buildSessionRecap(
      [p1, p2, p3, p4],
      matches,
      sessionPlayers,
      courtNumberById
    );

    // Player rows sorted by wins desc
    expect(playerRows[0].name).toBe('Alice');
    expect(playerRows[0].wins).toBe(2);
    expect(playerRows[0].courtsPlayed).toBe(1);
    expect(playerRows[0].avgWaitTimeMs).toBeGreaterThanOrEqual(0);

    // Match rows
    expect(matchRows).toHaveLength(1);
    expect(matchRows[0].courtNumber).toBe(1);
    expect(matchRows[0].team1).toBe('Alice & Bob');
    expect(matchRows[0].winner).toBe('Alice & Bob');
  });

  it('excludes abandoned matches from matchRows', () => {
    const players = ['p1', 'p2', 'p3', 'p4'].map((id) => mkPlayer(id, id));
    const matches = [
      mkMatch('m1', 'c1', ['p1', 'p2', 'p3', 'p4']),
      mkMatch('m2', 'c1', ['p1', 'p2', 'p3', 'p4'], { status: 'abandoned' }),
    ];
    const { matchRows } = buildSessionRecap(players, matches, [], new Map([['c1', 1]]));
    expect(matchRows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('formats milliseconds as Xm YYs', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(60000)).toBe('1m 00s');
    expect(formatDuration(90500)).toBe('1m 30s');
    expect(formatDuration(3661000)).toBe('61m 01s');
  });
});

describe('formatAvgWait', () => {
  it('returns — for zero wait', () => {
    expect(formatAvgWait(0)).toBe('—');
  });

  it('formats non-zero waits', () => {
    expect(formatAvgWait(90000)).toBe('1m 30s');
  });
});
