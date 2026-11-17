import type { GameMode, Gender, SkillLevel } from '../db/db';

/**
 * Human-facing labels for the domain model's kebab-case enum values.
 * UI strings and identifiers must never drift from GLOSSARY.md.
 */

export const SKILL_LEVELS_ORDERED: SkillLevel[] = [
  'beginner',
  'low-intermediate',
  'intermediate',
  'high-intermediate',
  'advanced',
];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  'low-intermediate': 'Low Intermediate',
  intermediate: 'Intermediate',
  'high-intermediate': 'High Intermediate',
  advanced: 'Advanced',
};

export const SKILL_LEVEL_ABBREV: Record<SkillLevel, string> = {
  beginner: 'B',
  'low-intermediate': 'LI',
  intermediate: 'I',
  'high-intermediate': 'HI',
  advanced: 'A',
};

export const GAME_MODES_ORDERED: GameMode[] = [
  'open-play',
  'winner-vs-loser-pools',
  'winner-takes-all-round-robin',
];

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  'open-play': 'Open Play (4-In / 4-Out)',
  'winner-vs-loser-pools': 'Winner/Winner vs Loser/Loser',
  'winner-takes-all-round-robin': 'Winner Takes All (Round Robin)',
};

export const GENDER_LABELS: Record<Gender, string> = {
  any: 'Any',
  male: 'Male',
  female: 'Female',
};
