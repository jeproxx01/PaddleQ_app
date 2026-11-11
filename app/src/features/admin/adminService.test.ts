import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { getOrCreatePlayer, joinSolo, joinPair } from '../queue/queueService';
import {
  verifyPin,
  setPin,
  updateCourtCount,
  updateGameMode,
  unlockTeamLock,
  overrideSkillLevel,
} from './adminService';

describe('adminService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('PIN', () => {
    it('verifies the session PIN', async () => {
      const session = await startSession({});
      expect(await verifyPin(session.id, '1234')).toBe(true);
      expect(await verifyPin(session.id, '9999')).toBe(false);
    });

    it('updates the PIN and validates its format', async () => {
      const session = await startSession({});
      await setPin(session.id, '5678');
      expect(await verifyPin(session.id, '5678')).toBe(true);

      await expect(setPin(session.id, '12')).rejects.toThrow('PIN must be exactly 4 digits');
      await expect(setPin(session.id, 'abcd')).rejects.toThrow('PIN must be exactly 4 digits');
    });
  });

  describe('Court count', () => {
    it('increases and decreases the court count', async () => {
      const session = await startSession({ courtCount: 4 });
      expect(await db.courts.where('sessionId').equals(session.id).count()).toBe(4);

      await updateCourtCount(session.id, 6);
      expect(await db.courts.where('sessionId').equals(session.id).count()).toBe(6);

      await updateCourtCount(session.id, 3);
      expect(await db.courts.where('sessionId').equals(session.id).count()).toBe(3);

      const stored = await db.sessions.get(session.id);
      expect(stored?.courtCount).toBe(3);
    });

    it('rejects invalid court counts', async () => {
      const session = await startSession({ courtCount: 2 });
      await expect(updateCourtCount(session.id, 0)).rejects.toThrow(
        'Court count must be between 1 and 12'
      );
      await expect(updateCourtCount(session.id, 15)).rejects.toThrow(
        'Court count must be between 1 and 12'
      );
    });

    it('refuses to remove a court with an active match', async () => {
      const session = await startSession({ courtCount: 2 });
      const court2 = await db.courts
        .where('sessionId')
        .equals(session.id)
        .and((c) => c.courtNumber === 2)
        .first();
      await db.courts.update(court2!.id, { status: 'in_play' });

      await expect(updateCourtCount(session.id, 1)).rejects.toThrow(
        'Cannot remove courts with active matches'
      );
    });
  });

  describe('Game mode', () => {
    it('switches the session game mode', async () => {
      const session = await startSession({ gameMode: 'open-play' });
      await updateGameMode(session.id, 'challenge-court');
      const stored = await db.sessions.get(session.id);
      expect(stored?.gameMode).toBe('challenge-court');
    });
  });

  describe('Team Lock', () => {
    it('unlocks a team lock', async () => {
      const session = await startSession({ courtCount: 1 });
      const p1 = await getOrCreatePlayer('P1', 'intermediate');
      const p2 = await getOrCreatePlayer('P2', 'advanced');
      const pairStack = await joinPair(session.id, p1.id, p2.id);

      await unlockTeamLock(session.id, pairStack.id);
      const stack = await db.stacks.get(pairStack.id);
      expect(stack?.teamLockId).toBeUndefined();
      expect(stack?.teamLockPlayerIds).toBeUndefined();
    });
  });

  describe('Skill override', () => {
    it('overrides a player skill level', async () => {
      const p = await getOrCreatePlayer('Sandbagger', 'beginner');
      await overrideSkillLevel(p.id, 'advanced');
      expect((await db.players.get(p.id))?.skillLevel).toBe('advanced');
    });
  });
});
