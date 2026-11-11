import { db, type GameMode, type SkillLevel } from '../../db/db';
import { getOrCreatePlayer } from '../queue/queueService';
import { setCheckInState } from '../lobby/checkInService';

/**
 * PIN-protected organizer controls (ticket #07).
 */

export async function verifyPin(sessionId: string, pin: string): Promise<boolean> {
  const session = await db.sessions.get(sessionId);
  return session?.pin === pin;
}

export async function setPin(sessionId: string, pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  await db.sessions.update(sessionId, { pin });
}

export async function updateCourtCount(sessionId: string, newCount: number): Promise<void> {
  if (newCount < 1 || newCount > 12) {
    throw new Error('Court count must be between 1 and 12');
  }
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const current = session.courtCount;
  if (newCount === current) return;

  if (newCount > current) {
    const now = Date.now();
    const courts = [];
    for (let n = current + 1; n <= newCount; n++) {
      courts.push({
        id: crypto.randomUUID(),
        sessionId,
        courtNumber: n,
        status: 'open' as const,
        updatedAt: now,
      });
    }
    await db.courts.bulkAdd(courts);
  } else {
    const toRemove = await db.courts
      .where('sessionId')
      .equals(sessionId)
      .and((c) => c.courtNumber > newCount)
      .toArray();
    if (toRemove.some((c) => c.status === 'in_play')) {
      throw new Error('Cannot remove courts with active matches');
    }
    await db.courts.bulkDelete(toRemove.map((c) => c.id));
  }

  await db.sessions.update(sessionId, { courtCount: newCount });
}

export async function updateGameMode(sessionId: string, gameMode: GameMode): Promise<void> {
  await db.sessions.update(sessionId, { gameMode });
}

export async function unlockTeamLock(sessionId: string, stackId: string): Promise<void> {
  await db.stacks.update(stackId, { teamLockId: undefined, teamLockPlayerIds: undefined });
}

export async function overrideSkillLevel(playerId: string, skillLevel: SkillLevel): Promise<void> {
  await db.players.update(playerId, { skillLevel });
}

const DEMO_PLAYERS: [string, SkillLevel][] = [
  ['Alex', 'advanced'],
  ['Dana', 'advanced'],
  ['Sam', 'intermediate'],
  ['Priya', 'intermediate'],
  ['Jordan', 'low-intermediate'],
  ['Casey', 'low-intermediate'],
  ['Riley', 'beginner'],
  ['Taylor', 'beginner'],
  ['Morgan', 'high-intermediate'],
  ['Quinn', 'intermediate'],
  ['Avery', 'beginner'],
  ['Jamie', 'advanced'],
];

export async function seedDemoPlayers(sessionId: string): Promise<number> {
  for (const [name, skill] of DEMO_PLAYERS) {
    const player = await getOrCreatePlayer(name, skill);
    await setCheckInState(sessionId, player.id, 'ready');
  }
  return DEMO_PLAYERS.length;
}
