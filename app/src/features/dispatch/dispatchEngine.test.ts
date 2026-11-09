import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { getOrCreatePlayer, joinSolo, joinPair, joinFoursome } from '../queue/queueService';
import { runAutoDispatch, evaluateCandidateFoursomes } from './dispatchEngine';

describe('dispatchEngine', () => {
  let sessionId: string;

  beforeEach(async () => {
    await db.delete();
    await db.open();
    const session = await startSession({ courtCount: 2 });
    sessionId = session.id;
  });

  describe('Sliding window and FIFO backbone invariants', () => {
    it('does not dispatch if fewer than 4 players are waiting', async () => {
      const p1 = await getOrCreatePlayer('P1', 'Beginner');
      const p2 = await getOrCreatePlayer('P2', 'Intermediate');
      await joinPair(sessionId, p1.id, p2.id);

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(0);

      const courts = await db.courts.where('sessionId').equals(sessionId).toArray();
      expect(courts.every((c) => c.status === 'open')).toBe(true);
    });

    it('dispatches the oldest waiting 4 players to Court 1 when open', async () => {
      const players = await Promise.all([
        getOrCreatePlayer('Alpha', 'Intermediate'),
        getOrCreatePlayer('Beta', 'Intermediate'),
        getOrCreatePlayer('Gamma', 'Advanced'),
        getOrCreatePlayer('Delta', 'Beginner'),
      ]);

      for (const p of players) {
        await joinSolo(sessionId, p.id);
      }

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const match = dispatches[0];
      expect(match.playerIds).toHaveLength(4);
      expect(match.selectionReasons).toContain('Waited longest');

      // Court 1 should now be IN PLAY
      const court1 = await db.courts.where('sessionId').equals(sessionId).and((c) => c.courtNumber === 1).first();
      expect(court1?.status).toBe('in_play');
      expect(court1?.activeMatchId).toBe(match.id);

      // Remaining court 2 should still be OPEN
      const court2 = await db.courts.where('sessionId').equals(sessionId).and((c) => c.courtNumber === 2).first();
      expect(court2?.status).toBe('open');

      // Stacks in queue should be marked dispatched
      const waiting = await db.stacks.where('sessionId').equals(sessionId).and((s) => s.status === 'waiting').toArray();
      expect(waiting).toHaveLength(0);
    });

    it('strictly confines selection to top 6-8 candidate window without letting 10th player jump line', async () => {
      // Create 10 players in order
      const playerList = [];
      for (let i = 1; i <= 10; i++) {
        const skill = i === 10 ? 'Advanced' : 'Beginner';
        const p = await getOrCreatePlayer(`Player ${i}`, skill);
        playerList.push(p);
        await joinSolo(sessionId, p.id);
      }

      // Even though Player 10 is Advanced, they are outside the top 8 window
      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const dispatchedPlayerIds = dispatches[0].playerIds;
      expect(dispatchedPlayerIds).not.toContain(playerList[9].id); // Player 10 never jumps ahead
    });

    it('preserves Team Lock pairs intact during dispatch', async () => {
      const p1 = await getOrCreatePlayer('Partner 1', 'Advanced');
      const p2 = await getOrCreatePlayer('Partner 2', 'Advanced');
      await joinPair(sessionId, p1.id, p2.id);

      const p3 = await getOrCreatePlayer('Solo 1', 'Beginner');
      const p4 = await getOrCreatePlayer('Solo 2', 'Beginner');
      await joinSolo(sessionId, p3.id);
      await joinSolo(sessionId, p4.id);

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const match = dispatches[0];
      // Partners 1 and 2 must be on the same team!
      const team1HasBoth = match.team1PlayerIds.includes(p1.id) && match.team1PlayerIds.includes(p2.id);
      const team2HasBoth = match.team2PlayerIds.includes(p1.id) && match.team2PlayerIds.includes(p2.id);
      expect(team1HasBoth || team2HasBoth).toBe(true);
    });
  });

  describe('Skill balancing and partner novelty evaluation', () => {
    it('balances teams evenly across skill levels', () => {
      const pA = { id: '1', name: 'A', skillLevel: 'Advanced' as const, gamesPlayed: 0, createdAt: 0 };
      const pB = { id: '2', name: 'B', skillLevel: 'Advanced' as const, gamesPlayed: 0, createdAt: 0 };
      const pC = { id: '3', name: 'C', skillLevel: 'Beginner' as const, gamesPlayed: 0, createdAt: 0 };
      const pD = { id: '4', name: 'D', skillLevel: 'Beginner' as const, gamesPlayed: 0, createdAt: 0 };

      const result = evaluateCandidateFoursomes([pA, pB, pC, pD], [], []);
      // Rather than Adv+Adv vs Beg+Beg (diff 4), it should balance Adv+Beg vs Adv+Beg (diff 0)
      expect(result.team1.map((p) => p.skillLevel).sort()).toEqual(['Advanced', 'Beginner']);
      expect(result.team2.map((p) => p.skillLevel).sort()).toEqual(['Advanced', 'Beginner']);
      expect(result.reasons).toContain('Skill mix balanced');
    });
  });
});
