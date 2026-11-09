import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, PaddleQDatabase } from './db';

describe('PaddleQDatabase', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('initializes tables with UUID primary keys', async () => {
    expect(db.sessions).toBeDefined();
    expect(db.players).toBeDefined();
    expect(db.stacks).toBeDefined();
    expect(db.courts).toBeDefined();
    expect(db.matches).toBeDefined();
  });

  it('can create and retrieve an active Session with valid court count and PIN', async () => {
    const sessionId = crypto.randomUUID();
    await db.sessions.add({
      id: sessionId,
      status: 'active',
      courtCount: 4,
      rotationMode: '4-In / 4-Out',
      pin: '1234',
      audioEnabled: true,
      startedAt: Date.now(),
    });

    const activeSession = await db.sessions.where('status').equals('active').first();
    expect(activeSession).toBeDefined();
    expect(activeSession?.id).toBe(sessionId);
    expect(activeSession?.courtCount).toBe(4);
    expect(activeSession?.rotationMode).toBe('4-In / 4-Out');
    expect(activeSession?.pin).toBe('1234');
    expect(activeSession?.audioEnabled).toBe(true);
  });
});
