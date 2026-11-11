import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { recordScore, abandonMatch, correctScore, undoLastScore } from './scoringService';

function mkPlayer(name: string) {
  return {
    id: crypto.randomUUID(),
    name,
    skillLevel: 'intermediate' as const,
    gender: 'any' as const,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    createdAt: Date.now(),
  };
}

async function seedInPlayMatch(
  gameMode: 'open-play' | 'winners-stay-split',
  consecutiveWins = 0
) {
  const session = await startSession({ courtCount: 1, gameMode });
  const players = [mkPlayer('Winner 1'), mkPlayer('Winner 2'), mkPlayer('Loser 1'), mkPlayer('Loser 2')];
  await db.players.bulkAdd(players);

  const courtId = crypto.randomUUID();
  await db.courts.add({
    id: courtId,
    sessionId: session.id,
    courtNumber: 1,
    status: 'open',
    updatedAt: Date.now(),
  });

  const matchId = crypto.randomUUID();
  await db.matches.add({
    id: matchId,
    sessionId: session.id,
    courtId,
    gameMode,
    playerIds: players.map((p) => p.id),
    team1PlayerIds: [players[0].id, players[1].id],
    team2PlayerIds: [players[2].id, players[3].id],
    consecutiveWins,
    selectionReasons: ['Waited longest'],
    mixedDoubles: false,
    status: 'in_play',
    startedAt: Date.now(),
  });
  await db.courts.update(courtId, { status: 'in_play', activeMatchId: matchId });

  return { session, players, courtId, matchId };
}

describe('scoringService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('recordScore', () => {
    it('records a score, updates win/loss, and rotates all four off in Open Play', async () => {
      const { session, players, courtId, matchId } = await seedInPlayMatch('open-play');

      const result = await recordScore(session.id, matchId, 11, 8, 1);

      expect(result.winnersStay).toBe(false);
      expect(result.capped).toBe(false);
      expect(result.rotatingPlayerIds).toHaveLength(4);
      expect(result.stayingPlayerIds).toHaveLength(0);

      const match = await db.matches.get(matchId);
      expect(match?.status).toBe('completed');
      expect(match?.score1).toBe(11);
      expect(match?.score2).toBe(8);
      expect(match?.winningTeam).toBe(1);
      expect(match?.completedAt).toBeDefined();

      const court = await db.courts.get(courtId);
      expect(court?.status).toBe('open');
      expect(court?.activeMatchId).toBeUndefined();

      const winners = await db.players.bulkGet([players[0].id, players[1].id]);
      const losers = await db.players.bulkGet([players[2].id, players[3].id]);
      expect(winners.every((p) => p?.wins === 1)).toBe(true);
      expect(losers.every((p) => p?.losses === 1)).toBe(true);
    });

    it('keeps the winning pair on court (uncapped) in Winners Stay & Split', async () => {
      const { session, players, matchId } = await seedInPlayMatch('winners-stay-split');

      const result = await recordScore(session.id, matchId, 11, 7, 1);

      expect(result.winnersStay).toBe(true);
      expect(result.capped).toBe(false);
      expect(result.stayingPlayerIds).toEqual([players[0].id, players[1].id]);
      expect(result.rotatingPlayerIds).toEqual([players[2].id, players[3].id]);

      const match = await db.matches.get(matchId);
      expect(match?.consecutiveWins).toBe(1);
    });

    it('forces capped winners off after reaching the Max Win Limit', async () => {
      const { session, players, matchId } = await seedInPlayMatch('winners-stay-split', 1);

      const result = await recordScore(session.id, matchId, 11, 9, 1);

      expect(result.capped).toBe(true);
      expect(result.winnersStay).toBe(false);
      expect(result.rotatingPlayerIds).toHaveLength(4);
      expect(result.stayingPlayerIds).toHaveLength(0);

      const match = await db.matches.get(matchId);
      expect(match?.consecutiveWins).toBe(2);
    });

    it('rejects scoring a match that is not in play', async () => {
      const { session, matchId } = await seedInPlayMatch('open-play');
      await recordScore(session.id, matchId, 11, 8, 1);

      await expect(recordScore(session.id, matchId, 11, 8, 1)).rejects.toThrow(
        'Match is not in play'
      );
    });
  });

  describe('abandonMatch', () => {
    it('abandons a match without recording any win/loss', async () => {
      const { session, players, courtId, matchId } = await seedInPlayMatch('open-play');

      await abandonMatch(session.id, matchId);

      const match = await db.matches.get(matchId);
      expect(match?.status).toBe('abandoned');

      const court = await db.courts.get(courtId);
      expect(court?.status).toBe('open');

      const all = await db.players.bulkGet(players.map((p) => p.id));
      expect(all.every((p) => p?.wins === 0 && p?.losses === 0)).toBe(true);
    });
  });

  describe('correctScore', () => {
    it('reverses the old win/loss and applies the corrected result', async () => {
      const { session, players, matchId } = await seedInPlayMatch('open-play');
      await recordScore(session.id, matchId, 11, 8, 1);

      await correctScore(matchId, 9, 11, 2);

      const match = await db.matches.get(matchId);
      expect(match?.score1).toBe(9);
      expect(match?.score2).toBe(11);
      expect(match?.winningTeam).toBe(2);

      // Team 1's win is reversed into a loss; team 2's loss is reversed into a win.
      const team1 = await db.players.bulkGet([players[0].id, players[1].id]);
      const team2 = await db.players.bulkGet([players[2].id, players[3].id]);
      expect(team1.every((p) => p?.wins === 0 && p?.losses === 1)).toBe(true);
      expect(team2.every((p) => p?.wins === 1 && p?.losses === 0)).toBe(true);
    });
  });

  describe('undoLastScore', () => {
    it('reverts the most recent completed match and its win/loss', async () => {
      const { session, players, courtId, matchId } = await seedInPlayMatch('open-play');
      await recordScore(session.id, matchId, 11, 8, 1);

      const undone = await undoLastScore(session.id);
      expect(undone).toBe(matchId);

      const match = await db.matches.get(matchId);
      expect(match?.status).toBe('in_play');
      expect(match?.winningTeam).toBeUndefined();

      const court = await db.courts.get(courtId);
      expect(court?.status).toBe('in_play');
      expect(court?.activeMatchId).toBe(matchId);

      const all = await db.players.bulkGet(players.map((p) => p.id));
      expect(all.every((p) => p?.wins === 0 && p?.losses === 0)).toBe(true);
    });
  });
});
