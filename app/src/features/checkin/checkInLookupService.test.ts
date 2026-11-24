import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/db';
import { startSession } from '../session/sessionService';
import { getOrCreatePlayer, joinSolo, joinPair } from '../queue/queueService';
import { setCheckInState } from '../lobby/checkInService';
import { lookupPlayerStatus, getAllSessionPlayersForLookup } from './checkInLookupService';

describe('checkInLookupService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('returns not_found when player does not exist', async () => {
    const session = await startSession({});
    const status = await lookupPlayerStatus(session.id, 'Ghost Player');
    expect(status.status).toBe('not_found');
    expect(status.playerName).toBe('Ghost Player');
  });

  it('identifies waiting players with 1-based queue position and estimate', async () => {
    const session = await startSession({ courtCount: 2 });
    const p1 = await getOrCreatePlayer('Alice', 'intermediate');
    const p2 = await getOrCreatePlayer('Bob', 'intermediate');
    const p3 = await getOrCreatePlayer('Charlie', 'intermediate');

    await joinSolo(session.id, p1.id);
    await joinPair(session.id, p2.id, p3.id);

    const bobStatus = await lookupPlayerStatus(session.id, 'Bob');
    expect(bobStatus.status).toBe('waiting');
    expect(bobStatus.queuePosition).toBe(2);
    expect(bobStatus.totalWaitingStacks).toBe(2);
    expect(bobStatus.estimatedWaitMinutes).toBeDefined();

    const aliceStatus = await lookupPlayerStatus(session.id, 'alice'); // Case insensitive lookup
    expect(aliceStatus.status).toBe('waiting');
    expect(aliceStatus.queuePosition).toBe(1);
  });

  it('identifies players currently in play on a court', async () => {
    const session = await startSession({ courtCount: 2 });
    const p1 = await getOrCreatePlayer('Dave', 'advanced');
    const p2 = await getOrCreatePlayer('Eve', 'advanced');
    const p3 = await getOrCreatePlayer('Frank', 'advanced');
    const p4 = await getOrCreatePlayer('Grace', 'advanced');

    const court = await db.courts.where('sessionId').equals(session.id).first();
    const matchId = crypto.randomUUID();

    await db.matches.add({
      id: matchId,
      sessionId: session.id,
      courtId: court!.id,
      gameMode: 'open-play',
      playerIds: [p1.id, p2.id, p3.id, p4.id],
      team1PlayerIds: [p1.id, p2.id],
      team2PlayerIds: [p3.id, p4.id],
      consecutiveWins: 0,
      selectionReasons: [],
      mixedDoubles: false,
      status: 'in_play',
      startedAt: Date.now(),
    });

    await db.courts.update(court!.id, {
      status: 'in_play',
      activeMatchId: matchId,
    });

    const daveStatus = await lookupPlayerStatus(session.id, p1.id);
    expect(daveStatus.status).toBe('in_play');
    expect(daveStatus.courtNumber).toBe(court!.courtNumber);
  });

  it('identifies players resting or not here', async () => {
    const session = await startSession({});
    const p1 = await getOrCreatePlayer('RestingPlayer', 'beginner');
    await setCheckInState(session.id, p1.id, 'resting');

    const status1 = await lookupPlayerStatus(session.id, 'RestingPlayer');
    expect(status1.status).toBe('resting');

    const p2 = await getOrCreatePlayer('AbsentPlayer', 'beginner');
    await setCheckInState(session.id, p2.id, 'not_here');

    const status2 = await lookupPlayerStatus(session.id, 'AbsentPlayer');
    expect(status2.status).toBe('not_here');
  });

  it('retrieves all session players for lookup autocompletion', async () => {
    const session = await startSession({});
    const p1 = await getOrCreatePlayer('Player A', 'beginner');
    const p2 = await getOrCreatePlayer('Player B', 'intermediate');
    await setCheckInState(session.id, p1.id, 'ready');
    await setCheckInState(session.id, p2.id, 'resting');

    const list = await getAllSessionPlayersForLookup(session.id);
    expect(list.length).toBe(2);
    expect(list.map((p) => p.name)).toContain('Player A');
    expect(list.map((p) => p.name)).toContain('Player B');
  });
});
