'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Users, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { SkillLevel } from '../../db/db';
import { getOrCreatePlayer, searchPlayers, joinSolo, joinPair, joinFoursome } from './queueService';

interface JoinModalProps {
  sessionId: string;
  initialMode?: 'solo' | 'pair' | 'foursome';
  onClose: () => void;
  onJoined: () => void;
}

interface PlayerFormData {
  name: string;
  skillLevel: SkillLevel;
  suggestions: { id: string; name: string; skillLevel: SkillLevel }[];
}

export function JoinModal({ sessionId, initialMode = 'solo', onClose, onJoined }: JoinModalProps) {
  const [entryMode, setEntryMode] = useState<'solo' | 'pair' | 'foursome'>(initialMode);
  const [players, setPlayers] = useState<PlayerFormData[]>([
    { name: '', skillLevel: 'Intermediate', suggestions: [] },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync player input count with entryMode
  useEffect(() => {
    if (entryMode === 'solo') {
      setPlayers((prev) => [prev[0] || { name: '', skillLevel: 'Intermediate', suggestions: [] }]);
    } else if (entryMode === 'pair') {
      setPlayers((prev) => [
        prev[0] || { name: '', skillLevel: 'Intermediate', suggestions: [] },
        prev[1] || { name: '', skillLevel: 'Intermediate', suggestions: [] },
      ]);
    } else if (entryMode === 'foursome') {
      setPlayers((prev) => [
        prev[0] || { name: '', skillLevel: 'Intermediate', suggestions: [] },
        prev[1] || { name: '', skillLevel: 'Intermediate', suggestions: [] },
        prev[2] || { name: '', skillLevel: 'Intermediate', suggestions: [] },
        prev[3] || { name: '', skillLevel: 'Intermediate', suggestions: [] },
      ]);
    }
  }, [entryMode]);

  const handleNameChange = async (index: number, value: string) => {
    const updated = [...players];
    updated[index].name = value;

    if (value.trim().length >= 2) {
      const results = await searchPlayers(value);
      updated[index].suggestions = results;
    } else {
      updated[index].suggestions = [];
    }
    setPlayers(updated);
  };

  const handleSelectSuggestion = (index: number, suggestion: { name: string; skillLevel: SkillLevel }) => {
    const updated = [...players];
    updated[index].name = suggestion.name;
    updated[index].skillLevel = suggestion.skillLevel;
    updated[index].suggestions = [];
    setPlayers(updated);
  };

  const handleSkillChange = (index: number, skill: SkillLevel) => {
    const updated = [...players];
    updated[index].skillLevel = skill;
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate that all names are filled
    for (let i = 0; i < players.length; i++) {
      if (!players[i].name.trim()) {
        setErrorMessage(`Please enter a name for Player ${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const savedPlayers = await Promise.all(
        players.map((p) => getOrCreatePlayer(p.name, p.skillLevel))
      );

      if (entryMode === 'solo') {
        await joinSolo(sessionId, savedPlayers[0].id);
      } else if (entryMode === 'pair') {
        await joinPair(sessionId, savedPlayers[0].id, savedPlayers[1].id);
      } else if (entryMode === 'foursome') {
        await joinFoursome(sessionId, [
          savedPlayers[0].id,
          savedPlayers[1].id,
          savedPlayers[2].id,
          savedPlayers[3].id,
        ]);
      }

      onJoined();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to join queue:', err);
      setErrorMessage('Failed to join queue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-card-border">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-volt/10 text-volt border border-volt/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Queue Your Paddle</h2>
              <p className="text-xs text-text-secondary">Instant 3-second walk-in join</p>
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

        {/* Entry Mode Tabs */}
        <div className="grid grid-cols-3 gap-2 my-5">
          <button
            type="button"
            onClick={() => setEntryMode('solo')}
            className={`h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'solo'
                ? 'border-volt bg-volt/15 text-volt font-bold'
                : 'border-card-border bg-obsidian-dark text-text-secondary hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Solo (1/4)
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('pair')}
            className={`h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'pair'
                ? 'border-volt bg-volt/15 text-volt font-bold'
                : 'border-card-border bg-obsidian-dark text-text-secondary hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Pair (2/4)
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('foursome')}
            className={`h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              entryMode === 'foursome'
                ? 'border-volt bg-volt/15 text-volt font-bold'
                : 'border-card-border bg-obsidian-dark text-text-secondary hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-cyan" />
            4-Stack (4/4)
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Players Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {players.map((player, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary">
                <span>Player {idx + 1}</span>
                {entryMode === 'pair' && <span className="text-cyan font-mono">Locked Partner</span>}
              </div>

              {/* Name input */}
              <div className="relative">
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder="Enter player name"
                  className="w-full h-12 rounded-xl bg-card-surface border border-card-border px-4 text-white text-base focus:outline-none focus:border-volt"
                  autoFocus={idx === 0}
                  required
                />

                {/* Autocomplete suggestions chips */}
                {player.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {player.suggestions.map((sug) => (
                      <button
                        type="button"
                        key={sug.id}
                        onClick={() => handleSelectSuggestion(idx, sug)}
                        className="px-2.5 py-1 rounded-lg bg-cyan/15 hover:bg-cyan/25 border border-cyan/40 text-xs font-mono text-cyan flex items-center gap-1.5 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>{sug.name}</span>
                        <span className="text-[10px] opacity-75">({sug.skillLevel[0]})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 1-Tap Skill Level selection */}
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Skill Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as SkillLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleSkillChange(idx, level)}
                      className={`h-11 rounded-lg text-xs font-semibold transition-all ${
                        player.skillLevel === level
                          ? 'border border-volt bg-volt/20 text-volt font-bold'
                          : 'border border-card-border bg-card-surface text-text-secondary hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Submit action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 mt-4 rounded-xl bg-volt hover:bg-volt-hover text-obsidian-dark font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-volt/20 transition-all active:scale-[0.99]"
          >
            {isSubmitting ? 'Stacking...' : 'Stack Paddle into Queue'}
          </button>
        </form>
      </div>
    </div>
  );
}
