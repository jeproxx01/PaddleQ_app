'use client';

import React, { useState } from 'react';
import { X, Check, Delete, Trophy } from 'lucide-react';
import { type CourtWithMatch } from '../courts/courtService';
import { recordScore } from './scoringService';

interface ScorekeeperModalProps {
  court: CourtWithMatch;
  sessionId: string;
  onClose: () => void;
  onScored: () => void | Promise<void>;
}

export function ScorekeeperModal({ court, sessionId, onClose, onScored }: ScorekeeperModalProps) {
  const match = court.activeMatch;
  const [scores, setScores] = useState<[string, string]>(['', '']);
  const [activeScoreIndex, setActiveScoreIndex] = useState<0 | 1>(0);
  const [winningTeam, setWinningTeam] = useState<1 | 2 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!match) return null;

  const teams: [1, 2] = [1, 2];
  const teamPlayers: Record<1 | 2, string[]> = {
    1: match.team1.map((p) => p.name),
    2: match.team2.map((p) => p.name),
  };

  const pressDigit = (digit: string) => {
    setError(null);
    setScores((prev) => {
      const next = [...prev] as [string, string];
      const current = next[activeScoreIndex];
      if (current.length >= 2) return prev;
      next[activeScoreIndex] = current + digit;
      return next;
    });
  };

  const pressBackspace = () => {
    setScores((prev) => {
      const next = [...prev] as [string, string];
      next[activeScoreIndex] = next[activeScoreIndex].slice(0, -1);
      return next;
    });
  };

  const handleSubmit = async () => {
    const s1 = parseInt(scores[0], 10);
    const s2 = parseInt(scores[1], 10);

    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      setError('Enter a score for both teams.');
      return;
    }
    if (winningTeam === null) {
      setError('Tap the winning team to select it.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await recordScore(sessionId, match.id, s1, s2, winningTeam);
      await onScored();
      onClose();
    } catch (err) {
      console.error('Failed to record score:', err);
      setError('Failed to record score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-card-border">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-volt/10 text-volt border border-volt/20">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Record Score</h2>
              <p className="text-xs text-text-secondary font-mono">Court {court.courtNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-obsidian-dark hover:bg-card-border text-text-secondary hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teams & Winner selection */}
        <div className="grid grid-cols-2 gap-3 my-5">
          {teams.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => {
                setWinningTeam(team);
                setActiveScoreIndex((team - 1) as 0 | 1);
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                winningTeam === team
                  ? 'border-volt bg-volt/10'
                  : 'border-card-border bg-obsidian-dark/70 hover:border-volt/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${winningTeam === team ? 'text-volt' : 'text-text-secondary'}`}>
                  Team {team}
                </span>
                {winningTeam === team && (
                  <span className="px-2 py-0.5 rounded-full bg-volt/20 text-volt text-[10px] font-bold">
                    WINNER
                  </span>
                )}
              </div>
              <div className="text-white font-semibold mt-2">{teamPlayers[team].join(' & ')}</div>
              <button
                type="button"
                onClick={() => setActiveScoreIndex((team - 1) as 0 | 1)}
                className={`mt-3 w-full h-12 rounded-lg border font-mono text-2xl font-bold ${
                  activeScoreIndex === (team - 1) ? 'border-cyan bg-cyan/10 text-cyan' : 'border-card-border bg-card-surface text-white'
                }`}
              >
                {scores[team - 1] === '' ? '—' : scores[team - 1]}
              </button>
            </button>
          ))}
        </div>

        {/* Big-Pad keypad */}
        <div className="grid grid-cols-5 gap-2">
          {keypad.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pressDigit(d)}
              className="h-14 rounded-xl bg-obsidian-dark border border-card-border text-2xl font-bold text-white hover:border-volt/50 active:scale-[0.97] transition-all"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={pressBackspace}
            className="h-14 rounded-xl bg-obsidian-dark border border-card-border text-volt hover:border-volt/50 active:scale-[0.97] transition-all flex items-center justify-center"
            aria-label="Backspace"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Confirm */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 mt-4 rounded-xl bg-volt hover:bg-volt-hover text-obsidian-dark font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg shadow-volt/20 transition-all active:scale-[0.99]"
        >
          <Check className="w-5 h-5" />
          {isSubmitting ? 'Recording...' : 'Confirm Score'}
        </button>
      </div>
    </div>
  );
}
