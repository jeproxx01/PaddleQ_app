'use client';

import React, { useEffect, useState } from 'react';
import { X, ArrowUpDown } from 'lucide-react';
import { type StackWithPlayers, getNextStacks, swapStacks } from './queueService';

interface ChangeStackModalProps {
  sessionId: string;
  currentStackId: string;
  onClose: () => void;
  onChanged: () => void;
}

/** Formats a stack as a grouped "Team A & Team B vs Team C & Team D" line. */
function formatStackGroup(stack: StackWithPlayers): string {
  const names = stack.players.map((p) => p.name);
  if (names.length === 0) return 'Empty';
  if (names.length <= 2) return names.join(' & ');
  const left = names.slice(0, 2).join(' & ');
  const right = names.slice(2).join(' & ');
  return `${left} vs ${right}`;
}

export function ChangeStackModal({
  sessionId,
  currentStackId,
  onClose,
  onChanged,
}: ChangeStackModalProps) {
  const [nextStacks, setNextStacks] = useState<StackWithPlayers[]>([]);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  useEffect(() => {
    getNextStacks(sessionId, currentStackId, 3).then(setNextStacks);
  }, [sessionId, currentStackId]);

  const handleSwap = async (stackId: string) => {
    setSwappingId(stackId);
    await swapStacks(sessionId, currentStackId, stackId);
    setSwappingId(null);
    onChanged();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="change-stack-modal"
      >
        <div className="flex items-center justify-between pb-3 border-b border-card-border">
          <h2 className="text-lg font-bold text-white">Change stack</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-obsidian-dark text-text-secondary hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-2">
          {nextStacks.length === 0 ? (
            <p className="text-sm text-text-secondary">No other stacks in line.</p>
          ) : (
            nextStacks.map((stack, i) => (
              <div
                key={stack.id}
                className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark/60 border border-card-border/50"
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                    Next {i + 1}
                  </div>
                  <div className="text-sm font-semibold text-white">{formatStackGroup(stack)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSwap(stack.id)}
                  disabled={swappingId === stack.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-volt/15 border border-volt/40 text-xs text-volt hover:bg-volt/25 disabled:opacity-50"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Swap
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
