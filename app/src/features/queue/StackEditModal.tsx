'use client';

import React, { useEffect, useState } from 'react';
import { X, UserMinus, UserPlus } from 'lucide-react';
import { db, type Player } from '../../db/db';
import {
  type StackWithPlayers,
  removePlayerFromQueue,
  getNextInLinePlayers,
  movePlayerToStack,
} from './queueService';

interface StackEditModalProps {
  sessionId: string;
  stack: StackWithPlayers;
  onClose: () => void;
  onChanged: () => void;
}

export function StackEditModal({ sessionId, stack, onClose, onChanged }: StackEditModalProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [nextInLine, setNextInLine] = useState<Player[]>([]);
  const [currentPlayers, setCurrentPlayers] = useState<string[]>(stack.playerIds);

  useEffect(() => {
    getNextInLinePlayers(sessionId, stack.id, 3).then(setNextInLine);
  }, [sessionId, stack.id]);

  const reload = async () => {
    const s = await db.stacks.get(stack.id);
    if (s) setCurrentPlayers(s.playerIds);
    setNextInLine(await getNextInLinePlayers(sessionId, stack.id, 3));
  };

  const handleRemove = async (playerId: string) => {
    setRemovingId(playerId);
    await removePlayerFromQueue(sessionId, playerId);
    setRemovingId(null);
    await reload();
    onChanged();
  };

  const handleAdd = async (playerId: string) => {
    setAddingId(playerId);
    const moved = await movePlayerToStack(sessionId, playerId, stack.id);
    setAddingId(null);
    if (moved) {
      await reload();
      onChanged();
    }
  };

  const playerMap = new Map<string, string>();
  for (const id of currentPlayers) {
    const p = stack.players.find((sp) => sp.id === id);
    playerMap.set(id, p?.name ?? 'Player');
  }
  for (const p of nextInLine) playerMap.set(p.id, p.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="stack-edit-modal"
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

        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mt-4 mb-2">
          In this stack
        </h3>
        <ul className="space-y-2">
          {currentPlayers.map((playerId) => (
            <li
              key={playerId}
              className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-dark/60 border border-card-border/50"
            >
              <span className="text-sm font-semibold">{playerMap.get(playerId) ?? 'Player'}</span>
              <button
                type="button"
                onClick={() => handleRemove(playerId)}
                disabled={removingId === playerId}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/50 border border-red-500/40 text-xs text-red-300 hover:bg-red-950/80 disabled:opacity-50"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Remove
              </button>
            </li>
          ))}
        </ul>

        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mt-5 mb-2">
          Next in line
        </h3>
        {nextInLine.length === 0 ? (
          <p className="text-xs text-text-secondary">No one else in line.</p>
        ) : (
          <ul className="space-y-2">
            {nextInLine.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-dark/60 border border-card-border/50"
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <button
                  type="button"
                  onClick={() => handleAdd(p.id)}
                  disabled={addingId === p.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-volt/15 border border-volt/40 text-xs text-volt hover:bg-volt/25 disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
