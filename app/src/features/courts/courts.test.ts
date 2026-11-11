import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { formatMatchTimer, isMatchDurationStalled, getMatchTimerColorClass } from './courtUtils';
import { getCourtsWithMatches, assignMatchToCourt, clearCourt } from './courtService';

describe('courtUtils', () => {
  it('formats seconds into MM:SS format with leading zeros', () => {
    expect(formatMatchTimer(0)).toBe('00:00');
    expect(formatMatchTimer(45)).toBe('00:45');
    expect(formatMatchTimer(65)).toBe('01:05');
    expect(formatMatchTimer(599)).toBe('09:59');
    expect(formatMatchTimer(1200)).toBe('20:00');
  });

  it('correctly identifies when a match has exceeded the 20-minute threshold', () => {
    expect(isMatchDurationStalled(0)).toBe(false);
    expect(isMatchDurationStalled(1199)).toBe(false);
    expect(isMatchDurationStalled(1200)).toBe(true);
    expect(isMatchDurationStalled(1500)).toBe(true);
  });

  it('returns appropriate color class based on stalled state', () => {
    expect(getMatchTimerColorClass(500)).toContain('text-cyan');
    expect(getMatchTimerColorClass(1200)).toContain('text-tangerine');
    expect(getMatchTimerColorClass(1800)).toContain('text-tangerine');
  });
});

describe('courtService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('retrieves courts along with active match and player details', async () => {
    const sessionId = crypto.randomUUID();
    const courtId = crypto.randomUUID();
    const matchId = crypto.randomUUID();

    // Create 4 players
    const players = [
      { id: crypto.randomUUID(), name: 'Alex', skillLevel: 'intermediate' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Dave', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Sarah', skillLevel: 'advanced' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Lisa', skillLevel: 'intermediate' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
    ];
    await db.players.bulkAdd(players);

    // Create court
    await db.courts.add({
      id: courtId,
      sessionId,
      courtNumber: 1,
      status: 'open',
      updatedAt: Date.now(),
    });

    // Create match
    const matchStartTime = Date.now() - 30000; // 30s ago
    await db.matches.add({
      id: matchId,
      sessionId,
      courtId,
      gameMode: 'open-play',
      playerIds: players.map((p) => p.id),
      team1PlayerIds: [players[0].id, players[1].id],
      team2PlayerIds: [players[2].id, players[3].id],
      consecutiveWins: 0,
      selectionReasons: ['Waited longest'],
      mixedDoubles: false,
      status: 'in_play',
      startedAt: matchStartTime,
    });

    // Assign match to court
    await assignMatchToCourt(courtId, matchId);

    const courtsWithData = await getCourtsWithMatches(sessionId);
    expect(courtsWithData).toHaveLength(1);
    const c1 = courtsWithData[0];
    expect(c1.courtNumber).toBe(1);
    expect(c1.status).toBe('in_play');
    expect(c1.activeMatch).toBeDefined();
    expect(c1.activeMatch?.id).toBe(matchId);
    expect(c1.activeMatch?.players).toHaveLength(4);
    expect(c1.activeMatch?.players.map((p) => p.name)).toEqual(['Alex', 'Dave', 'Sarah', 'Lisa']);

    // Clear court
    await clearCourt(courtId);
    const clearedCourts = await getCourtsWithMatches(sessionId);
    expect(clearedCourts[0].status).toBe('open');
    expect(clearedCourts[0].activeMatch).toBeUndefined();
  });
});
