import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import {
  getOrCreatePlayer,
  searchPlayers,
  joinSolo,
  joinPair,
  joinFoursome,
  getWaitingStacksWithPlayers,
  computeQueueReadiness,
} from './queueService';

describe('queueService', () => {
  const sessionId = 'session-test-uuid';

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('Player directory and autocomplete', () => {
    it('creates and saves new players in local directory', async () => {
      const p1 = await getOrCreatePlayer('Sarah Connor', 'Advanced');
      expect(p1.id).toBeDefined();
      expect(p1.name).toBe('Sarah Connor');
      expect(p1.skillLevel).toBe('Advanced');

      // Subsequent call with same name returns existing player
      const p2 = await getOrCreatePlayer('Sarah Connor', 'Beginner');
      expect(p2.id).toBe(p1.id);
      expect(p2.skillLevel).toBe('Advanced'); // preserves saved skill level
    });

    it('searches players by prefix case-insensitively for 1-tap autocomplete', async () => {
      await getOrCreatePlayer('Alex Smith', 'Intermediate');
      await getOrCreatePlayer('Alice Cooper', 'Beginner');
      await getOrCreatePlayer('Bob Dylan', 'Advanced');

      const results = await searchPlayers('al');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name)).toContain('Alex Smith');
      expect(results.map((r) => r.name)).toContain('Alice Cooper');

      const bobResults = await searchPlayers('BOB');
      expect(bobResults).toHaveLength(1);
      expect(bobResults[0].name).toBe('Bob Dylan');
    });
  });

  describe('Queue stacking and merging rules', () => {
    it('merges solo walk-in players into oldest incomplete stack', async () => {
      const p1 = await getOrCreatePlayer('Player 1', 'Beginner');
      const p2 = await getOrCreatePlayer('Player 2', 'Intermediate');
      const p3 = await getOrCreatePlayer('Player 3', 'Advanced');
      const p4 = await getOrCreatePlayer('Player 4', 'Intermediate');

      // Join 1st solo -> creates stack 1/4
      const stack1 = await joinSolo(sessionId, p1.id);
      expect(stack1.playerIds).toEqual([p1.id]);

      // Join 2nd solo -> merges into same stack (2/4)
      const stack2 = await joinSolo(sessionId, p2.id);
      expect(stack2.id).toBe(stack1.id);
      expect(stack2.playerIds).toEqual([p1.id, p2.id]);

      // Join 3rd and 4th solos -> merges into same stack (4/4)
      await joinSolo(sessionId, p3.id);
      const stack4 = await joinSolo(sessionId, p4.id);
      expect(stack4.id).toBe(stack1.id);
      expect(stack4.playerIds).toEqual([p1.id, p2.id, p3.id, p4.id]);

      // 5th solo -> stack1 is full (4/4), creates a new stack (1/4)
      const p5 = await getOrCreatePlayer('Player 5', 'Beginner');
      const stack5 = await joinSolo(sessionId, p5.id);
      expect(stack5.id).not.toBe(stack1.id);
      expect(stack5.playerIds).toEqual([p5.id]);

      const waiting = await getWaitingStacksWithPlayers(sessionId);
      expect(waiting).toHaveLength(2);
      expect(waiting[0].playerIds).toHaveLength(4);
      expect(waiting[1].playerIds).toHaveLength(1);
    });

    it('creates a Team Lock pair and preserves partnership', async () => {
      const p1 = await getOrCreatePlayer('Partner A', 'Intermediate');
      const p2 = await getOrCreatePlayer('Partner B', 'Advanced');

      const pairStack = await joinPair(sessionId, p1.id, p2.id);
      expect(pairStack.playerIds).toEqual([p1.id, p2.id]);
      expect(pairStack.teamLockId).toBeDefined();

      // Next two solo players should merge with this pair to complete the 4-stack
      const p3 = await getOrCreatePlayer('Solo 1', 'Beginner');
      const p4 = await getOrCreatePlayer('Solo 2', 'Beginner');

      const merged3 = await joinSolo(sessionId, p3.id);
      expect(merged3.id).toBe(pairStack.id);
      expect(merged3.playerIds).toEqual([p1.id, p2.id, p3.id]);

      const merged4 = await joinSolo(sessionId, p4.id);
      expect(merged4.id).toBe(pairStack.id);
      expect(merged4.playerIds).toEqual([p1.id, p2.id, p3.id, p4.id]);
      expect(merged4.teamLockId).toBe(pairStack.teamLockId);
    });

    it('creates complete 4-Stack directly in line', async () => {
      const players = await Promise.all([
        getOrCreatePlayer('Foursome 1', 'Beginner'),
        getOrCreatePlayer('Foursome 2', 'Intermediate'),
        getOrCreatePlayer('Foursome 3', 'Advanced'),
        getOrCreatePlayer('Foursome 4', 'Intermediate'),
      ]);

      const fourStack = await joinFoursome(
        sessionId,
        players.map((p) => p.id) as [string, string, string, string]
      );
      expect(fourStack.playerIds).toHaveLength(4);
      expect(fourStack.entryType).toBe('foursome');

      const waiting = await getWaitingStacksWithPlayers(sessionId);
      expect(waiting).toHaveLength(1);
      expect(waiting[0].players.map((p) => p.name)).toEqual([
        'Foursome 1',
        'Foursome 2',
        'Foursome 3',
        'Foursome 4',
      ]);
    });
  });

  describe('Readiness counts', () => {
    it('computes human-friendly readiness strings', () => {
      expect(computeQueueReadiness(0)).toBe('No players waiting');
      expect(computeQueueReadiness(3)).toBe('3 waiting — need 1 more for next game');
      expect(computeQueueReadiness(4)).toBe('4 ready — enough for 1 game');
      expect(computeQueueReadiness(6)).toBe('6 ready — enough for 1 game, 2 waiting');
      expect(computeQueueReadiness(8)).toBe('8 ready — enough for 2 games');
      expect(computeQueueReadiness(12)).toBe('12 ready — enough for 3 games');
    });
  });
});
