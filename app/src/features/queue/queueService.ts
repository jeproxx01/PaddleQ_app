import { db, Player, Stack, SkillLevel, Gender } from '../../db/db';

export interface StackWithPlayers extends Stack {
  players: Player[];
}

export async function getOrCreatePlayer(
  name: string,
  skillLevel: SkillLevel,
  gender: Gender = 'any'
): Promise<Player> {
  const trimmedName = name.trim();
  const existing = await db.players
    .filter((p) => p.name.toLowerCase() === trimmedName.toLowerCase())
    .first();

  if (existing) {
    return existing;
  }

  const newPlayer: Player = {
    id: crypto.randomUUID(),
    name: trimmedName,
    skillLevel,
    gender,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    createdAt: Date.now(),
  };

  await db.players.add(newPlayer);
  return newPlayer;
}

export async function searchPlayers(prefix: string): Promise<Player[]> {
  const clean = prefix.trim().toLowerCase();
  if (!clean) return [];

  const allPlayers = await db.players.toArray();
  return allPlayers
    .filter((p) => p.name.toLowerCase().startsWith(clean))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5);
}

export async function joinSolo(sessionId: string, playerId: string): Promise<Stack> {
  const waitingStacks = (
    await db.stacks
      .where('sessionId')
      .equals(sessionId)
      .and((s) => s.status === 'waiting' && s.playerIds.length < 4)
      .toArray()
  ).sort((a, b) => a.queuedAt - b.queuedAt);

  if (waitingStacks.length > 0) {
    const targetStack = waitingStacks[0];
    const updatedPlayerIds = [...targetStack.playerIds, playerId];
    await db.stacks.update(targetStack.id, {
      playerIds: updatedPlayerIds,
    });
    return {
      ...targetStack,
      playerIds: updatedPlayerIds,
    };
  }

  const newStack: Stack = {
    id: crypto.randomUUID(),
    sessionId,
    entryType: 'solo',
    playerIds: [playerId],
    queuedAt: Date.now(),
    status: 'waiting',
  };

  await db.stacks.add(newStack);
  return newStack;
}

export async function joinPair(
  sessionId: string,
  player1Id: string,
  player2Id: string
): Promise<Stack> {
  const teamLockId = crypto.randomUUID();

  const waitingWithRoom = (
    await db.stacks
      .where('sessionId')
      .equals(sessionId)
      .and((s) => s.status === 'waiting' && s.playerIds.length === 2 && !s.teamLockId)
      .toArray()
  ).sort((a, b) => a.queuedAt - b.queuedAt);

  if (waitingWithRoom.length > 0) {
    const targetStack = waitingWithRoom[0];
    const updatedPlayerIds = [...targetStack.playerIds, player1Id, player2Id];
    await db.stacks.update(targetStack.id, {
      playerIds: updatedPlayerIds,
      teamLockId,
      teamLockPlayerIds: [player1Id, player2Id],
    });
    return {
      ...targetStack,
      playerIds: updatedPlayerIds,
      teamLockId,
      teamLockPlayerIds: [player1Id, player2Id],
    };
  }

  const newStack: Stack = {
    id: crypto.randomUUID(),
    sessionId,
    entryType: 'pair',
    playerIds: [player1Id, player2Id],
    teamLockId,
    teamLockPlayerIds: [player1Id, player2Id],
    queuedAt: Date.now(),
    status: 'waiting',
  };

  await db.stacks.add(newStack);
  return newStack;
}

export async function joinFoursome(
  sessionId: string,
  playerIds: [string, string, string, string]
): Promise<Stack> {
  const newStack: Stack = {
    id: crypto.randomUUID(),
    sessionId,
    entryType: 'foursome',
    playerIds: [...playerIds],
    queuedAt: Date.now(),
    status: 'waiting',
  };

  await db.stacks.add(newStack);
  return newStack;
}

export async function getWaitingStacksWithPlayers(sessionId: string): Promise<StackWithPlayers[]> {
  const stacks = (
    await db.stacks
      .where('sessionId')
      .equals(sessionId)
      .and((s) => s.status === 'waiting')
      .toArray()
  ).sort((a, b) => a.queuedAt - b.queuedAt);

  const allPlayerIds = Array.from(new Set(stacks.flatMap((s) => s.playerIds)));
  if (allPlayerIds.length === 0) return [];

  const players = await db.players.where('id').anyOf(allPlayerIds).toArray();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return stacks.map((stack) => ({
    ...stack,
    players: stack.playerIds.map((id) => playerMap.get(id)!).filter(Boolean),
  }));
}

export function computeQueueReadiness(totalWaitingPlayers: number): string {
  if (totalWaitingPlayers === 0) {
    return 'No players waiting';
  }

  const completeGames = Math.floor(totalWaitingPlayers / 4);
  const remainder = totalWaitingPlayers % 4;

  if (completeGames === 0) {
    return `${remainder} waiting — need ${4 - remainder} more for next game`;
  }

  const gameText = completeGames === 1 ? '1 game' : `${completeGames} games`;

  if (remainder === 0) {
    return `${totalWaitingPlayers} ready — enough for ${gameText}`;
  }

  return `${totalWaitingPlayers} ready — enough for ${gameText}, ${remainder} waiting`;
}

export async function isPlayerQueued(sessionId: string, playerId: string): Promise<boolean> {
  const stack = await db.stacks
    .where('sessionId')
    .equals(sessionId)
    .and((s) => s.status === 'waiting' && s.playerIds.includes(playerId))
    .first();
  return Boolean(stack);
}

export async function removePlayerFromQueue(sessionId: string, playerId: string): Promise<void> {
  const stack = await db.stacks
    .where('sessionId')
    .equals(sessionId)
    .and((s) => s.status === 'waiting' && s.playerIds.includes(playerId))
    .first();
  if (!stack) return;

  const remaining = stack.playerIds.filter((id) => id !== playerId);
  if (remaining.length === 0) {
    await db.stacks.delete(stack.id);
    return;
  }

  const update: Partial<Stack> = { playerIds: remaining };
  if (stack.teamLockPlayerIds?.includes(playerId)) {
    update.teamLockId = undefined;
    update.teamLockPlayerIds = undefined;
  }
  await db.stacks.update(stack.id, update);
}

export async function disbandStack(sessionId: string, stackId: string): Promise<void> {
  await db.stacks.update(stackId, { status: 'cancelled' });
}
