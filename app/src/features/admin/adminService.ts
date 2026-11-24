import { db, type GameMode, type SkillLevel, type RecordScoresMode } from '../../db/db';
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

export async function updateCourtGroup(courtId: string, courtGroupId?: string): Promise<void> {
  const normalized = courtGroupId?.trim() || undefined;
  await db.courts.update(courtId, { courtGroupId: normalized });
}

export interface SessionPreset {
  id: string;
  name: string;
  courtCount: number;
  gameMode: GameMode;
  recordScores: RecordScoresMode;
  targetScore: number;
  description?: string;
  isBuiltIn?: boolean;
}

const BUILT_IN_PRESETS: SessionPreset[] = [
  {
    id: 'preset-casual-open-play',
    name: 'Casual Open Play (4 Courts)',
    courtCount: 4,
    gameMode: 'open-play',
    recordScores: 'winners',
    targetScore: 11,
    description: '4 courts, standard open queue, first to 11.',
    isBuiltIn: true,
  },
  {
    id: 'preset-competitive-pools',
    name: 'Competitive Split Pools (6 Courts)',
    courtCount: 6,
    gameMode: 'winner-vs-loser-pools',
    recordScores: 'winners-and-scores',
    targetScore: 15,
    description: '6 courts, winners vs losers pools, first to 15.',
    isBuiltIn: true,
  },
  {
    id: 'preset-club-tournament',
    name: 'Club Tournament (4 Courts)',
    courtCount: 4,
    gameMode: 'winner-takes-all-round-robin',
    recordScores: 'winners-and-scores',
    targetScore: 11,
    description: '4 courts, round robin fixtures, first to 11.',
    isBuiltIn: true,
  },
];

const PRESETS_STORAGE_KEY = 'pickleq_session_presets';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function getSessionPresets(): SessionPreset[] {
  let customPresets: SessionPreset[] = [];
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(PRESETS_STORAGE_KEY);
      if (raw) {
        customPresets = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse custom presets from localStorage:', e);
    }
  }
  return [...BUILT_IN_PRESETS, ...customPresets];
}

export function saveCustomPreset(preset: Omit<SessionPreset, 'id' | 'isBuiltIn'>): SessionPreset {
  const newPreset: SessionPreset = {
    ...preset,
    id: `custom-preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    isBuiltIn: false,
  };

  const storage = getStorage();
  if (storage) {
    try {
      const current = getSessionPresets().filter((p) => !p.isBuiltIn);
      current.push(newPreset);
      storage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save preset to localStorage:', e);
    }
  }
  return newPreset;
}

export function deleteCustomPreset(presetId: string): void {
  const storage = getStorage();
  if (storage) {
    try {
      const current = getSessionPresets().filter((p) => !p.isBuiltIn && p.id !== presetId);
      storage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to delete preset from localStorage:', e);
    }
  }
}

export async function applySessionPreset(sessionId: string, preset: SessionPreset): Promise<void> {
  await updateCourtCount(sessionId, preset.courtCount);
  await db.sessions.update(sessionId, {
    gameMode: preset.gameMode,
    recordScores: preset.recordScores,
    targetScore: preset.targetScore,
  });
}

export interface DispatchAuditRecord {
  matchId: string;
  courtNumber: number;
  timestamp: number;
  playerNames: string[];
  reasons: string[];
  criteria: string[];
  candidatePoolSize: number;
}

export async function getDispatchAuditRecords(sessionId: string): Promise<DispatchAuditRecord[]> {
  const matches = await db.matches
    .where('sessionId')
    .equals(sessionId)
    .and((m) => m.status !== 'abandoned')
    .toArray();

  if (matches.length === 0) return [];

  const courts = await db.courts.where('sessionId').equals(sessionId).toArray();
  const courtMap = new Map(courts.map((c) => [c.id, c.courtNumber]));

  const playerIds = Array.from(new Set(matches.flatMap((m) => m.playerIds)));
  const players = await db.players.where('id').anyOf(playerIds).toArray();
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const records: DispatchAuditRecord[] = matches.map((m) => {
    return {
      matchId: m.id,
      courtNumber: courtMap.get(m.courtId) ?? 1,
      timestamp: m.startedAt,
      playerNames: m.playerIds.map((id) => playerMap.get(id) || 'Unknown'),
      reasons: m.selectionReasons || [],
      criteria: m.auditTrail?.criteria || [],
      candidatePoolSize: m.auditTrail?.candidatePoolSize || m.playerIds.length,
    };
  });

  return records.sort((a, b) => b.timestamp - a.timestamp);
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
