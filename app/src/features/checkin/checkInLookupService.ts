import { db, type QueuePool } from '../../db/db';

export type PlayerQueueState =
  | 'in_play'
  | 'waiting'
  | 'ready_not_queued'
  | 'resting'
  | 'not_here'
  | 'not_found';

export interface PlayerQueueStatus {
  playerId: string;
  playerName: string;
  status: PlayerQueueState;
  courtNumber?: number;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  totalWaitingStacks: number;
  totalCourtsInPlay: number;
  pool?: QueuePool;
}

export async function lookupPlayerStatus(
  sessionId: string,
  identifier: string
): Promise<PlayerQueueStatus> {
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();

  // 1. Locate player by ID or by Name
  let player = await db.players.get(trimmed);
  if (!player) {
    player = await db.players
      .filter((p) => p.name.trim().toLowerCase() === lower)
      .first();
  }

  const waitingStacks = await db.stacks
    .where('sessionId')
    .equals(sessionId)
    .and((s) => s.status === 'waiting')
    .sortBy('queuedAt');

  const courts = await db.courts
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  const courtsInPlay = courts.filter((c) => c.status === 'in_play');

  if (!player) {
    return {
      playerId: '',
      playerName: trimmed,
      status: 'not_found',
      totalWaitingStacks: waitingStacks.length,
      totalCourtsInPlay: courtsInPlay.length,
    };
  }

  // 2. Check if player is currently playing on an active court
  for (const court of courtsInPlay) {
    if (court.activeMatchId) {
      const match = await db.matches.get(court.activeMatchId);
      if (match && match.status === 'in_play' && match.playerIds.includes(player.id)) {
        return {
          playerId: player.id,
          playerName: player.name,
          status: 'in_play',
          courtNumber: court.courtNumber,
          totalWaitingStacks: waitingStacks.length,
          totalCourtsInPlay: courtsInPlay.length,
        };
      }
    }
  }

  // 3. Check if player is queued in a waiting stack
  const stackIndex = waitingStacks.findIndex((s) => s.playerIds.includes(player!.id));
  if (stackIndex !== -1) {
    const queuePos = stackIndex + 1;
    const activeCourtCount = Math.max(1, courts.length);
    // Estimated wait time based on average 12-minute game rotation
    const estimatedWaitMinutes = Math.max(2, Math.round((queuePos / activeCourtCount) * 12));

    return {
      playerId: player.id,
      playerName: player.name,
      status: 'waiting',
      queuePosition: queuePos,
      estimatedWaitMinutes,
      totalWaitingStacks: waitingStacks.length,
      totalCourtsInPlay: courtsInPlay.length,
      pool: waitingStacks[stackIndex].pool,
    };
  }

  // 4. Check session player check-in state
  const sessionPlayer = await db.sessionPlayers
    .where('sessionId')
    .equals(sessionId)
    .and((sp) => sp.playerId === player!.id)
    .first();

  let fallbackStatus: PlayerQueueState = 'ready_not_queued';
  if (sessionPlayer?.checkInState === 'resting') {
    fallbackStatus = 'resting';
  } else if (sessionPlayer?.checkInState === 'not_here') {
    fallbackStatus = 'not_here';
  }

  return {
    playerId: player.id,
    playerName: player.name,
    status: fallbackStatus,
    totalWaitingStacks: waitingStacks.length,
    totalCourtsInPlay: courtsInPlay.length,
  };
}

export async function getAllSessionPlayersForLookup(
  sessionId: string
): Promise<{ id: string; name: string }[]> {
  const sessionPlayers = await db.sessionPlayers
    .where('sessionId')
    .equals(sessionId)
    .toArray();

  if (sessionPlayers.length === 0) return [];

  const playerIds = sessionPlayers.map((sp) => sp.playerId);
  const players = await db.players.where('id').anyOf(playerIds).toArray();

  return players
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
