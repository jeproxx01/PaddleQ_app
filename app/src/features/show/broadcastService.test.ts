import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { getRecentResults, getNextGames } from './broadcastService';

describe('broadcastService', () => {
  const sessionId = 'session-1';

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('getRecentResults', () => {
    it('returns completed matches with player names, most recent first', async () => {
      // Seed players
      const players = [
        { id: 'p1', name: 'Alex', skillLevel: 'intermediate' as const, gender: 'any' as const, gamesPlayed: 2, wins: 1, losses: 1, createdAt: 1 },
        { id: 'p2', name: 'Dave', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 2, wins: 1, losses: 1, createdAt: 1 },
        { id: 'p3', name: 'Sarah', skillLevel: 'advanced' as const, gender: 'any' as const, gamesPlayed: 2, wins: 1, losses: 1, createdAt: 1 },
        { id: 'p4', name: 'Lisa', skillLevel: 'intermediate' as const, gender: 'any' as const, gamesPlayed: 2, wins: 1, losses: 1, createdAt: 1 },
      ];
      await db.players.bulkAdd(players);

      // Completed match (older)
      await db.matches.add({
        id: 'match-old',
        sessionId,
        courtId: 'court-1',
        gameMode: 'open-play',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        team1PlayerIds: ['p1', 'p2'],
        team2PlayerIds: ['p3', 'p4'],
        score1: 11,
        score2: 7,
        winningTeam: 1,
        consecutiveWins: 0,
        selectionReasons: ['Waited longest'],
        mixedDoubles: false,
        status: 'completed',
        startedAt: 1000,
        completedAt: 2000,
      });

      // Completed match (newer)
      await db.matches.add({
        id: 'match-new',
        sessionId,
        courtId: 'court-2',
        gameMode: 'open-play',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        team1PlayerIds: ['p3', 'p4'],
        team2PlayerIds: ['p1', 'p2'],
        score1: 5,
        score2: 11,
        winningTeam: 2,
        consecutiveWins: 0,
        selectionReasons: ['Skill mix'],
        mixedDoubles: false,
        status: 'completed',
        startedAt: 3000,
        completedAt: 4000,
      });

      // In-play match (should NOT appear)
      await db.matches.add({
        id: 'match-active',
        sessionId,
        courtId: 'court-1',
        gameMode: 'open-play',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        team1PlayerIds: ['p1', 'p2'],
        team2PlayerIds: ['p3', 'p4'],
        consecutiveWins: 0,
        selectionReasons: [],
        mixedDoubles: false,
        status: 'in_play',
        startedAt: 5000,
      });

      await db.courts.bulkAdd([
        { id: 'court-1', sessionId, courtNumber: 1, status: 'in_play', updatedAt: 1 },
        { id: 'court-2', sessionId, courtNumber: 2, status: 'open', updatedAt: 1 },
      ]);

      const results = await getRecentResults(sessionId, 5);

      expect(results).toHaveLength(2);
      // Most recent first
      expect(results[0].matchId).toBe('match-new');
      expect(results[1].matchId).toBe('match-old');

      // Verify structure of a result
      const r = results[0];
      expect(r.courtNumber).toBe(2);
      expect(r.team1Names).toEqual(['Sarah', 'Lisa']);
      expect(r.team2Names).toEqual(['Alex', 'Dave']);
      expect(r.score1).toBe(5);
      expect(r.score2).toBe(11);
      expect(r.winningTeam).toBe(2);
    });

    it('returns empty array when no completed matches exist', async () => {
      const results = await getRecentResults(sessionId, 5);
      expect(results).toEqual([]);
    });

    it('respects the limit parameter', async () => {
      const players = [
        { id: 'p1', name: 'A', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p2', name: 'B', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p3', name: 'C', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p4', name: 'D', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
      ];
      await db.players.bulkAdd(players);

      for (let i = 0; i < 5; i++) {
        await db.matches.add({
          id: `m-${i}`,
          sessionId,
          courtId: 'c1',
          gameMode: 'open-play',
          playerIds: ['p1', 'p2', 'p3', 'p4'],
          team1PlayerIds: ['p1', 'p2'],
          team2PlayerIds: ['p3', 'p4'],
          score1: 11,
          score2: 5,
          winningTeam: 1,
          consecutiveWins: 0,
          selectionReasons: [],
          mixedDoubles: false,
          status: 'completed',
          startedAt: i * 1000,
          completedAt: i * 1000 + 500,
        });
      }

      const results = await getRecentResults(sessionId, 3);
      expect(results).toHaveLength(3);
    });
  });

  describe('getNextGames', () => {
    it('returns waiting stacks with player names, ordered by queue position', async () => {
      const players = [
        { id: 'p1', name: 'Alice', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p2', name: 'Bob', skillLevel: 'intermediate' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p3', name: 'Carol', skillLevel: 'advanced' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p4', name: 'Dan', skillLevel: 'beginner' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
        { id: 'p5', name: 'Eve', skillLevel: 'intermediate' as const, gender: 'any' as const, gamesPlayed: 0, wins: 0, losses: 0, createdAt: 1 },
      ];
      await db.players.bulkAdd(players);

      // Full stack (queued first)
      await db.stacks.add({
        id: 'stack-1',
        sessionId,
        entryType: 'foursome',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        queuedAt: 1000,
        status: 'waiting',
      });

      // Partial stack (queued second)
      await db.stacks.add({
        id: 'stack-2',
        sessionId,
        entryType: 'solo',
        playerIds: ['p5'],
        queuedAt: 2000,
        status: 'waiting',
      });

      // Dispatched stack (should NOT appear)
      await db.stacks.add({
        id: 'stack-3',
        sessionId,
        entryType: 'foursome',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        queuedAt: 500,
        status: 'dispatched',
      });

      const nextGames = await getNextGames(sessionId, 5);

      expect(nextGames).toHaveLength(2);
      expect(nextGames[0].stackId).toBe('stack-1');
      expect(nextGames[0].playerNames).toEqual(['Alice', 'Bob', 'Carol', 'Dan']);
      expect(nextGames[0].playerCount).toBe(4);
      expect(nextGames[0].isFull).toBe(true);

      expect(nextGames[1].stackId).toBe('stack-2');
      expect(nextGames[1].playerNames).toEqual(['Eve']);
      expect(nextGames[1].playerCount).toBe(1);
      expect(nextGames[1].isFull).toBe(false);
    });

    it('returns empty array when no waiting stacks exist', async () => {
      const nextGames = await getNextGames(sessionId, 5);
      expect(nextGames).toEqual([]);
    });
  });
});
