import Dexie, { type EntityTable } from 'dexie';

/**
 * PaddleQ domain model (ADR-0001). All enum values are kebab-case strings;
 * display labels live in `shared/display.ts`.
 */

export const GAME_MODES = [
  'open-play',
  'winners-stay-split',
  'challenge-court',
  'time-based',
] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const SKILL_LEVELS = [
  'beginner',
  'low-intermediate',
  'intermediate',
  'high-intermediate',
  'advanced',
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export type Gender = 'any' | 'male' | 'female';

export type SessionStatus = 'lobby' | 'live' | 'ended';
export type RecordScoresMode = 'winners' | 'winners-and-scores';
export type SkillMixing = 'auto-balance' | 'manual' | 'gender-format';

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  courtCount: number;
  gameMode: GameMode;
  recordScores: RecordScoresMode;
  targetScore: number;
  timeLimitMinutes?: number;
  pin: string;
  audioEnabled: boolean;
  autoFill: boolean;
  skillMixing: SkillMixing;
  startedAt: number;
  endedAt?: number;
}

export interface Player {
  id: string;
  name: string;
  skillLevel: SkillLevel;
  gender: Gender;
  gamesPlayed: number;
  wins: number;
  losses: number;
  createdAt: number;
}

export type CheckInState = 'not_here' | 'ready' | 'resting';

export interface SessionPlayer {
  id: string;
  sessionId: string;
  playerId: string;
  checkInState: CheckInState;
  joinedAt: number;
}

export interface Stack {
  id: string;
  sessionId: string;
  entryType: 'solo' | 'pair' | 'foursome';
  playerIds: string[];
  teamLockId?: string;
  teamLockPlayerIds?: [string, string];
  queuedAt: number;
  status: 'waiting' | 'dispatched' | 'cancelled';
}

export interface Court {
  id: string;
  sessionId: string;
  courtNumber: number;
  courtGroupId?: string;
  status: 'open' | 'in_play';
  activeMatchId?: string;
  updatedAt: number;
}

export type MatchStatus = 'in_play' | 'completed' | 'abandoned';

export interface Match {
  id: string;
  sessionId: string;
  courtId: string;
  gameMode: GameMode;
  playerIds: string[];
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  score1?: number;
  score2?: number;
  winningTeam?: 1 | 2;
  consecutiveWins: number;
  selectionReasons: string[];
  mixedDoubles: boolean;
  status: MatchStatus;
  startedAt: number;
  completedAt?: number;
}

export type DeviceRole = 'kiosk' | 'scorer' | 'display' | 'checkin';

export interface DeviceLink {
  id: string;
  sessionId: string;
  role: DeviceRole;
  joinedAt: number;
}

export class PaddleQDatabase extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  players!: EntityTable<Player, 'id'>;
  sessionPlayers!: EntityTable<SessionPlayer, 'id'>;
  stacks!: EntityTable<Stack, 'id'>;
  courts!: EntityTable<Court, 'id'>;
  matches!: EntityTable<Match, 'id'>;
  deviceLinks!: EntityTable<DeviceLink, 'id'>;

  constructor() {
    super('PaddleQDatabase');
    this.version(1).stores({
      sessions: 'id, status, startedAt',
      players: 'id, name, skillLevel',
      stacks: 'id, sessionId, status, queuedAt',
      courts: 'id, sessionId, courtNumber, status',
      matches: 'id, sessionId, courtId, startedAt, completedAt',
    });
    this.version(2).stores({
      sessionPlayers: 'id, sessionId, playerId, checkInState',
      deviceLinks: 'id, sessionId, role',
    });
  }
}

export const db = new PaddleQDatabase();
