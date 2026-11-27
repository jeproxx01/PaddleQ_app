'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { type CourtWithMatch } from '../courts/courtService';
import {
  formatMatchTimer,
  isMatchDurationStalled,
  getMatchTimerColorClass,
} from '../courts/courtUtils';

/**
 * Read-only court card for the TV Broadcast Screen.
 *
 * Optimised for large-screen distance readability: bigger type, no interactive
 * buttons (Record Score, Why these 4?), and no touch targets. It mirrors the
 * Kiosk's CourtCard data but strips all organizer controls.
 */

interface BroadcastCourtCardProps {
  court: CourtWithMatch;
}

export function BroadcastCourtCard({ court }: BroadcastCourtCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const isInPlay = court.status === 'in_play' && Boolean(court.activeMatch);
  const match = court.activeMatch;

  useEffect(() => {
    if (!isInPlay || !match?.startedAt) {
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const seconds = Math.max(0, Math.floor((now - match.startedAt) / 1000));
      setElapsedSeconds(seconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isInPlay, match?.startedAt]);

  const isStalled = isInPlay && isMatchDurationStalled(elapsedSeconds);
  const timerColorClass = getMatchTimerColorClass(elapsedSeconds);

  return (
    <div
      className={`relative rounded-2xl bg-card-surface border p-6 flex flex-col justify-between transition-all duration-200 shadow-lg ${
        isInPlay
          ? isStalled
            ? 'border-tangerine/60 shadow-tangerine/10'
            : 'border-cyan/40 shadow-cyan/5'
          : 'border-card-border'
      }`}
      data-testid={`broadcast-court-${court.courtNumber}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-card-border/60">
        <span className="text-3xl font-black font-mono tracking-tight text-white">
          Court {court.courtNumber}
        </span>
        {isInPlay ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan/15 text-cyan border border-cyan/40 text-sm font-mono font-bold uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
            In Play
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-obsidian-dark text-text-secondary border border-card-border text-sm font-mono uppercase tracking-wider">
            Open
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="my-4 flex-1">
        {isInPlay && match ? (
          <div key={match.id} className="space-y-3 rounded-xl animate-dispatch-enter">
            {/* Teams display — large type for TV */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark/70 border border-card-border/40">
                <span className="font-bold text-lg text-white truncate">
                  {match.team1.map((p) => p.name).join(' & ') || 'Team 1'}
                </span>
                <span className="text-xs font-mono text-cyan/80 ml-2">
                  Team 1
                </span>
              </div>

              <div className="text-center text-xs font-bold tracking-widest text-text-secondary">
                VS
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark/70 border border-card-border/40">
                <span className="font-bold text-lg text-white truncate">
                  {match.team2.map((p) => p.name).join(' & ') || 'Team 2'}
                </span>
                <span className="text-xs font-mono text-volt/80 ml-2">
                  Team 2
                </span>
              </div>
            </div>

            {/* Consecutive wins badge */}
            {match.consecutiveWins > 0 && (
              <div className="text-center">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-volt/15 text-volt border border-volt/30 font-bold">
                  🔥 {match.consecutiveWins} Consecutive{' '}
                  {match.consecutiveWins === 1 ? 'Win' : 'Wins'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-card-border/60 bg-obsidian-dark/30">
            <span className="text-lg font-semibold text-text-secondary">
              Court Ready
            </span>
            <span className="text-sm text-text-secondary/70 mt-1">
              Awaiting next dispatch
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Timer only (no action buttons) */}
      <div className="pt-3 border-t border-card-border/60 flex items-center justify-center">
        {isInPlay ? (
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${timerColorClass}`} />
            <span
              className={`text-2xl font-mono font-bold tabular-nums ${timerColorClass}`}
            >
              {formatMatchTimer(elapsedSeconds)}
            </span>
            {isStalled && (
              <span className="flex items-center gap-1 text-xs font-bold text-tangerine bg-tangerine/15 px-2 py-1 rounded border border-tangerine/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                &gt;20m
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
            <span>Standby</span>
            <span>00:00</span>
          </div>
        )}
      </div>
    </div>
  );
}
