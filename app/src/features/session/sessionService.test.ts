import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession, getActiveSession, endSession, getCourtsForSession } from './sessionService';

describe('sessionService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('starts a new session with default parameters and initializes courts', async () => {
    const session = await startSession({});
    expect(session.id).toBeDefined();
    expect(session.status).toBe('active');
    expect(session.courtCount).toBe(4);
    expect(session.rotationMode).toBe('4-In / 4-Out');
    expect(session.pin).toBe('1234');
    expect(session.audioEnabled).toBe(true);

    const courts = await getCourtsForSession(session.id);
    expect(courts).toHaveLength(4);
    expect(courts.map((c) => c.courtNumber)).toEqual([1, 2, 3, 4]);
    expect(courts.every((c) => c.status === 'open')).toBe(true);
  });

  it('respects custom court count, custom PIN, and custom rotation mode', async () => {
    const session = await startSession({
      courtCount: 6,
      pin: '9876',
      rotationMode: 'Winners Stay & Split',
      audioEnabled: false,
    });

    expect(session.courtCount).toBe(6);
    expect(session.pin).toBe('9876');
    expect(session.rotationMode).toBe('Winners Stay & Split');
    expect(session.audioEnabled).toBe(false);

    const courts = await db.courts.where('sessionId').equals(session.id).toArray();
    expect(courts).toHaveLength(6);
  });

  it('clamps or validates court counts to the 1-12 range', async () => {
    await expect(startSession({ courtCount: 0 })).rejects.toThrow('Court count must be between 1 and 12');
    await expect(startSession({ courtCount: 15 })).rejects.toThrow('Court count must be between 1 and 12');
  });

  it('can end an active session', async () => {
    const session = await startSession({});
    await endSession(session.id);

    const active = await getActiveSession();
    expect(active).toBeUndefined();

    const stored = await db.sessions.get(session.id);
    expect(stored?.status).toBe('ended');
    expect(stored?.endedAt).toBeDefined();
  });
});
