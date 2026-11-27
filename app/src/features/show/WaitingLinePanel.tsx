'use client';

import React from 'react';
import { type NextGame } from './broadcastService';
import { Users, User } from 'lucide-react';

/**
 * "Next Games" / waiting line panel for the TV Broadcast Screen.
 * Shows the queued stacks with player names and position badges.
 */

interface WaitingLinePanelProps {
  nextGames: NextGame[];
}

export function WaitingLinePanel({ nextGames }: WaitingLinePanelProps) {
  if (nextGames.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-card-border bg-card-surface/50 text-center text-text-secondary">
        No players waiting.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="waiting-line">
      {nextGames.map((game, idx) => {
        const positionLabel =
          idx === 0 && game.isFull
            ? 'Next Up'
            : idx === 0
              ? 'On Deck'
              : idx === 1
                ? 'On Deck'
                : `#${idx + 1}`;

        const positionColor =
          idx === 0 && game.isFull
            ? 'bg-volt/20 text-volt border-volt/40'
            : idx <= 1
              ? 'bg-tangerine/20 text-tangerine border-tangerine/40'
              : 'bg-obsidian-dark text-text-secondary border-card-border';

        return (
          <div
            key={game.stackId}
            className="rounded-xl bg-card-surface border border-card-border/60 p-4 flex items-center gap-4 transition-all duration-300 animate-queue-enter"
          >
            {/* Position badge */}
            <div
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-mono font-bold uppercase tracking-wider ${positionColor}`}
            >
              {positionLabel}
            </div>

            {/* Player names */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {game.playerNames.map((name, i) => (
                  <span
                    key={i}
                    className="text-sm font-semibold text-white truncate"
                  >
                    {name}
                    {i < game.playerNames.length - 1 && (
                      <span className="text-text-secondary ml-1">•</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="shrink-0 flex items-center gap-1 text-xs font-mono text-text-secondary">
              {game.isFull ? (
                <Users className="w-3.5 h-3.5 text-volt" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              <span>{game.playerCount}/4</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
