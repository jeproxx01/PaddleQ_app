import { db, type CheckInState, type Player, type SessionPlayer } from '../../db/db';

/**
 * Player check-in state management for the pre-session Lobby (ticket #03).
 *
 * Each player in a session has a check-in state:
 *   - `not_here`: added to the roster, hasn't arrived yet.
 *   - `ready`:    checked in, eligible to play (in the queue).
 *   - `resting`:  present but sitting out — not dispatched.
 */

export interface SessionPlayerWithDetails extends SessionPlayer {
  player: Player;
}

export async function getOrCreateSessionPlayer(
  sessionId: string,
  playerId: string,
  initialState: CheckInState = 'not_here'
): Promise<SessionPlayer> {
  const existing = await db.sessionPlayers
    .where('sessionId')
    .equals(sessionId)
    .and((sp) => sp.playerId === playerId)
    .first();
  if (existing) return existing;

  const sp: SessionPlayer = {
    id: crypto.randomUUID(),
    sessionId,
    playerId,
    checkInState: initialState,
    joinedAt: Date.now(),
  };
  await db.sessionPlayers.add(sp);
  return sp;
}

export async function setCheckInState(
  sessionId: string,
  playerId: string,
  state: CheckInState
): Promise<void> {
  const sp = await getOrCreateSessionPlayer(sessionId, playerId);
  await db.sessionPlayers.update(sp.id, { checkInState: state });
}

/** Mark players as Ready (e.g. when they join the queue). */
export async function ensureReady(sessionId: string, playerIds: string[]): Promise<void> {
  for (const playerId of playerIds) {
    const sp = await getOrCreateSessionPlayer(sessionId, playerId, 'ready');
    if (sp.checkInState !== 'ready') {
      await db.sessionPlayers.update(sp.id, { checkInState: 'ready' });
    }
  }
}

export async function getSessionPlayersWithDetails(
  sessionId: string
): Promise<SessionPlayerWithDetails[]> {
  const sps = await db.sessionPlayers.where('sessionId').equals(sessionId).toArray();
  if (sps.length === 0) return [];

  const playerIds = sps.map((sp) => sp.playerId);
  const players = await db.players.where('id').anyOf(playerIds).toArray();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return sps
    .map((sp) => ({ ...sp, player: playerMap.get(sp.playerId)! }))
    .filter((sp) => sp.player);
}

export async function getRosterCounts(
  sessionId: string
): Promise<Record<CheckInState, number>> {
  const sps = await db.sessionPlayers.where('sessionId').equals(sessionId).toArray();
  const counts: Record<CheckInState, number> = { not_here: 0, ready: 0, resting: 0 };
  for (const sp of sps) {
    counts[sp.checkInState] += 1;
  }
  return counts;
}
