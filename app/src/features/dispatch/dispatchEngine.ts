import { db } from '../../db/db';
import type { DispatchAudit, EvaluatedFoursome, Match, Player, SkillLevel, Stack } from '../../db/db';

/**
 * QMaster Composite Dispatch Engine.
 *
 * Assigns the next eligible Stack to an Open court using a composite ranking:
 *   1. Waited Longest (strict FIFO backbone — players outside the first-14
 *      waiting window can never jump ahead),
 *   2. Skill Mix balance (minimizing the tier gap between opposing teams across
 *      the five skill tiers),
 *   3. New Partners (penalizing players who were partners in the last 2 matches),
 *   4. No Repeat Opponents (penalizing players who faced each other in the last
 *      2 matches).
 *
 * Team Lock pairs are treated as atomic units: a locked pair is either dispatched
 * together on the same team or not dispatched at all.
 */

const SKILL_WEIGHT: Record<SkillLevel, number> = {
  beginner: 0,
  'low-intermediate': 1,
  intermediate: 2,
  'high-intermediate': 3,
  advanced: 4,
};

const MIN_PLAYERS_PER_COURT = 4;
const WINDOW_SIZE = 14;
const RECENT_MATCH_COUNT = 2;

// Canonical Selection Criteria strings (shown on the tappable "Why these 4?" badge).
export const REASON_WAITED_LONGEST = 'Waited longest';
export const REASON_SKILL_MIX = 'Skill mix balanced';
export const REASON_NEW_PARTNERS = 'New partners';
export const REASON_NO_REPEAT_OPPONENTS = 'No repeat opponents';

export interface RecentMatchShape {
  team1PlayerIds: string[];
  team2PlayerIds: string[];
}

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
  partnerNoveltyPenalty: number;
  opponentNoveltyPenalty: number;
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

function buildRecentPartnerPairs(recent: RecentMatchShape[]): Set<string> {
  const shared = new Set<string>();
  for (const m of recent) {
    for (let i = 0; i < m.team1PlayerIds.length; i++) {
      for (let j = i + 1; j < m.team1PlayerIds.length; j++) {
        shared.add(pairKey(m.team1PlayerIds[i], m.team1PlayerIds[j]));
      }
    }
    for (let i = 0; i < m.team2PlayerIds.length; i++) {
      for (let j = i + 1; j < m.team2PlayerIds.length; j++) {
        shared.add(pairKey(m.team2PlayerIds[i], m.team2PlayerIds[j]));
      }
    }
  }
  return shared;
}

function buildRecentOpponentPairs(recent: RecentMatchShape[]): Set<string> {
  const shared = new Set<string>();
  for (const m of recent) {
    for (const a of m.team1PlayerIds) {
      for (const b of m.team2PlayerIds) {
        shared.add(pairKey(a, b));
      }
    }
  }
  return shared;
}

function countPartnerRepeats(
  team1: Player[],
  team2: Player[],
  recentPartners: Set<string>
): number {
  let count = 0;
  for (let i = 0; i < team1.length; i++) {
    for (let j = i + 1; j < team1.length; j++) {
      if (recentPartners.has(pairKey(team1[i].id, team1[j].id))) count++;
    }
  }
  for (let i = 0; i < team2.length; i++) {
    for (let j = i + 1; j < team2.length; j++) {
      if (recentPartners.has(pairKey(team2[i].id, team2[j].id))) count++;
    }
  }
  return count;
}

function countOpponentRepeats(
  team1: Player[],
  team2: Player[],
  recentOpponents: Set<string>
): number {
  let count = 0;
  for (const a of team1) {
    for (const b of team2) {
      if (recentOpponents.has(pairKey(a.id, b.id))) count++;
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
  recentPartnerPairs: Set<string>,
  recentOpponentPairs: Set<string>,
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

  const partnerNoveltyPenalty = countPartnerRepeats(
    best.team1,
    best.team2,
    recentPartnerPairs
  );
  const opponentNoveltyPenalty = countOpponentRepeats(
    best.team1,
    best.team2,
    recentOpponentPairs
  );

  const reasons: string[] = [REASON_SKILL_MIX];
  if (partnerNoveltyPenalty === 0) reasons.push(REASON_NEW_PARTNERS);
  if (opponentNoveltyPenalty === 0) reasons.push(REASON_NO_REPEAT_OPPONENTS);

  return {
    players,
    team1: best.team1,
    team2: best.team2,
    skillImbalance: best.imbalance,
    partnerNoveltyPenalty,
    opponentNoveltyPenalty,
    reasons,
  };
}

/**
 * Pure evaluation of a candidate foursome: return the balanced team split and the
 * Selection Criteria strings that explain it. `recentMatches` is the list of recent
 * matches (team assignments); `teamLockPairs` is a list of locked pairs.
 */
export function evaluateCandidateFoursomes(
  players: Player[],
  recentMatches: RecentMatchShape[] = [],
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

  const recentPartnerPairs = buildRecentPartnerPairs(recentMatches);
  const recentOpponentPairs = buildRecentOpponentPairs(recentMatches);
  const scored = scoreFoursome(players, recentPartnerPairs, recentOpponentPairs, teamLockPairs);
  return { team1: scored.team1, team2: scored.team2, reasons: scored.reasons };
}

function isBetterCandidate(
  a: ScoredFoursome & { fifoScore: number },
  b: ScoredFoursome & { fifoScore: number }
): boolean {
  if (a.fifoScore !== b.fifoScore) return a.fifoScore < b.fifoScore;
  if (a.skillImbalance !== b.skillImbalance) return a.skillImbalance < b.skillImbalance;
  if (a.partnerNoveltyPenalty !== b.partnerNoveltyPenalty) {
    return a.partnerNoveltyPenalty < b.partnerNoveltyPenalty;
  }
  return a.opponentNoveltyPenalty < b.opponentNoveltyPenalty;
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
  const session = await db.sessions.get(sessionId);
  if (!session) return [];

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

  // Sliding window: the first up-to-14 waiting players, never splitting atomic units.
  const windowPlayers: Player[] = [];
  for (const unit of units) {
    if (windowPlayers.length + unit.players.length > WINDOW_SIZE) break;
    windowPlayers.push(...unit.players);
  }

  const fifoIndex = new Map<string, number>();
  windowPlayers.forEach((p, idx) => fifoIndex.set(p.id, idx));

  const recentMatches = (await db.matches.where('sessionId').equals(sessionId).toArray())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, RECENT_MATCH_COUNT)
    .map((m) => ({ team1PlayerIds: m.team1PlayerIds, team2PlayerIds: m.team2PlayerIds }));
  const recentPartnerPairs = buildRecentPartnerPairs(recentMatches);
  const recentOpponentPairs = buildRecentOpponentPairs(recentMatches);

  let best: (ScoredFoursome & { fifoScore: number }) | null = null;
  const evaluated: EvaluatedFoursome[] = [];

  for (const idxCombo of combinationsOfIndices(windowPlayers.length, MIN_PLAYERS_PER_COURT)) {
    const comboPlayers = idxCombo.map((i) => windowPlayers[i]);
    if (splitsLockedPair(comboPlayers, teamLockPairs)) continue;

    const scored = scoreFoursome(comboPlayers, recentPartnerPairs, recentOpponentPairs, teamLockPairs);
    const fifoScore = idxCombo.reduce((sum, i) => sum + i, 0);
    const candidate = { ...scored, fifoScore };

    evaluated.push({
      playerIds: comboPlayers.map((p) => p.id),
      fifoScore,
      skillImbalance: scored.skillImbalance,
      noveltyPenalty: scored.partnerNoveltyPenalty + scored.opponentNoveltyPenalty,
    });

    if (!best || isBetterCandidate(candidate, best)) best = candidate;
  }

  if (!best) return [];

  const targetCourt = openCourts[0];
  const now = Date.now();

  const maleCount = best.players.filter((p) => p.gender === 'male').length;
  const femaleCount = best.players.filter((p) => p.gender === 'female').length;
  const mixedDoubles = maleCount === 2 && femaleCount === 2;

  const selectionReasons = [REASON_WAITED_LONGEST, ...best.reasons];
  const auditTrail: DispatchAudit = {
    timestamp: now,
    candidatePoolSize: windowPlayers.length,
    criteria: selectionReasons,
    evaluated,
  };

  const match: Match = {
    id: crypto.randomUUID(),
    sessionId,
    courtId: targetCourt.id,
    gameMode: session.gameMode,
    playerIds: best.players.map((p) => p.id),
    team1PlayerIds: best.team1.map((p) => p.id),
    team2PlayerIds: best.team2.map((p) => p.id),
    consecutiveWins: 0,
    selectionReasons,
    mixedDoubles,
    status: 'in_play',
    auditTrail,
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

/**
 * Manually dispatches a specific, complete (4-player) waiting stack to the next
 * open court — used by the queue card's "Start" button. Returns the created match,
 * or null if the stack isn't a full waiting stack or no court is open.
 */
export async function dispatchStack(sessionId: string, stackId: string): Promise<Match | null> {
  const stack = await db.stacks.get(stackId);
  if (!stack || stack.status !== 'waiting' || stack.playerIds.length !== MIN_PLAYERS_PER_COURT) {
    return null;
  }

  const session = await db.sessions.get(sessionId);
  if (!session) return null;

  const openCourt = (await db.courts.where('sessionId').equals(sessionId).toArray())
    .filter((c) => c.status === 'open')
    .sort((a, b) => a.courtNumber - b.courtNumber)[0];
  if (!openCourt) return null;

  const players = await db.players.where('id').anyOf(stack.playerIds).toArray();
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const four = stack.playerIds
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));
  if (four.length !== MIN_PLAYERS_PER_COURT) return null;

  const teamLockPairs = stack.teamLockPlayerIds ? [stack.teamLockPlayerIds] : [];
  const evaluation = evaluateCandidateFoursomes(four, [], teamLockPairs);

  const now = Date.now();
  const maleCount = four.filter((p) => p.gender === 'male').length;
  const femaleCount = four.filter((p) => p.gender === 'female').length;
  const mixedDoubles = maleCount === 2 && femaleCount === 2;

  const selectionReasons = [REASON_WAITED_LONGEST, ...evaluation.reasons];
  const match: Match = {
    id: crypto.randomUUID(),
    sessionId,
    courtId: openCourt.id,
    gameMode: session.gameMode,
    playerIds: four.map((p) => p.id),
    team1PlayerIds: evaluation.team1.map((p) => p.id),
    team2PlayerIds: evaluation.team2.map((p) => p.id),
    consecutiveWins: 0,
    selectionReasons,
    mixedDoubles,
    status: 'in_play',
    startedAt: now,
  };

  await db.matches.add(match);
  await db.courts.update(openCourt.id, {
    status: 'in_play',
    activeMatchId: match.id,
    updatedAt: now,
  });
  await db.stacks.update(stackId, { status: 'dispatched' });
  await Promise.all(
    four.map((p) => db.players.update(p.id, { gamesPlayed: (p.gamesPlayed ?? 0) + 1 }))
  );

  return match;
}
