import { db } from '../../db/db';
import type { Match, Player, SkillLevel, Stack } from '../../db/db';

/**
 * QMaster Composite Dispatch Engine.
 *
 * Assigns the next eligible Stack to an Open court using a composite ranking:
 *   1. Waited Longest (strict FIFO backbone — players outside the sliding window
 *      of the oldest 6-8 waiting players can never jump ahead),
 *   2. Skill Mix balance (minimizing the tier gap between opposing teams),
 *   3. New Partners (penalizing players who shared a court in the last 2 matches).
 *
 * Team Lock pairs are treated as atomic units: a locked pair is either dispatched
 * together on the same team or not dispatched at all.
 */

const SKILL_WEIGHT: Record<SkillLevel, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

const MIN_PLAYERS_PER_COURT = 4;
const WINDOW_SIZE = 8;
const RECENT_MATCH_COUNT = 2;

// Canonical Selection Criteria strings (shown on the tappable "Why these 4?" badge).
export const REASON_WAITED_LONGEST = 'Waited longest';
export const REASON_SKILL_MIX = 'Skill mix balanced';
export const REASON_NEW_PARTNERS = 'New partners';

export interface FoursomeEvaluation {
  team1: Player[];
  team2: Player[];
  reasons: string[];
}

interface ScoredFoursome {
  players: Player[];
  team1: Player[];
  team2: Player[];
  skillImbalance: number;
  noveltyPenalty: number;
  reasons: string[];
}

interface QueueUnit {
  players: Player[];
  queuedAt: number;
  isLockedPair: boolean;
}

function sumSkill(players: Player[]): number {
  return players.reduce((sum, p) => sum + SKILL_WEIGHT[p.skillLevel], 0);
}

function respectsTeamLocks(
  team1: Player[],
  team2: Player[],
  teamLockPairs: [string, string][]
): boolean {
  for (const [a, b] of teamLockPairs) {
    const aInTeam1 = team1.some((p) => p.id === a);
    const bInTeam1 = team1.some((p) => p.id === b);
    const aInTeam2 = team2.some((p) => p.id === a);
    const bInTeam2 = team2.some((p) => p.id === b);

    const keptTogether = (aInTeam1 && bInTeam1) || (aInTeam2 && bInTeam2);
    if (!keptTogether) return false;
  }
  return true;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildRecentSharedPairs(recentMatchPlayerIds: string[][]): Set<string> {
  const shared = new Set<string>();
  for (const playerIds of recentMatchPlayerIds) {
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        shared.add(pairKey(playerIds[i], playerIds[j]));
      }
    }
  }
  return shared;
}

function countRecentSharedPairs(players: Player[], recentSharedPairs: Set<string>): number {
  let count = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      if (recentSharedPairs.has(pairKey(players[i].id, players[j].id))) {
        count++;
      }
    }
  }
  return count;
}

function combinationsOfIndices(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];

  const visit = (start: number) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(i);
      visit(i + 1);
      combo.pop();
    }
  };

  visit(0);
  return result;
}

function splitsLockedPair(players: Player[], teamLockPairs: [string, string][]): boolean {
  for (const [a, b] of teamLockPairs) {
    const hasA = players.some((p) => p.id === a);
    const hasB = players.some((p) => p.id === b);
    if (hasA !== hasB) return true;
  }
  return false;
}

/**
 * Given exactly four players, choose the team split that best balances skill tiers
 * across the two opposing teams while keeping Team Lock pairs on the same team.
 */
function scoreFoursome(
  players: Player[],
  recentSharedPairs: Set<string>,
  teamLockPairs: [string, string][]
): ScoredFoursome {
  const pairings: [number[], number[]][] = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  let best: { team1: Player[]; team2: Player[]; imbalance: number } | null = null;

  for (const [leftIdx, rightIdx] of pairings) {
    const team1 = leftIdx.map((i) => players[i]);
    const team2 = rightIdx.map((i) => players[i]);

    if (!respectsTeamLocks(team1, team2, teamLockPairs)) continue;

    const imbalance = Math.abs(sumSkill(team1) - sumSkill(team2));
    if (!best || imbalance < best.imbalance) {
      best = { team1, team2, imbalance };
    }
  }

  // Fallback for malformed input where no split can satisfy every Team Lock.
  if (!best) {
    const team1 = [players[0], players[1]];
    const team2 = [players[2], players[3]];
    best = {
      team1,
      team2,
      imbalance: Math.abs(sumSkill(team1) - sumSkill(team2)),
    };
  }

  const noveltyPenalty = countRecentSharedPairs(players, recentSharedPairs);

  const reasons: string[] = [REASON_SKILL_MIX];
  if (noveltyPenalty === 0) reasons.push(REASON_NEW_PARTNERS);

  return {
    players,
    team1: best.team1,
    team2: best.team2,
    skillImbalance: best.imbalance,
    noveltyPenalty,
    reasons,
  };
}

/**
 * Pure evaluation of a candidate foursome: return the balanced team split and the
 * Selection Criteria strings that explain it. `recentMatchPlayerIds` is the list of
 * player id arrays from the last 2 matches; `teamLockPairs` is a list of locked pairs.
 */
export function evaluateCandidateFoursomes(
  players: Player[],
  recentMatchPlayerIds: string[][] = [],
  teamLockPairs: [string, string][] = []
): FoursomeEvaluation {
  if (players.length !== MIN_PLAYERS_PER_COURT) {
    const half = Math.ceil(players.length / 2);
    return {
      team1: players.slice(0, half),
      team2: players.slice(half),
      reasons: [],
    };
  }

  const recentSharedPairs = buildRecentSharedPairs(recentMatchPlayerIds);
  const scored = scoreFoursome(players, recentSharedPairs, teamLockPairs);
  return { team1: scored.team1, team2: scored.team2, reasons: scored.reasons };
}

function isBetterCandidate(
  a: ScoredFoursome & { fifoScore: number },
  b: ScoredFoursome & { fifoScore: number }
): boolean {
  if (a.fifoScore !== b.fifoScore) return a.fifoScore < b.fifoScore;
  if (a.skillImbalance !== b.skillImbalance) return a.skillImbalance < b.skillImbalance;
  return a.noveltyPenalty < b.noveltyPenalty;
}

async function markStacksDispatched(sessionId: string, dispatchedPlayerIds: string[]): Promise<void> {
  const dispatched = new Set(dispatchedPlayerIds);
  const waitingStacks = await db.stacks
    .where('sessionId')
    .equals(sessionId)
    .and((s) => s.status === 'waiting')
    .toArray();

  for (const stack of waitingStacks) {
    const remaining = stack.playerIds.filter((id) => !dispatched.has(id));
    if (remaining.length === stack.playerIds.length) continue;

    if (remaining.length === 0) {
      await db.stacks.update(stack.id, { status: 'dispatched' });
      continue;
    }

    // Partial dispatch: keep the remainder waiting; release the Team Lock if the
    // locked pair has left the stack.
    const locked = stack.teamLockPlayerIds;
    const lockedIntact = locked && locked.every((id) => remaining.includes(id));

    const update: Partial<Stack> = { playerIds: remaining };
    if (locked && !lockedIntact) {
      update.teamLockId = undefined;
      update.teamLockPlayerIds = undefined;
    }
    await db.stacks.update(stack.id, update);
  }
}

/**
 * Evaluates the session queue and dispatches a single foursome to the first Open
 * court. Returns the created Match (or an empty array when no dispatch is possible).
 */
export async function runAutoDispatch(sessionId: string): Promise<Match[]> {
  const openCourts = (await db.courts.where('sessionId').equals(sessionId).toArray())
    .filter((c) => c.status === 'open')
    .sort((a, b) => a.courtNumber - b.courtNumber);

  if (openCourts.length === 0) return [];

  const waitingStacks = (await db.stacks.where('sessionId').equals(sessionId).toArray())
    .filter((s) => s.status === 'waiting')
    .sort((a, b) => a.queuedAt - b.queuedAt);

  if (waitingStacks.length === 0) return [];

  const allPlayerIds = Array.from(new Set(waitingStacks.flatMap((s) => s.playerIds)));
  const players = await db.players.where('id').anyOf(allPlayerIds).toArray();
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Flatten waiting stacks into FIFO-ordered units; Team Lock pairs stay atomic.
  const units: QueueUnit[] = [];
  const teamLockPairs: [string, string][] = [];

  for (const stack of waitingStacks) {
    const locked =
      stack.teamLockPlayerIds ??
      (stack.teamLockId
        ? ([stack.playerIds[0], stack.playerIds[1]] as [string, string])
        : undefined);
    const lockedSet = locked ? new Set(locked) : null;

    let i = 0;
    while (i < stack.playerIds.length) {
      const id = stack.playerIds[i];

      if (lockedSet?.has(id)) {
        const pairIds = stack.playerIds.slice(i, i + 2);
        const pairPlayers = pairIds
          .map((pid) => playerMap.get(pid))
          .filter((p): p is Player => Boolean(p));

        if (pairPlayers.length === 2) {
          units.push({ players: pairPlayers, queuedAt: stack.queuedAt, isLockedPair: true });
          teamLockPairs.push([pairIds[0], pairIds[1]]);
        } else {
          const p = playerMap.get(id);
          if (p) units.push({ players: [p], queuedAt: stack.queuedAt, isLockedPair: false });
        }
        i += 2;
      } else {
        const p = playerMap.get(id);
        if (p) units.push({ players: [p], queuedAt: stack.queuedAt, isLockedPair: false });
        i += 1;
      }
    }
  }

  const totalWaiting = units.reduce((sum, u) => sum + u.players.length, 0);
  if (totalWaiting < MIN_PLAYERS_PER_COURT) return [];

  // Sliding window: the oldest up-to-8 waiting players, never splitting atomic units.
  const windowPlayers: Player[] = [];
  for (const unit of units) {
    if (windowPlayers.length + unit.players.length > WINDOW_SIZE) break;
    windowPlayers.push(...unit.players);
  }

  const fifoIndex = new Map<string, number>();
  windowPlayers.forEach((p, idx) => fifoIndex.set(p.id, idx));

  const recentMatches = (await db.matches.where('sessionId').equals(sessionId).toArray())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, RECENT_MATCH_COUNT);
  const recentSharedPairs = buildRecentSharedPairs(recentMatches.map((m) => m.playerIds));

  let best: (ScoredFoursome & { fifoScore: number }) | null = null;

  for (const idxCombo of combinationsOfIndices(windowPlayers.length, MIN_PLAYERS_PER_COURT)) {
    const comboPlayers = idxCombo.map((i) => windowPlayers[i]);
    if (splitsLockedPair(comboPlayers, teamLockPairs)) continue;

    const scored = scoreFoursome(comboPlayers, recentSharedPairs, teamLockPairs);
    const fifoScore = idxCombo.reduce((sum, i) => sum + i, 0);
    const candidate = { ...scored, fifoScore };

    if (!best || isBetterCandidate(candidate, best)) best = candidate;
  }

  if (!best) return [];

  const targetCourt = openCourts[0];
  const now = Date.now();

  const match: Match = {
    id: crypto.randomUUID(),
    sessionId,
    courtId: targetCourt.id,
    playerIds: best.players.map((p) => p.id),
    team1PlayerIds: best.team1.map((p) => p.id),
    team2PlayerIds: best.team2.map((p) => p.id),
    consecutiveWins: 0,
    selectionReasons: [REASON_WAITED_LONGEST, ...best.reasons],
    startedAt: now,
  };

  await db.matches.add(match);
  await db.courts.update(targetCourt.id, {
    status: 'in_play',
    activeMatchId: match.id,
    updatedAt: now,
  });

  await Promise.all(
    best.players.map((p) => db.players.update(p.id, { gamesPlayed: (p.gamesPlayed ?? 0) + 1 }))
  );

  await markStacksDispatched(sessionId, match.playerIds);

  return [match];
}
