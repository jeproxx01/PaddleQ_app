import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import {
  startSession,
  getCurrentSession,
  transitionToLive,
  endSession,
  getCourtsForSession,
} from './sessionService';

describe('sessionService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('starts a new session with default parameters and initializes courts', async () => {
    const session = await startSession({});
    expect(session.id).toBeDefined();
    expect(session.status).toBe('lobby');
    expect(session.courtCount).toBe(4);
    expect(session.gameMode).toBe('open-play');
    expect(session.pin).toBe('1234');
    expect(session.audioEnabled).toBe(true);

    const courts = await getCourtsForSession(session.id);
    expect(courts).toHaveLength(4);
    expect(courts.map((c) => c.courtNumber)).toEqual([1, 2, 3, 4]);
    expect(courts.every((c) => c.status === 'open')).toBe(true);
  });

  it('respects custom court count, custom PIN, and custom game mode', async () => {
    const session = await startSession({
      courtCount: 6,
      pin: '9876',
      gameMode: 'winner-takes-all-round-robin',
      audioEnabled: false,
    });

    expect(session.courtCount).toBe(6);
    expect(session.pin).toBe('9876');
    expect(session.gameMode).toBe('winner-takes-all-round-robin');
    expect(session.audioEnabled).toBe(false);

    const courts = await db.courts.where('sessionId').equals(session.id).toArray();
    expect(courts).toHaveLength(6);
  });

  it('clamps or validates court counts to the 1-12 range', async () => {
    await expect(startSession({ courtCount: 0 })).rejects.toThrow(
      'Court count must be between 1 and 12'
    );
    await expect(startSession({ courtCount: 15 })).rejects.toThrow(
      'Court count must be between 1 and 12'
    );
  });

  it('transitions a lobby session to live', async () => {
    const session = await startSession({});
    expect(session.status).toBe('lobby');

    await transitionToLive(session.id);
    const live = await db.sessions.get(session.id);
    expect(live?.status).toBe('live');

    const current = await getCurrentSession();
    expect(current?.id).toBe(session.id);
  });

  it('can end an active session', async () => {
    const session = await startSession({});
    await transitionToLive(session.id);
    await endSession(session.id);

    const current = await getCurrentSession();
    expect(current).toBeUndefined();

    const stored = await db.sessions.get(session.id);
    expect(stored?.status).toBe('ended');
    expect(stored?.endedAt).toBeDefined();
  });
});
