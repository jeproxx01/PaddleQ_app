import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { getOrCreatePlayer, joinPair } from '../queue/queueService';
import {
  verifyPin,
  setPin,
  updateCourtCount,
  updateGameMode,
  unlockTeamLock,
  overrideSkillLevel,
  updateCourtGroup,
  getSessionPresets,
  saveCustomPreset,
  deleteCustomPreset,
  applySessionPreset,
  getDispatchAuditRecords,
} from './adminService';

let testStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => testStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    testStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete testStorage[key];
  },
  clear: () => {
    testStorage = {};
  },
};

describe('adminService', () => {
  beforeEach(async () => {
    testStorage = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      await updateGameMode(session.id, 'winner-vs-loser-pools');
      const stored = await db.sessions.get(session.id);
      expect(stored?.gameMode).toBe('winner-vs-loser-pools');
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

  describe('Court groups', () => {
    it('labels a court with a group identifier', async () => {
      const session = await startSession({ courtCount: 2 });
      const courts = await db.courts.where('sessionId').equals(session.id).sortBy('courtNumber');
      await updateCourtGroup(courts[0].id, 'Beginner Courts');
      const updated = await db.courts.get(courts[0].id);
      expect(updated?.courtGroupId).toBe('Beginner Courts');

      // Clear the group
      await updateCourtGroup(courts[0].id, undefined);
      const cleared = await db.courts.get(courts[0].id);
      expect(cleared?.courtGroupId).toBeUndefined();
    });
  });

  describe('Session presets', () => {
    it('provides built-in presets', () => {
      const presets = getSessionPresets();
      expect(presets.length).toBeGreaterThanOrEqual(3);
      expect(presets.some((p) => p.name.includes('Casual Open Play'))).toBe(true);
    });

    it('saves, retrieves, and deletes custom presets', () => {
      const custom = saveCustomPreset({
        name: 'My Custom Night',
        courtCount: 5,
        gameMode: 'winner-vs-loser-pools',
        recordScores: 'winners',
        targetScore: 15,
      });

      let presets = getSessionPresets();
      expect(presets.some((p) => p.id === custom.id)).toBe(true);

      deleteCustomPreset(custom.id);
      presets = getSessionPresets();
      expect(presets.some((p) => p.id === custom.id)).toBe(false);
    });

    it('applies a preset to an active session', async () => {
      const session = await startSession({ courtCount: 2, gameMode: 'open-play' });
      const targetPreset = getSessionPresets()[1]; // e.g. 6 courts, winner-vs-loser
      await applySessionPreset(session.id, targetPreset);

      const updatedSession = await db.sessions.get(session.id);
      expect(updatedSession?.gameMode).toBe(targetPreset.gameMode);
      expect(updatedSession?.courtCount).toBe(targetPreset.courtCount);
    });
  });

  describe('Dispatch audit trail', () => {
    it('returns empty list when no matches exist', async () => {
      const session = await startSession({ courtCount: 2 });
      const records = await getDispatchAuditRecords(session.id);
      expect(records).toEqual([]);
    });

    it('retrieves match dispatch records with reasons and player names', async () => {
      const session = await startSession({ courtCount: 2 });
      const p1 = await getOrCreatePlayer('Player One', 'intermediate');
      const p2 = await getOrCreatePlayer('Player Two', 'intermediate');
      const p3 = await getOrCreatePlayer('Player Three', 'intermediate');
      const p4 = await getOrCreatePlayer('Player Four', 'intermediate');

      const courts = await db.courts.where('sessionId').equals(session.id).sortBy('courtNumber');
      const matchId = crypto.randomUUID();

      await db.matches.add({
        id: matchId,
        sessionId: session.id,
        courtId: courts[0].id,
        gameMode: 'open-play',
        playerIds: [p1.id, p2.id, p3.id, p4.id],
        team1PlayerIds: [p1.id, p2.id],
        team2PlayerIds: [p3.id, p4.id],
        consecutiveWins: 0,
        selectionReasons: ['Longest wait time (FIFO)', 'Balanced skill rating'],
        mixedDoubles: false,
        status: 'in_play',
        startedAt: Date.now(),
        auditTrail: {
          timestamp: Date.now(),
          candidatePoolSize: 4,
          criteria: ['fifo', 'skill_balance'],
          evaluated: [
            {
              playerIds: [p1.id, p2.id, p3.id, p4.id],
              fifoScore: 0.95,
              skillImbalance: 0.1,
              noveltyPenalty: 0,
            },
          ],
        },
      });

      const records = await getDispatchAuditRecords(session.id);
      expect(records).toHaveLength(1);
      expect(records[0].courtNumber).toBe(1);
      expect(records[0].playerNames).toContain('Player One');
      expect(records[0].reasons).toContain('Longest wait time (FIFO)');
      expect(records[0].candidatePoolSize).toBe(4);
    });
  });
});
