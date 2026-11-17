import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { getOrCreatePlayer, joinSolo, joinPair } from '../queue/queueService';
import { runAutoDispatch, evaluateCandidateFoursomes, dispatchStack } from './dispatchEngine';

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

  describe('Manual dispatch', () => {
    it('dispatches a specific complete stack on demand', async () => {
      const players = await Promise.all([
        getOrCreatePlayer('A', 'beginner'),
        getOrCreatePlayer('B', 'beginner'),
        getOrCreatePlayer('C', 'beginner'),
        getOrCreatePlayer('D', 'beginner'),
      ]);
      let stackId: string | undefined;
      for (const p of players) {
        const s = await joinSolo(sessionId, p.id);
        stackId = s.id; // solos merge into one 4/4 stack
      }

      const fullStack = await db.stacks.get(stackId!);
      expect(fullStack?.playerIds).toHaveLength(4);

      const match = await dispatchStack(sessionId, stackId!);
      expect(match).not.toBeNull();
      expect(match!.playerIds).toHaveLength(4);
      expect(match!.status).toBe('in_play');

      const court1 = await db.courts
        .where('sessionId')
        .equals(sessionId)
        .and((c) => c.courtNumber === 1)
        .first();
      expect(court1?.status).toBe('in_play');
      expect(court1?.activeMatchId).toBe(match!.id);

      const stack = await db.stacks.get(stackId!);
      expect(stack?.status).toBe('dispatched');
    });

    it('returns null for an incomplete stack', async () => {
      const p1 = await getOrCreatePlayer('Solo A', 'beginner');
      const p2 = await getOrCreatePlayer('Solo B', 'beginner');
      await joinSolo(sessionId, p1.id);
      const stack = await joinSolo(sessionId, p2.id);

      const match = await dispatchStack(sessionId, stack.id);
      expect(match).toBeNull();
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

  describe('New Game Mode Dispatches', () => {
    it('dispatches Winner vs Winner from the Winners Pool in winner-vs-loser-pools mode', async () => {
      const session = await startSession({ courtCount: 1, gameMode: 'winner-vs-loser-pools' });
      const [w1, w2, w3, w4] = await Promise.all([
        getOrCreatePlayer('W1', 'intermediate'),
        getOrCreatePlayer('W2', 'intermediate'),
        getOrCreatePlayer('W3', 'intermediate'),
        getOrCreatePlayer('W4', 'intermediate'),
      ]);

      const now = Date.now();
      // Add two winner stacks
      await db.stacks.bulkAdd([
        {
          id: 'stack-w1',
          sessionId: session.id,
          entryType: 'pair',
          playerIds: [w1.id, w2.id],
          pool: 'winners',
          queuedAt: now,
          status: 'waiting',
        },
        {
          id: 'stack-w2',
          sessionId: session.id,
          entryType: 'pair',
          playerIds: [w3.id, w4.id],
          pool: 'winners',
          queuedAt: now + 1,
          status: 'waiting',
        },
      ]);

      const dispatches = await runAutoDispatch(session.id);
      expect(dispatches).toHaveLength(1);
      expect(dispatches[0].team1PlayerIds).toEqual([w1.id, w2.id]);
      expect(dispatches[0].team2PlayerIds).toEqual([w3.id, w4.id]);
      expect(dispatches[0].selectionReasons).toContain('Winners Pool Match');
    });

    it('dispatches scheduled round robin fixtures in winner-takes-all-round-robin mode', async () => {
      const session = await startSession({ courtCount: 1, gameMode: 'winner-takes-all-round-robin' });
      const [p1, p2, p3, p4] = await Promise.all([
        getOrCreatePlayer('T1A', 'intermediate'),
        getOrCreatePlayer('T1B', 'intermediate'),
        getOrCreatePlayer('T2A', 'intermediate'),
        getOrCreatePlayer('T2B', 'intermediate'),
      ]);

      await db.tournamentTeams.bulkAdd([
        { id: 'team-1', sessionId: session.id, name: 'Team 1', playerIds: [p1.id, p2.id], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 'team-2', sessionId: session.id, name: 'Team 2', playerIds: [p3.id, p4.id], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ]);

      await db.tournamentFixtures.add({
        id: 'fix-1',
        sessionId: session.id,
        round: 1,
        team1Id: 'team-1',
        team2Id: 'team-2',
        status: 'scheduled',
      });

      const dispatches = await runAutoDispatch(session.id);
      expect(dispatches).toHaveLength(1);
      expect(dispatches[0].team1PlayerIds).toEqual([p1.id, p2.id]);
      expect(dispatches[0].team2PlayerIds).toEqual([p3.id, p4.id]);

      const fixture = await db.tournamentFixtures.get('fix-1');
      expect(fixture?.status).toBe('in_play');
    });
  });
});
