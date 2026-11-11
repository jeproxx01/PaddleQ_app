'use client';

import React, { useState } from 'react';
import { X, UserMinus } from 'lucide-react';
import { type StackWithPlayers, removePlayerFromQueue } from './queueService';

interface StackEditModalProps {
  sessionId: string;
  stack: StackWithPlayers;
  onClose: () => void;
  onChanged: () => void;
}

/** Remove players from a stack (opened from the ⋮ menu). */
export function StackEditModal({ sessionId, stack, onClose, onChanged }: StackEditModalProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (playerId: string) => {
    setRemovingId(playerId);
    await removePlayerFromQueue(sessionId, playerId);
    setRemovingId(null);
    onChanged();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="stack-edit-modal"
      >
        <div className="flex items-center justify-between pb-3 border-b border-card-border">
          <h2 className="text-lg font-bold text-white">Remove players</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-obsidian-dark text-text-secondary hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="my-4 space-y-2">
          {stack.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-dark/60 border border-card-border/50"
            >
              <span className="text-sm font-semibold">{p.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                disabled={removingId === p.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/50 border border-red-500/40 text-xs text-red-300 hover:bg-red-950/80 disabled:opacity-50"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
