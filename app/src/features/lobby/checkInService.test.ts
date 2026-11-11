import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import {
  getOrCreateSessionPlayer,
  setCheckInState,
  ensureReady,
  getSessionPlayersWithDetails,
  getRosterCounts,
} from './checkInService';

describe('checkInService', () => {
  const sessionId = 'session-uuid';

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

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

  it('creates a session player with a default not_here state and returns the same record on repeat', async () => {
    const p = mkPlayer('Alice');
    await db.players.add(p);

    const sp = await getOrCreateSessionPlayer(sessionId, p.id);
    expect(sp.checkInState).toBe('not_here');

    const again = await getOrCreateSessionPlayer(sessionId, p.id, 'ready');
    expect(again.id).toBe(sp.id);
    expect(again.checkInState).toBe('not_here'); // preserves existing state
  });

  it('transitions a player between check-in states', async () => {
    const p = mkPlayer('Bob');
    await db.players.add(p);

    await setCheckInState(sessionId, p.id, 'ready');
    let sp = await db.sessionPlayers.where('sessionId').equals(sessionId).first();
    expect(sp?.checkInState).toBe('ready');

    await setCheckInState(sessionId, p.id, 'resting');
    sp = await db.sessionPlayers.where('sessionId').equals(sessionId).first();
    expect(sp?.checkInState).toBe('resting');
  });

  it('marks players ready, upgrading not_here players but not downgrading ready ones', async () => {
    const a = mkPlayer('A');
    const b = mkPlayer('B');
    await db.players.bulkAdd([a, b]);

    await getOrCreateSessionPlayer(sessionId, a.id, 'not_here');
    await getOrCreateSessionPlayer(sessionId, b.id, 'ready');

    await ensureReady(sessionId, [a.id, b.id]);

    const aSp = await db.sessionPlayers.where('playerId').equals(a.id).first();
    const bSp = await db.sessionPlayers.where('playerId').equals(b.id).first();
    expect(aSp?.checkInState).toBe('ready');
    expect(bSp?.checkInState).toBe('ready');
  });

  it('returns roster entries joined with player details', async () => {
    const a = mkPlayer('Alice');
    const b = mkPlayer('Bob');
    await db.players.bulkAdd([a, b]);
    await setCheckInState(sessionId, a.id, 'ready');
    await setCheckInState(sessionId, b.id, 'resting');

    const roster = await getSessionPlayersWithDetails(sessionId);
    expect(roster).toHaveLength(2);
    expect(roster.find((r) => r.playerId === a.id)?.player.name).toBe('Alice');
    expect(roster.find((r) => r.playerId === b.id)?.checkInState).toBe('resting');
  });

  it('counts players per check-in state', async () => {
    const a = mkPlayer('A');
    const b = mkPlayer('B');
    const c = mkPlayer('C');
    await db.players.bulkAdd([a, b, c]);
    await setCheckInState(sessionId, a.id, 'ready');
    await setCheckInState(sessionId, b.id, 'ready');
    await setCheckInState(sessionId, c.id, 'resting');

    const counts = await getRosterCounts(sessionId);
    expect(counts).toEqual({ not_here: 0, ready: 2, resting: 1 });
  });
});
