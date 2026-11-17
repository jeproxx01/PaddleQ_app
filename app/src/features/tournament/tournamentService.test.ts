import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, type Player } from '../../db/db';
import {
  pairPlayersHighLow,
  generateRoundRobinFixturesList,
  setupTournamentFixtures,
  recordTournamentResult,
  overrideTournamentFixtureScore,
  regenerateTournament,
  getTournamentLeaderboard,
  isTournamentComplete,
} from './tournamentService';

describe('tournamentService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('pairPlayersHighLow', () => {
    it('guarantees that no two Advanced players are paired together (4 Adv + 10 Beg)', () => {
      const advancedPlayers: Player[] = Array.from({ length: 4 }, (_, i) => ({
        id: `adv-${i + 1}`,
        name: `Adv ${i + 1}`,
        skillLevel: 'advanced',
        gender: 'any',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        createdAt: Date.now(),
      }));

      const beginnerPlayers: Player[] = Array.from({ length: 10 }, (_, i) => ({
        id: `beg-${i + 1}`,
        name: `Beg ${i + 1}`,
        skillLevel: 'beginner',
        gender: 'any',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        createdAt: Date.now(),
      }));

      const allPlayers = [...advancedPlayers, ...beginnerPlayers];
      const pairs = pairPlayersHighLow(allPlayers);

      expect(pairs.length).toBe(7); // 14 players -> 7 teams

      // Verify invariant: No team has two Advanced players
      for (const [p1, p2] of pairs) {
        const advCount = (p1.skillLevel === 'advanced' ? 1 : 0) + (p2.skillLevel === 'advanced' ? 1 : 0);
        expect(advCount).toBeLessThanOrEqual(1);
      }

      // Exactly 4 teams have 1 Advanced player, 3 teams have 2 Beginners
      const teamsWithAdv = pairs.filter(
        ([p1, p2]) => p1.skillLevel === 'advanced' || p2.skillLevel === 'advanced'
      );
      expect(teamsWithAdv.length).toBe(4);
    });

    it('handles odd number of entrants by holding back the last odd player on waitlist', () => {
      const players: Player[] = Array.from({ length: 15 }, (_, i) => ({
        id: `p-${i + 1}`,
        name: `Player ${i + 1}`,
        skillLevel: 'intermediate',
        gender: 'any',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        createdAt: Date.now(),
      }));

      const pairs = pairPlayersHighLow(players);
      expect(pairs.length).toBe(7); // 14 paired, 15th on standby
    });
  });

  describe('Round-Robin Fixtures', () => {
    it('generates round-robin fixtures where each team plays every other team once', () => {
      const teams = [
        { id: 't1', sessionId: 's1', name: 'T1', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId: 's1', name: 'T2', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't3', sessionId: 's1', name: 'T3', playerIds: ['p5', 'p6'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't4', sessionId: 's1', name: 'T4', playerIds: ['p7', 'p8'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];

      const fixtures = generateRoundRobinFixturesList('s1', teams);
      // For 4 teams: n*(n-1)/2 = 6 fixtures across 3 rounds
      expect(fixtures.length).toBe(6);

      // Verify every pairing is unique
      const matchupKeys = new Set(
        fixtures.map((f) => [f.team1Id, f.team2Id].sort().join('-vs-'))
      );
      expect(matchupKeys.size).toBe(6);
    });
  });

  describe('Standings and Leaderboard', () => {
    it('ranks teams by cumulative total points, with differential breaking ties', async () => {
      const sessionId = 'session-wta';
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);

      const [fixture] = await setupTournamentFixtures(sessionId, teams);

      // Team A scores 11, Team B scores 9
      await recordTournamentResult(fixture.id, 11, 9);

      const leaderboard = await getTournamentLeaderboard(sessionId);
      expect(leaderboard[0].id).toBe('t1');
      expect(leaderboard[0].totalPoints).toBe(11);
      expect(leaderboard[0].wins).toBe(1);
      expect(leaderboard[1].id).toBe('t2');
      expect(leaderboard[1].totalPoints).toBe(9);

      const complete = await isTournamentComplete(sessionId);
      expect(complete).toBe(true);
    });
  });

  describe('score validation', () => {
    it('rejects a tied fixture score so a completed fixture always has a winner', async () => {
      const sessionId = 'session-tie';
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);
      const [fixture] = await setupTournamentFixtures(sessionId, teams);

      await expect(recordTournamentResult(fixture.id, 11, 11)).rejects.toThrow();

      const saved = await db.tournamentFixtures.get(fixture.id);
      expect(saved?.status).toBe('scheduled');
      expect(saved?.winnerTeamId).toBeUndefined();
    });

    it('rejects a tied override without corrupting prior standings', async () => {
      const sessionId = 'session-override-tie';
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);
      const [fixture] = await setupTournamentFixtures(sessionId, teams);
      await recordTournamentResult(fixture.id, 11, 9);

      await expect(overrideTournamentFixtureScore(fixture.id, 11, 11)).rejects.toThrow();

      const leaderboard = await getTournamentLeaderboard(sessionId);
      expect(leaderboard[0].totalPoints).toBe(11);
      expect(leaderboard[0].wins).toBe(1);
      const saved = await db.tournamentFixtures.get(fixture.id);
      expect(saved?.score1).toBe(11);
      expect(saved?.score2).toBe(9);
    });
  });

  describe('walkover / forfeit', () => {
    it('walkover on an in-play fixture completes its match and frees the court', async () => {
      const sessionId = 'session-walkover';
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);
      const [fixture] = await setupTournamentFixtures(sessionId, teams);

      const matchId = 'match-1';
      const courtId = 'court-1';
      await db.matches.add({
        id: matchId,
        sessionId,
        courtId,
        gameMode: 'winner-takes-all-round-robin',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        team1PlayerIds: ['p1', 'p2'],
        team2PlayerIds: ['p3', 'p4'],
        consecutiveWins: 0,
        selectionReasons: ['Round 1 Tournament Fixture'],
        mixedDoubles: false,
        status: 'in_play',
        startedAt: Date.now(),
      });
      await db.courts.add({
        id: courtId,
        sessionId,
        courtNumber: 1,
        status: 'in_play',
        activeMatchId: matchId,
        updatedAt: Date.now(),
      });
      await db.tournamentFixtures.update(fixture.id, {
        status: 'in_play',
        courtId,
        matchId,
      });

      await overrideTournamentFixtureScore(fixture.id, 11, 0);

      const savedFixture = await db.tournamentFixtures.get(fixture.id);
      expect(savedFixture?.status).toBe('completed');
      expect(savedFixture?.winnerTeamId).toBe('t1');

      const savedMatch = await db.matches.get(matchId);
      expect(savedMatch?.status).toBe('completed');
      expect(savedMatch?.winningTeam).toBe(1);
      expect(savedMatch?.score1).toBe(11);
      expect(savedMatch?.score2).toBe(0);

      const savedCourt = await db.courts.get(courtId);
      expect(savedCourt?.status).toBe('open');
      expect(savedCourt?.activeMatchId).toBeUndefined();

      const leaderboard = await getTournamentLeaderboard(sessionId);
      expect(leaderboard[0].id).toBe('t1');
      expect(leaderboard[0].totalPoints).toBe(11);
      expect(leaderboard[0].wins).toBe(1);
      expect(leaderboard[1].losses).toBe(1);
    });

    it('walkover applies per-player Win/Loss like a normally scored match', async () => {
      const sessionId = 'session-walkover-wl';
      await db.players.bulkAdd([
        { id: 'p1', name: 'P1', skillLevel: 'intermediate', gender: 'any', gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
        { id: 'p2', name: 'P2', skillLevel: 'intermediate', gender: 'any', gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
        { id: 'p3', name: 'P3', skillLevel: 'intermediate', gender: 'any', gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
        { id: 'p4', name: 'P4', skillLevel: 'intermediate', gender: 'any', gamesPlayed: 0, wins: 0, losses: 0, createdAt: Date.now() },
      ]);
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);
      const [fixture] = await setupTournamentFixtures(sessionId, teams);

      const matchId = 'match-wl';
      const courtId = 'court-wl';
      await db.matches.add({
        id: matchId,
        sessionId,
        courtId,
        gameMode: 'winner-takes-all-round-robin',
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        team1PlayerIds: ['p1', 'p2'],
        team2PlayerIds: ['p3', 'p4'],
        consecutiveWins: 0,
        selectionReasons: ['Round 1 Tournament Fixture'],
        mixedDoubles: false,
        status: 'in_play',
        startedAt: Date.now(),
      });
      await db.courts.add({ id: courtId, sessionId, courtNumber: 1, status: 'in_play', activeMatchId: matchId, updatedAt: Date.now() });
      await db.tournamentFixtures.update(fixture.id, { status: 'in_play', courtId, matchId });

      await overrideTournamentFixtureScore(fixture.id, 11, 0);

      const p1 = await db.players.get('p1');
      const p3 = await db.players.get('p3');
      expect(p1?.wins).toBe(1);
      expect(p3?.losses).toBe(1);
    });
  });

  describe('score correction', () => {
    it('corrects a completed fixture score and recalculates standings', async () => {
      const sessionId = 'session-correct';
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);
      const [fixture] = await setupTournamentFixtures(sessionId, teams);

      // Initial: Team A wins 11-9
      await recordTournamentResult(fixture.id, 11, 9);

      // Correct to: Team B wins 9-11
      await overrideTournamentFixtureScore(fixture.id, 9, 11);

      const leaderboard = await getTournamentLeaderboard(sessionId);
      expect(leaderboard[0].id).toBe('t2');
      expect(leaderboard[0].totalPoints).toBe(11);
      expect(leaderboard[0].wins).toBe(1);
      expect(leaderboard[1].id).toBe('t1');
      expect(leaderboard[1].totalPoints).toBe(9);
      expect(leaderboard[1].losses).toBe(1);

      const saved = await db.tournamentFixtures.get(fixture.id);
      expect(saved?.score1).toBe(9);
      expect(saved?.score2).toBe(11);
      expect(saved?.winnerTeamId).toBe('t2');
    });
  });

  describe('re-seed gating', () => {
    it('refuses to re-seed once any fixture has been dispatched', async () => {
      const sessionId = 'session-reseed';
      const teams = [
        { id: 't1', sessionId, name: 'Team A', playerIds: ['p1', 'p2'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
        { id: 't2', sessionId, name: 'Team B', playerIds: ['p3', 'p4'] as [string, string], totalPoints: 0, pointsConceded: 0, wins: 0, losses: 0 },
      ];
      await db.tournamentTeams.bulkAdd(teams);
      const fixtures = await setupTournamentFixtures(sessionId, teams);
      await db.tournamentFixtures.update(fixtures[0].id, {
        status: 'in_play',
        courtId: 'court-1',
        matchId: 'match-1',
      });

      await expect(regenerateTournament(sessionId)).rejects.toThrow();

      const remainingTeams = await db.tournamentTeams.where('sessionId').equals(sessionId).count();
      expect(remainingTeams).toBe(2);
      const remainingFixtures = await db.tournamentFixtures.where('sessionId').equals(sessionId).count();
      expect(remainingFixtures).toBe(fixtures.length);
    });
  });
});
