import { db, type Player, type SkillLevel, type TournamentTeam, type TournamentFixture } from '../../db/db';
import { applyWinLoss } from '../scoring/winLoss';

const SKILL_WEIGHT: Record<SkillLevel, number> = {
  beginner: 1,
  'low-intermediate': 2,
  intermediate: 3,
  'high-intermediate': 4,
  advanced: 5,
};

/**
 * Seeded High-Low Balanced Pairing Algorithm:
 * Sorts players by skill level descending, separating the top-half seeds across
 * different teams and pairing them with bottom-half players.
 * Guarantees that no two Advanced players are paired together whenever
 * advanced player count <= total teams.
 */
export function pairPlayersHighLow(players: Player[]): [Player, Player][] {
  const eligibleCount = Math.floor(players.length / 2) * 2;
  if (eligibleCount < 2) return [];

  // Sort descending by skill level (and stable by id)
  const sorted = [...players.slice(0, eligibleCount)].sort((a, b) => {
    const diff = SKILL_WEIGHT[b.skillLevel] - SKILL_WEIGHT[a.skillLevel];
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const teamCount = eligibleCount / 2;
  const topSeeds = sorted.slice(0, teamCount);
  const bottomSeeds = sorted.slice(teamCount);

  const pairs: [Player, Player][] = [];
  for (let i = 0; i < teamCount; i++) {
    // Pair top seed i with bottom seed (teamCount - 1 - i) for maximum balancing
    const partner = bottomSeeds[teamCount - 1 - i];
    pairs.push([topSeeds[i], partner]);
  }

  return pairs;
}

/**
 * Creates and persists tournament teams in Dexie.
 */
export async function initializeTournamentTeams(
  sessionId: string,
  players: Player[]
): Promise<TournamentTeam[]> {
  const pairs = pairPlayersHighLow(players);
  const teams: TournamentTeam[] = pairs.map(([p1, p2], idx) => ({
    id: crypto.randomUUID(),
    sessionId,
    name: `Team ${idx + 1} (${p1.name} & ${p2.name})`,
    playerIds: [p1.id, p2.id],
    totalPoints: 0,
    pointsConceded: 0,
    wins: 0,
    losses: 0,
  }));

  await db.tournamentTeams.bulkAdd(teams);
  return teams;
}

/**
 * Standard round-robin fixture generator using the circle algorithm.
 * Guarantees every team plays every other team exactly once.
 */
export function generateRoundRobinFixturesList(
  sessionId: string,
  teams: TournamentTeam[]
): TournamentFixture[] {
  if (teams.length < 2) return [];

  const teamList: (TournamentTeam | null)[] = [...teams];
  const isOdd = teamList.length % 2 !== 0;
  if (isOdd) {
    teamList.push(null); // Dummy BYE
  }

  const n = teamList.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const fixtures: TournamentFixture[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
      const home = teamList[matchIdx];
      const away = teamList[n - 1 - matchIdx];

      // Skip byes
      if (home === null || away === null) continue;

      fixtures.push({
        id: crypto.randomUUID(),
        sessionId,
        round,
        team1Id: home.id,
        team2Id: away.id,
        status: 'scheduled',
      });
    }

    // Rotate elements except the first one
    const fixed = teamList[0];
    const rotating = teamList.slice(1);
    const last = rotating.pop()!;
    rotating.unshift(last);
    teamList.splice(0, teamList.length, fixed, ...rotating);
  }

  return fixtures;
}

/**
 * Generates and saves round-robin fixtures in Dexie.
 */
export async function setupTournamentFixtures(
  sessionId: string,
  teams: TournamentTeam[]
): Promise<TournamentFixture[]> {
  const fixtures = generateRoundRobinFixturesList(sessionId, teams);
  if (fixtures.length > 0) {
    await db.tournamentFixtures.bulkAdd(fixtures);
  }
  return fixtures;
}

/**
 * Applies (delta = 1) or reverses (delta = -1) a fixture result's contribution
 * to a single team's standing, so the scoring rules live in exactly one place.
 */
async function applyFixtureResultToTeam(
  teamId: string,
  scoredFor: number,
  scoredAgainst: number,
  delta: 1 | -1
): Promise<void> {
  const team = await db.tournamentTeams.get(teamId);
  if (!team) return;
  await db.tournamentTeams.update(teamId, {
    totalPoints: Math.max(0, team.totalPoints + delta * scoredFor),
    pointsConceded: Math.max(0, team.pointsConceded + delta * scoredAgainst),
    wins: Math.max(0, team.wins + delta * (scoredFor > scoredAgainst ? 1 : 0)),
    losses: Math.max(0, team.losses + delta * (scoredFor < scoredAgainst ? 1 : 0)),
  });
}

/**
 * Records scores for a completed tournament fixture, updates team standings.
 */
export async function recordTournamentResult(
  fixtureId: string,
  score1: number,
  score2: number,
  matchId?: string
): Promise<void> {
  if (score1 === score2) {
    throw new Error('Tournament fixture scores cannot be tied');
  }
  const fixture = await db.tournamentFixtures.get(fixtureId);
  if (!fixture) throw new Error('Tournament fixture not found');

  const winnerTeamId = score1 > score2 ? fixture.team1Id : score2 > score1 ? fixture.team2Id : undefined;

  await db.tournamentFixtures.update(fixtureId, {
    status: 'completed',
    score1,
    score2,
    winnerTeamId,
    matchId,
  });

  await applyFixtureResultToTeam(fixture.team1Id, score1, score2, 1);
  await applyFixtureResultToTeam(fixture.team2Id, score2, score1, 1);
}

/**
 * Returns tournament leaderboard ranked by:
 * 1. Total Points Scored (descending)
 * 2. Point Differential (totalPoints - pointsConceded, descending)
 * 3. Total Wins (descending)
 */
export async function getTournamentLeaderboard(sessionId: string): Promise<TournamentTeam[]> {
  const teams = await db.tournamentTeams.where('sessionId').equals(sessionId).toArray();
  return teams.sort((a, b) => {
    // 1. Highest total points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // 2. Point differential
    const diffA = a.totalPoints - a.pointsConceded;
    const diffB = b.totalPoints - b.pointsConceded;
    if (diffB !== diffA) {
      return diffB - diffA;
    }
    // 3. Wins
    return b.wins - a.wins;
  });
}

/**
 * Checks if all fixtures for the tournament have concluded.
 */
export async function isTournamentComplete(sessionId: string): Promise<boolean> {
  const fixtures = await db.tournamentFixtures.where('sessionId').equals(sessionId).toArray();
  if (fixtures.length === 0) return false;
  return fixtures.every((f) => f.status === 'completed');
}

/**
 * Overrides or manually records a score for a fixture (e.g. walkovers or corrections).
 */
export async function overrideTournamentFixtureScore(
  fixtureId: string,
  score1: number,
  score2: number
): Promise<void> {
  if (score1 === score2) {
    throw new Error('Tournament fixture scores cannot be tied');
  }
  const fixture = await db.tournamentFixtures.get(fixtureId);
  if (!fixture) throw new Error('Fixture not found');

  // If already completed, reverse old scores first
  if (fixture.status === 'completed' && fixture.score1 !== undefined && fixture.score2 !== undefined) {
    await applyFixtureResultToTeam(fixture.team1Id, fixture.score1, fixture.score2, -1);
    await applyFixtureResultToTeam(fixture.team2Id, fixture.score2, fixture.score1, -1);
  }

  await recordTournamentResult(fixtureId, score1, score2, fixture.matchId);

  // A walkover/forfeit on an in-play fixture must also resolve its live match,
  // free the court, and apply per-player Win/Loss — otherwise the court stays
  // stuck, the match lingers, and player records drift from the fixture result.
  if (fixture.status === 'in_play') {
    const now = Date.now();
    const winningTeam: 1 | 2 = score1 > score2 ? 1 : 2;
    if (fixture.matchId) {
      const match = await db.matches.get(fixture.matchId);
      if (match) {
        await db.matches.update(match.id, {
          score1,
          score2,
          winningTeam,
          status: 'completed',
          completedAt: now,
        });
        const winningIds = winningTeam === 1 ? match.team1PlayerIds : match.team2PlayerIds;
        const losingIds = winningTeam === 1 ? match.team2PlayerIds : match.team1PlayerIds;
        await applyWinLoss(winningIds, losingIds, 1);
      }
    }
    if (fixture.courtId) {
      await db.courts.update(fixture.courtId, {
        status: 'open',
        activeMatchId: undefined,
        updatedAt: now,
      });
    }
  }
}

/**
 * Regenerates tournament teams and fixtures for a session.
 */
export async function regenerateTournament(sessionId: string): Promise<void> {
  const existingFixtures = await db.tournamentFixtures.where('sessionId').equals(sessionId).toArray();
  if (existingFixtures.some((f) => f.status !== 'scheduled')) {
    throw new Error('Cannot re-seed after the tournament has started');
  }

  await db.tournamentTeams.where('sessionId').equals(sessionId).delete();
  await db.tournamentFixtures.where('sessionId').equals(sessionId).delete();

  const sessionPlayers = await db.sessionPlayers.where('sessionId').equals(sessionId).toArray();
  const playerIds = sessionPlayers.filter((sp) => sp.checkInState === 'ready').map((sp) => sp.playerId);
  const players = await db.players.where('id').anyOf(playerIds).toArray();

  if (players.length >= 2) {
    const teams = await initializeTournamentTeams(sessionId, players);
    await setupTournamentFixtures(sessionId, teams);
  }
}
