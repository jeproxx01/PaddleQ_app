import { db, Session, RotationMode, Court } from '../../db/db';

export interface StartSessionOptions {
  courtCount?: number;
  rotationMode?: RotationMode;
  pin?: string;
  audioEnabled?: boolean;
}

export async function getActiveSession(): Promise<Session | undefined> {
  return await db.sessions.where('status').equals('active').first();
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
  const rotationMode: RotationMode = options.rotationMode ?? '4-In / 4-Out';
  const audioEnabled = options.audioEnabled ?? true;

  // Finalize any previously active session
  const activeSessions = await db.sessions.where('status').equals('active').toArray();
  for (const prev of activeSessions) {
    await db.sessions.update(prev.id, { status: 'ended', endedAt: Date.now() });
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  const newSession: Session = {
    id: sessionId,
    status: 'active',
    courtCount,
    rotationMode,
    pin,
    audioEnabled,
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

export async function endSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, {
    status: 'ended',
    endedAt: Date.now(),
  });
}
