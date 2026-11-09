import { db, Court, Player } from '../../db/db';

export interface CourtWithMatch extends Court {
  activeMatch?: {
    id: string;
    startedAt: number;
    consecutiveWins: number;
    selectionReasons: string[];
    players: Player[];
    team1: Player[];
    team2: Player[];
  };
}

export async function getCourtsWithMatches(sessionId: string): Promise<CourtWithMatch[]> {
  const courts = (await db.courts.where('sessionId').equals(sessionId).toArray()).sort(
    (a, b) => a.courtNumber - b.courtNumber
  );

  const courtsWithMatches: CourtWithMatch[] = [];

  for (const court of courts) {
    if (court.activeMatchId) {
      const match = await db.matches.get(court.activeMatchId);
      if (match) {
        const players = await db.players.where('id').anyOf(match.playerIds).toArray();
        const playerMap = new Map(players.map((p) => [p.id, p]));

        const allPlayers = match.playerIds.map((id) => playerMap.get(id)!).filter(Boolean);
        const team1 = match.team1PlayerIds.map((id) => playerMap.get(id)!).filter(Boolean);
        const team2 = match.team2PlayerIds.map((id) => playerMap.get(id)!).filter(Boolean);

        courtsWithMatches.push({
          ...court,
          activeMatch: {
            id: match.id,
            startedAt: match.startedAt,
            consecutiveWins: match.consecutiveWins,
            selectionReasons: match.selectionReasons,
            players: allPlayers,
            team1,
            team2,
          },
        });
        continue;
      }
    }

    courtsWithMatches.push({ ...court });
  }

  return courtsWithMatches;
}

export async function assignMatchToCourt(courtId: string, matchId: string): Promise<void> {
  await db.courts.update(courtId, {
    status: 'in_play',
    activeMatchId: matchId,
    updatedAt: Date.now(),
  });
}

export async function clearCourt(courtId: string): Promise<void> {
  await db.courts.update(courtId, {
    status: 'open',
    activeMatchId: undefined,
    updatedAt: Date.now(),
  });
}
