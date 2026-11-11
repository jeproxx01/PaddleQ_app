import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { getOrCreatePlayer, joinSolo, joinPair } from '../queue/queueService';
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
      const p1 = await getOrCreatePlayer('P1', 'beginner');
      const p2 = await getOrCreatePlayer('P2', 'intermediate');
      await joinPair(sessionId, p1.id, p2.id);

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(0);

      const courts = await db.courts.where('sessionId').equals(sessionId).toArray();
      expect(courts.every((c) => c.status === 'open')).toBe(true);
    });

    it('dispatches the oldest waiting 4 players to Court 1 when open', async () => {
      const players = await Promise.all([
        getOrCreatePlayer('Alpha', 'intermediate'),
        getOrCreatePlayer('Beta', 'intermediate'),
        getOrCreatePlayer('Gamma', 'advanced'),
        getOrCreatePlayer('Delta', 'beginner'),
      ]);

      for (const p of players) {
        await joinSolo(sessionId, p.id);
      }

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const match = dispatches[0];
      expect(match.playerIds).toHaveLength(4);
      expect(match.selectionReasons).toContain('Waited longest');
      expect(match.gameMode).toBe('open-play');
      expect(match.status).toBe('in_play');

      // Court 1 should now be IN PLAY
      const court1 = await db.courts
        .where('sessionId')
        .equals(sessionId)
        .and((c) => c.courtNumber === 1)
        .first();
      expect(court1?.status).toBe('in_play');
      expect(court1?.activeMatchId).toBe(match.id);

      // Remaining court 2 should still be OPEN
      const court2 = await db.courts
        .where('sessionId')
        .equals(sessionId)
        .and((c) => c.courtNumber === 2)
        .first();
      expect(court2?.status).toBe('open');

      // Stacks in queue should be marked dispatched
      const waiting = await db.stacks
        .where('sessionId')
        .equals(sessionId)
        .and((s) => s.status === 'waiting')
        .toArray();
      expect(waiting).toHaveLength(0);
    });

    it('strictly confines selection to the first-14 candidate window without letting the 16th player jump line', async () => {
      // Create 16 players in order
      const playerList = [];
      for (let i = 1; i <= 16; i++) {
        const skill = i === 16 ? 'advanced' : 'beginner';
        const p = await getOrCreatePlayer(`Player ${i}`, skill);
        playerList.push(p);
        await joinSolo(sessionId, p.id);
      }

      // Even though Player 16 is Advanced, they are outside the first-14 window
      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const dispatchedPlayerIds = dispatches[0].playerIds;
      expect(dispatchedPlayerIds).not.toContain(playerList[15].id); // Player 16 never jumps ahead
    });

    it('preserves Team Lock pairs intact during dispatch', async () => {
      const p1 = await getOrCreatePlayer('Partner 1', 'advanced');
      const p2 = await getOrCreatePlayer('Partner 2', 'advanced');
      await joinPair(sessionId, p1.id, p2.id);

      const p3 = await getOrCreatePlayer('Solo 1', 'beginner');
      const p4 = await getOrCreatePlayer('Solo 2', 'beginner');
      await joinSolo(sessionId, p3.id);
      await joinSolo(sessionId, p4.id);

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const match = dispatches[0];
      // Partners 1 and 2 must be on the same team!
      const team1HasBoth =
        match.team1PlayerIds.includes(p1.id) && match.team1PlayerIds.includes(p2.id);
      const team2HasBoth =
        match.team2PlayerIds.includes(p1.id) && match.team2PlayerIds.includes(p2.id);
      expect(team1HasBoth || team2HasBoth).toBe(true);
    });
  });

  describe('Dispatch audit trail', () => {
    it('logs a full audit trail for every dispatch decision', async () => {
      const players = await Promise.all([
        getOrCreatePlayer('Alpha', 'intermediate'),
        getOrCreatePlayer('Beta', 'intermediate'),
        getOrCreatePlayer('Gamma', 'advanced'),
        getOrCreatePlayer('Delta', 'beginner'),
        getOrCreatePlayer('Echo', 'beginner'),
        getOrCreatePlayer('Foxtrot', 'beginner'),
      ]);
      for (const p of players) await joinSolo(sessionId, p.id);

      const dispatches = await runAutoDispatch(sessionId);
      expect(dispatches).toHaveLength(1);

      const audit = dispatches[0].auditTrail;
      expect(audit).toBeDefined();
      expect(audit!.timestamp).toBeGreaterThan(0);
      expect(audit!.candidatePoolSize).toBe(6);
      expect(audit!.criteria).toContain('Waited longest');
      expect(audit!.evaluated.length).toBeGreaterThan(0);
      expect(audit!.evaluated.every((e) => e.playerIds.length === 4)).toBe(true);
    });
  });

  describe('Skill balancing and partner/opponent novelty evaluation', () => {
    const makePlayer = (id: string, skillLevel: 'advanced' | 'beginner' | 'intermediate') => ({
      id,
      name: id,
      skillLevel,
      gender: 'any' as const,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      createdAt: 0,
    });

    it('balances teams evenly across five skill tiers', () => {
      const pA = makePlayer('a', 'advanced');
      const pB = makePlayer('b', 'advanced');
      const pC = makePlayer('c', 'beginner');
      const pD = makePlayer('d', 'beginner');

      const result = evaluateCandidateFoursomes([pA, pB, pC, pD], [], []);
      // Rather than Adv+Adv vs Beg+Beg (diff 4), it should balance Adv+Beg vs Adv+Beg (diff 0)
      expect(result.team1.map((p) => p.skillLevel).sort()).toEqual(['advanced', 'beginner']);
      expect(result.team2.map((p) => p.skillLevel).sort()).toEqual(['advanced', 'beginner']);
      expect(result.reasons).toContain('Skill mix balanced');
    });

    it('emits partner and opponent novelty reasons when no recent repeats exist', () => {
      const players = [makePlayer('a', 'beginner'), makePlayer('b', 'beginner'), makePlayer('c', 'beginner'), makePlayer('d', 'beginner')];

      const result = evaluateCandidateFoursomes(players, [], []);
      expect(result.reasons).toContain('New partners');
      expect(result.reasons).toContain('No repeat opponents');
    });

    it('suppresses novelty reasons when all four players recently faced each other', () => {
      const players = [makePlayer('a', 'beginner'), makePlayer('b', 'beginner'), makePlayer('c', 'beginner'), makePlayer('d', 'beginner')];

      // A recent match had A+B vs C+D, so every partner and opponent pair repeats.
      const recent = [{ team1PlayerIds: ['a', 'b'], team2PlayerIds: ['c', 'd'] }];
      const result = evaluateCandidateFoursomes(players, recent, []);

      expect(result.reasons).toContain('Skill mix balanced');
      expect(result.reasons).not.toContain('New partners');
      expect(result.reasons).not.toContain('No repeat opponents');
    });
  });
});
