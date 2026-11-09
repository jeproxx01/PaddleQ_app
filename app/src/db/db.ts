import Dexie, { type EntityTable } from 'dexie';

export type RotationMode = '4-In / 4-Out' | 'Winners Stay & Split';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Session {
  id: string;
  status: 'active' | 'ended';
  courtCount: number;
  rotationMode: RotationMode;
  pin: string;
  audioEnabled: boolean;
  startedAt: number;
  endedAt?: number;
}

export interface Player {
  id: string;
  name: string;
  skillLevel: SkillLevel;
  gamesPlayed: number;
  createdAt: number;
}

export interface Stack {
  id: string;
  sessionId: string;
  entryType: 'solo' | 'pair' | 'foursome';
  playerIds: string[];
  teamLockId?: string;
  queuedAt: number;
  status: 'waiting' | 'dispatched' | 'cancelled';
}

export interface Court {
  id: string;
  sessionId: string;
  courtNumber: number;
  status: 'open' | 'in_play';
  activeMatchId?: string;
  updatedAt: number;
}

export interface Match {
  id: string;
  sessionId: string;
  courtId: string;
  playerIds: string[];
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  score1?: number;
  score2?: number;
  winningTeam?: 1 | 2;
  consecutiveWins: number;
  selectionReasons: string[];
  startedAt: number;
  completedAt?: number;
}

export class PaddleQDatabase extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  players!: EntityTable<Player, 'id'>;
  stacks!: EntityTable<Stack, 'id'>;
  courts!: EntityTable<Court, 'id'>;
  matches!: EntityTable<Match, 'id'>;

  constructor() {
    super('PaddleQDatabase');
    this.version(1).stores({
      sessions: 'id, status, startedAt',
      players: 'id, name, skillLevel',
      stacks: 'id, sessionId, status, queuedAt',
      courts: 'id, sessionId, courtNumber, status',
      matches: 'id, sessionId, courtId, startedAt, completedAt',
    });
  }
}

export const db = new PaddleQDatabase();
