'use client';

import React from 'react';
import { X, Clock, Scale, Sparkles, Users } from 'lucide-react';
import { CourtWithMatch } from '../courts/courtService';
import {
  REASON_WAITED_LONGEST,
  REASON_SKILL_MIX,
  REASON_NEW_PARTNERS,
} from './dispatchEngine';

interface WhyTheseFourModalProps {
  court: CourtWithMatch;
  onClose: () => void;
}

interface ReasonMeta {
  icon: React.ReactNode;
  label: string;
  description: string;
}

function reasonMeta(reason: string): ReasonMeta {
  switch (reason) {
    case REASON_WAITED_LONGEST:
      return {
        icon: <Clock className="w-4 h-4 text-volt" />,
        label: 'Waited longest',
        description: 'These players have been waiting the longest in the FIFO line.',
      };
    case REASON_SKILL_MIX:
      return {
        icon: <Scale className="w-4 h-4 text-cyan" />,
        label: 'Skill mix',
        description: 'Teams are balanced across Beginner, Intermediate, and Advanced tiers.',
      };
    case REASON_NEW_PARTNERS:
      return {
        icon: <Sparkles className="w-4 h-4 text-tangerine" />,
        label: 'New partners',
        description: 'No recent repeats — these players did not share a court in the last 2 matches.',
      };
    default:
      return {
        icon: <Users className="w-4 h-4 text-volt" />,
        label: reason,
        description: '',
      };
  }
}

export function WhyTheseFourModal({ court, onClose }: WhyTheseFourModalProps) {
  const match = court.activeMatch;
  if (!match) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="why-these-four-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-card-border">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-volt/10 text-volt border border-volt/20">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Why these 4?
              </h2>
              <p className="text-xs text-text-secondary font-mono">
                Court {court.courtNumber} · Match selection criteria
              </p>
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

        {/* Teams */}
        <div className="my-5 space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark/70 border border-card-border/40 text-sm">
            <span className="font-semibold text-white">
              {match.team1.map((p) => p.name).join(' & ') || 'Team 1'}
            </span>
            <span className="text-xs font-mono text-cyan/80">Team 1</span>
          </div>
          <div className="text-center text-[11px] font-bold tracking-widest text-text-secondary">
            VS
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark/70 border border-card-border/40 text-sm">
            <span className="font-semibold text-white">
              {match.team2.map((p) => p.name).join(' & ') || 'Team 2'}
            </span>
            <span className="text-xs font-mono text-volt/80">Team 2</span>
          </div>
        </div>

        {/* Selection criteria */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Selection criteria
          </h3>
          {match.selectionReasons.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No criteria recorded for this match.
            </p>
          ) : (
            match.selectionReasons.map((reason) => {
              const meta = reasonMeta(reason);
              return (
                <div
                  key={reason}
                  className="flex items-start gap-3 p-3 rounded-xl bg-obsidian-dark/40 border border-card-border/30"
                >
                  <span className="mt-0.5 shrink-0">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{meta.label}</div>
                    {meta.description && (
                      <div className="text-xs text-text-secondary mt-0.5">
                        {meta.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
