import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';

describe('PaddleQDatabase', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('initializes tables with UUID primary keys', async () => {
    expect(db.sessions).toBeDefined();
    expect(db.players).toBeDefined();
    expect(db.sessionPlayers).toBeDefined();
    expect(db.stacks).toBeDefined();
    expect(db.courts).toBeDefined();
    expect(db.matches).toBeDefined();
    expect(db.deviceLinks).toBeDefined();
  });

  it('can create and retrieve an active Session with valid court count and PIN', async () => {
    const sessionId = crypto.randomUUID();
    await db.sessions.add({
      id: sessionId,
      name: 'Open Play Session',
      status: 'lobby',
      courtCount: 4,
      gameMode: 'open-play',
      recordScores: 'winners-and-scores',
      targetScore: 11,
      pin: '1234',
      audioEnabled: true,
      autoFill: false,
      skillMixing: 'auto-balance',
      startedAt: Date.now(),
    });

    const current = await db.sessions.where('status').anyOf(['lobby', 'live']).first();
    expect(current).toBeDefined();
    expect(current?.id).toBe(sessionId);
    expect(current?.courtCount).toBe(4);
    expect(current?.gameMode).toBe('open-play');
    expect(current?.pin).toBe('1234');
    expect(current?.audioEnabled).toBe(true);
  });
});
