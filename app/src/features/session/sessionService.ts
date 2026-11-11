import { db, type Session, type Court, type GameMode, type RecordScoresMode, type SkillMixing } from '../../db/db';

export interface StartSessionOptions {
  courtCount?: number;
  gameMode?: GameMode;
  name?: string;
  recordScores?: RecordScoresMode;
  targetScore?: number;
  timeLimitMinutes?: number;
  pin?: string;
  audioEnabled?: boolean;
}

export async function getCurrentSession(): Promise<Session | undefined> {
  const sessions = await db.sessions.where('status').anyOf(['lobby', 'live']).toArray();
  if (sessions.length === 0) return undefined;
  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return sessions[0];
}

export async function getCourtsForSession(sessionId: string): Promise<Court[]> {
  const courts = await db.courts.where('sessionId').equals(sessionId).toArray();
  return courts.sort((a, b) => a.courtNumber - b.courtNumber);
}

export async function startSession(options: StartSessionOptions = {}): Promise<Session> {
  const courtCount = options.courtCount ?? 4;
  if (courtCount < 1 || courtCount > 12) {
    throw new Error('Court count must be between 1 and 12');
  }

  const pin = options.pin && options.pin.trim().length === 4 ? options.pin.trim() : '1234';
  const gameMode: GameMode = options.gameMode ?? 'open-play';
  const name = options.name?.trim() || 'Open Play Session';
  const recordScores: RecordScoresMode = options.recordScores ?? 'winners-and-scores';
  const targetScore = options.targetScore ?? 11;
  const audioEnabled = options.audioEnabled ?? true;
  const autoFill = false;
  const skillMixing: SkillMixing = 'auto-balance';
  const timeLimitMinutes =
    gameMode === 'time-based' ? (options.timeLimitMinutes ?? 15) : undefined;

  // Finalize any previously active session
  const activeSessions = await db.sessions
    .where('status')
    .anyOf(['lobby', 'live'])
    .toArray();
  for (const prev of activeSessions) {
    await db.sessions.update(prev.id, { status: 'ended', endedAt: Date.now() });
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  const newSession: Session = {
    id: sessionId,
    name,
    status: 'lobby',
    courtCount,
    gameMode,
    recordScores,
    targetScore,
    timeLimitMinutes,
    pin,
    audioEnabled,
    autoFill,
    skillMixing,
    startedAt: now,
  };

  await db.sessions.add(newSession);

  // Initialize courts for this session
  const courtsToCreate: Court[] = [];
  for (let i = 1; i <= courtCount; i++) {
    courtsToCreate.push({
      id: crypto.randomUUID(),
      sessionId,
      courtNumber: i,
      status: 'open',
      updatedAt: now,
    });
  }
  await db.courts.bulkAdd(courtsToCreate);

  return newSession;
}

export async function transitionToLive(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { status: 'live' });
}

export async function endSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, {
    status: 'ended',
    endedAt: Date.now(),
  });
}
