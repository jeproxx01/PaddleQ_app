'use client';

import React, { useState } from 'react';
import { User, Users, Lock, Clock, PlusCircle, MoreVertical, Play, Pencil, QrCode } from 'lucide-react';
import { type SkillLevel } from '../../db/db';
import { SKILL_LEVEL_ABBREV } from '../../shared/display';
import { StackWithPlayers, computeQueueReadiness, disbandStack } from './queueService';
import { JoinModal } from './JoinModal';
import { StackEditModal } from './StackEditModal';
import { ChangeStackModal } from './ChangeStackModal';
import { QRCodeModal } from '../checkin/QRCodeModal';

interface PaddleRackProps {
  sessionId: string;
  stacks: StackWithPlayers[];
  onQueueUpdated: () => void;
  onStartStack?: (stack: StackWithPlayers) => void;
}

export function PaddleRack({ sessionId, stacks, onQueueUpdated, onStartStack }: PaddleRackProps) {
  const [modalMode, setModalMode] = useState<'solo' | 'pair' | 'foursome' | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editStack, setEditStack] = useState<StackWithPlayers | null>(null);
  const [changeStack, setChangeStack] = useState<StackWithPlayers | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const totalWaitingPlayers = stacks.reduce((sum, s) => sum + s.playerIds.length, 0);
  const readinessText = computeQueueReadiness(totalWaitingPlayers);

  const getPositionBadge = (index: number, count: number) => {
    if (index === 0 && count === 4) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-volt/20 text-volt border border-volt/40 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-volt animate-ping" />
          #1 Next Up
        </span>
      );
    }
    if (index === 1 || (index === 0 && count < 4)) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-tangerine/20 text-tangerine border border-tangerine/40 text-xs font-mono font-bold tracking-wider uppercase">
          #2 On Deck
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-obsidian-dark text-text-secondary border border-card-border text-xs font-mono">
        #{index + 1} In Line
      </span>
    );
  };

  const getSkillBadgeColor = (skill: SkillLevel) => {
    switch (skill) {
      case 'advanced':
        return 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40';
      case 'high-intermediate':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'intermediate':
        return 'bg-blue-950/80 text-blue-300 border-blue-500/40';
      case 'low-intermediate':
        return 'bg-teal-950/80 text-teal-300 border-teal-500/40';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
    }
  };

  const handleDisband = async (stackId: string) => {
    await disbandStack(sessionId, stackId);
    setMenuOpen(null);
    onQueueUpdated();
  };

  return (
    <div className="flex flex-col gap-5 w-full" data-testid="paddle-rack">
      {/* Queue Header & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card-surface border border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Paddle Queue Rack</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-volt/15 text-volt text-xs font-mono font-bold border border-volt/30">
              {stacks.length} {stacks.length === 1 ? 'Stack' : 'Stacks'}
            </span>
          </div>
          <p className="text-sm font-mono text-cyan mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            {readinessText}
          </p>
        </div>

        {/* Big Touch Action Buttons (>= 56px / h-14) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="h-14 px-4 rounded-xl bg-obsidian-dark hover:bg-card-border border border-card-border hover:border-volt/50 text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
            title="Show QR Code for players to scan"
          >
            <QrCode className="w-4 h-4 text-volt" />
            Check-In QR
          </button>

          <button
            type="button"
            onClick={() => setModalMode('solo')}
            className="h-14 px-5 rounded-xl bg-obsidian-dark hover:bg-card-border border border-card-border hover:border-volt/50 text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <User className="w-4 h-4 text-volt" />
            + Join Solo
          </button>

          <button
            type="button"
            onClick={() => setModalMode('pair')}
            className="h-14 px-5 rounded-xl bg-obsidian-dark hover:bg-card-border border border-card-border hover:border-volt/50 text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Users className="w-4 h-4 text-cyan" />
            + Join Pair
          </button>

          <button
            type="button"
            onClick={() => setModalMode('foursome')}
            className="h-14 px-6 rounded-xl bg-volt hover:bg-volt-hover text-obsidian-dark font-black text-sm flex items-center gap-2 shadow-lg shadow-volt/10 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5 fill-current" />
            + Join 4-Stack
          </button>
        </div>
      </div>

      {/* Stacks Lineup */}
      {stacks.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-card-border bg-card-surface/30 text-center flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-text-secondary/50 mb-3" />
          <h3 className="text-lg font-bold text-white">Paddle Rack is Empty</h3>
          <p className="text-sm text-text-secondary max-w-sm mt-1">
            Tap &quot;Join Solo&quot;, &quot;Join Pair&quot;, or &quot;Join 4-Stack&quot; above to drop your paddle into the rotation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stacks.map((stack, idx) => {
            const slots = [0, 1, 2, 3];
            const isFull = stack.players.length === 4;

            return (
              <div
                key={stack.id}
                className={`relative rounded-2xl bg-card-surface border p-4 flex flex-col justify-between transition-all shadow-md ${
                  idx === 0 && isFull
                    ? 'border-volt/50 shadow-volt/5'
                    : idx === 1
                    ? 'border-tangerine/40 shadow-tangerine/5'
                    : 'border-card-border'
                }`}
              >
                {/* Stack Header */}
                <div className="flex items-center justify-between pb-3 border-b border-card-border/60">
                  <div className="flex items-center gap-2">
                    {getPositionBadge(idx, stack.players.length)}
                    {stack.pool === 'winners' && (
                      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-volt/15 text-volt border border-volt/30 font-bold">
                        Winners
                      </span>
                    )}
                    {stack.pool === 'losers' && (
                      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                        Losers
                      </span>
                    )}
                    {stack.teamLockId && (
                      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan/15 text-cyan border border-cyan/30" title="Team Lock Active">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-white">
                    {stack.players.length}/4
                  </span>
                </div>

                {/* Paddle Slots */}
                <div className="my-3 space-y-2">
                  {slots.map((slotIndex) => {
                    const player = stack.players[slotIndex];

                    if (player) {
                      return (
                        <div
                          key={player.id}
                          className="h-11 px-3 rounded-xl bg-obsidian-dark border border-card-border/70 flex items-center justify-between"
                        >
                          <span className="font-semibold text-sm text-white truncate max-w-[150px]">
                            {player.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getSkillBadgeColor(
                              player.skillLevel
                            )}`}
                          >
                            {SKILL_LEVEL_ABBREV[player.skillLevel]}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`empty-${slotIndex}`}
                        className="h-11 px-3 rounded-xl border border-dashed border-card-border/50 bg-obsidian-dark/30 flex items-center justify-center text-xs text-text-secondary/60 font-mono"
                      >
                        + Waiting for player
                      </div>
                    );
                  })}
                </div>

                {/* Stack Footer */}
                <div className="pt-2 border-t border-card-border/60 flex items-center justify-between text-xs text-text-secondary font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-text-secondary" />
                    Stack #{idx + 1}
                  </span>
                  <span className="capitalize">{stack.entryType}</span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  {isFull && onStartStack && (
                    <button
                      type="button"
                      onClick={() => onStartStack(stack)}
                      className="flex-1 h-11 rounded-lg bg-volt hover:bg-volt-hover text-obsidian-dark font-bold text-sm flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Game
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChangeStack(stack)}
                    className={`${isFull ? 'w-11' : 'flex-1'} h-11 rounded-lg bg-obsidian-dark hover:bg-card-border border border-card-border text-text-secondary hover:text-white flex items-center justify-center gap-1.5 text-xs font-semibold`}
                    title="Change players"
                  >
                    <Pencil className="w-4 h-4" />
                    {!isFull && 'Change'}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === stack.id ? null : stack.id)}
                      className="w-11 h-11 rounded-lg bg-obsidian-dark hover:bg-card-border border border-card-border text-text-secondary hover:text-white flex items-center justify-center"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === stack.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-card-surface border border-card-border shadow-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setEditStack(stack);
                            setMenuOpen(null);
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-obsidian-dark"
                        >
                          Remove players
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisband(stack.id)}
                          className="w-full text-left px-3 py-2.5 text-sm text-red-300 hover:bg-obsidian-dark"
                        >
                          Disband stack
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Modal Trigger */}
      {modalMode && (
        <JoinModal
          sessionId={sessionId}
          initialMode={modalMode}
          onClose={() => setModalMode(null)}
          onJoined={onQueueUpdated}
        />
      )}

      {/* Stack Edit Modal */}
      {editStack && (
        <StackEditModal
          sessionId={sessionId}
          stack={editStack}
          onClose={() => setEditStack(null)}
          onChanged={onQueueUpdated}
        />
      )}

      {/* Change Stack Modal (next stacks) */}
      {changeStack && (
        <ChangeStackModal
          sessionId={sessionId}
          currentStackId={changeStack.id}
          onClose={() => setChangeStack(null)}
          onChanged={onQueueUpdated}
        />
      )}

      {/* QR Self Check-In Modal */}
      {showQrModal && (
        <QRCodeModal
          sessionId={sessionId}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
