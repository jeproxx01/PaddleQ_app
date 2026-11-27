'use client';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

/**
 * Winner moment flash — a celebratory full-screen overlay shown on the
 * Broadcast Screen when a match completes. Auto-dismisses after a timeout.
 */

interface WinnerFlashProps {
  courtNumber: number;
  winnerNames: string[];
  onDismiss: () => void;
  durationMs?: number;
}

export function WinnerFlash({
  courtNumber,
  winnerNames,
  onDismiss,
  durationMs = 8000,
}: WinnerFlashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-dark/95 backdrop-blur-md animate-in fade-in duration-300"
      data-testid="winner-flash"
    >
      <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
        {/* Trophy icon with glow */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-volt/20 blur-3xl scale-150" />
            <div className="relative p-6 rounded-full bg-volt/10 border-2 border-volt/40">
              <Trophy className="w-20 h-20 text-volt" />
            </div>
          </div>
        </div>

        {/* Court number */}
        <div className="text-2xl font-mono text-cyan tracking-wider uppercase">
          Court {courtNumber}
        </div>

        {/* Winner heading */}
        <h1 className="text-5xl font-black tracking-tight text-white">
          🎉 Winners! 🎉
        </h1>

        {/* Winner names */}
        <div className="text-3xl font-bold text-volt">
          {winnerNames.join(' & ')}
        </div>

        {/* Subtle dismiss hint */}
        <p className="text-sm text-text-secondary/60 font-mono animate-pulse">
          Auto-dismissing…
        </p>
      </div>
    </div>
  );
}
