'use client';

import React from 'react';
import { type RecentResult } from './broadcastService';
import { Trophy } from 'lucide-react';

/**
 * Recent results panel for the TV Broadcast Screen.
 * Shows the last N completed matches with scores and winning team highlight.
 */

interface RecentResultsPanelProps {
  results: RecentResult[];
}

export function RecentResultsPanel({ results }: RecentResultsPanelProps) {
  if (results.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-card-border bg-card-surface/50 text-center text-text-secondary">
        No completed matches yet.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="recent-results">
      {results.map((result) => {
        const team1Won = result.winningTeam === 1;
        const team2Won = result.winningTeam === 2;
        const hasScores =
          result.score1 != null && result.score2 != null;

        return (
          <div
            key={result.matchId}
            className="rounded-xl bg-card-surface border border-card-border/60 p-4 flex items-center gap-4"
          >
            {/* Court badge */}
            <div className="shrink-0 w-14 h-14 rounded-xl bg-obsidian-dark border border-card-border flex flex-col items-center justify-center">
              <span className="text-[10px] font-mono text-text-secondary uppercase">
                Court
              </span>
              <span className="text-lg font-black font-mono text-white">
                {result.courtNumber}
              </span>
            </div>

            {/* Teams & Score */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className={`font-semibold text-sm truncate ${
                    team1Won ? 'text-volt' : 'text-white/70'
                  }`}
                >
                  {team1Won && (
                    <Trophy className="w-3.5 h-3.5 inline mr-1 text-volt" />
                  )}
                  {result.team1Names.join(' & ')}
                </span>
                {hasScores && (
                  <span
                    className={`font-mono font-bold text-sm tabular-nums ml-2 ${
                      team1Won ? 'text-volt' : 'text-text-secondary'
                    }`}
                  >
                    {result.score1}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`font-semibold text-sm truncate ${
                    team2Won ? 'text-volt' : 'text-white/70'
                  }`}
                >
                  {team2Won && (
                    <Trophy className="w-3.5 h-3.5 inline mr-1 text-volt" />
                  )}
                  {result.team2Names.join(' & ')}
                </span>
                {hasScores && (
                  <span
                    className={`font-mono font-bold text-sm tabular-nums ml-2 ${
                      team2Won ? 'text-volt' : 'text-text-secondary'
                    }`}
                  >
                    {result.score2}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
