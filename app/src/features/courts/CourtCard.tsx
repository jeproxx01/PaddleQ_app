'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Users } from 'lucide-react';
import { CourtWithMatch } from './courtService';
import { formatMatchTimer, isMatchDurationStalled, getMatchTimerColorClass } from './courtUtils';

interface CourtCardProps {
  court: CourtWithMatch;
  onRecordScore?: (court: CourtWithMatch) => void;
  onWhyTheseFour?: (court: CourtWithMatch) => void;
}

export function CourtCard({ court, onRecordScore, onWhyTheseFour }: CourtCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const isInPlay = court.status === 'in_play' && Boolean(court.activeMatch);
  const match = court.activeMatch;

  useEffect(() => {
    if (!isInPlay || !match?.startedAt) {
      setElapsedSeconds(0);
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
      className={`relative rounded-2xl bg-card-surface border p-5 flex flex-col justify-between transition-all duration-200 shadow-lg ${
        isInPlay
          ? isStalled
            ? 'border-tangerine/60 shadow-tangerine/10'
            : 'border-cyan/40 shadow-cyan/5'
          : 'border-card-border hover:border-card-border/80'
      }`}
      data-testid={`court-card-${court.courtNumber}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-card-border/60">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black font-mono tracking-tight text-white">
            Court {court.courtNumber}
          </span>
          {match && match.consecutiveWins > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-volt/15 text-volt border border-volt/30 font-bold">
              {match.consecutiveWins} {match.consecutiveWins === 1 ? 'Win' : 'Wins'}
            </span>
          )}
        </div>

        {isInPlay ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/40 text-xs font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            In Play
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian-dark text-text-secondary border border-card-border text-xs font-mono uppercase tracking-wider">
            Open
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="my-4 flex-1">
        {isInPlay && match ? (
          <div className="space-y-3">
            {/* Teams display */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-obsidian-dark/70 border border-card-border/40 text-sm">
                <span className="font-semibold text-white truncate max-w-[170px]">
                  {match.team1.map((p) => p.name).join(' & ') || 'Team 1'}
                </span>
                <span className="text-xs font-mono text-cyan/80">Team 1</span>
              </div>

              <div className="text-center text-[11px] font-bold tracking-widest text-text-secondary">
                VS
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-obsidian-dark/70 border border-card-border/40 text-sm">
                <span className="font-semibold text-white truncate max-w-[170px]">
                  {match.team2.map((p) => p.name).join(' & ') || 'Team 2'}
                </span>
                <span className="text-xs font-mono text-volt/80">Team 2</span>
              </div>
            </div>

            {/* Why these 4? badge */}
            {match.selectionReasons && match.selectionReasons.length > 0 && (
              <button
                type="button"
                onClick={() => onWhyTheseFour?.(court)}
                className="w-full text-left text-[11px] text-text-secondary hover:text-white flex items-center justify-between px-2 py-1 rounded bg-obsidian-dark/40 border border-card-border/30 transition-colors"
                title="View match selection criteria"
              >
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-volt" />
                  Why these 4?
                </span>
                <span className="font-mono text-volt truncate max-w-[120px]">
                  {match.selectionReasons[0]}
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-card-border/60 bg-obsidian-dark/30">
            <span className="text-sm font-semibold text-text-secondary">Court Ready</span>
            <span className="text-xs text-text-secondary/70 mt-1">
              Next available foursome will auto-dispatch here
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Timer & Action */}
      <div className="pt-3 border-t border-card-border/60 flex items-center justify-between">
        {isInPlay ? (
          <>
            <div className="flex items-center gap-1.5">
              <Clock className={`w-4 h-4 ${timerColorClass}`} />
              <span className={`text-xl font-mono font-bold tabular-nums ${timerColorClass}`}>
                {formatMatchTimer(elapsedSeconds)}
              </span>
              {isStalled && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-tangerine bg-tangerine/15 px-1.5 py-0.5 rounded border border-tangerine/30">
                  <AlertTriangle className="w-3 h-3" />
                  &gt;20m
                </span>
              )}
            </div>

            {onRecordScore && (
              <button
                type="button"
                onClick={() => onRecordScore(court)}
                className="h-10 px-3.5 rounded-lg bg-volt hover:bg-volt-hover text-obsidian-dark font-bold text-xs flex items-center gap-1.5 shadow-md shadow-volt/10 transition-colors"
              >
                Record Score
              </button>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-between text-xs text-text-secondary font-mono">
            <span>Standby</span>
            <span>00:00</span>
          </div>
        )}
      </div>
    </div>
  );
}
