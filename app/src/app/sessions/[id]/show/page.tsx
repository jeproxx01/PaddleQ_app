'use client';

import React from 'react';
import { useSessionId } from '@/features/layout/SessionContext';
import { useSessionBoard } from '@/features/session/useSessionBoard';
import { CourtGrid } from '@/features/courts/CourtGrid';
import { TournamentLeaderboard } from '@/features/tournament/TournamentLeaderboard';
import { GAME_MODE_LABELS } from '@/shared/display';
import { Tv } from 'lucide-react';

export default function ShowPage() {
  const sessionId = useSessionId();
  const { session, courts, loading } = useSessionBoard(sessionId);

  if (loading || !session) {
    return (
      <div className="h-screen bg-obsidian-dark flex items-center justify-center text-volt font-mono text-xl">
        Loading Broadcast...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-dark text-white p-8 flex flex-col">
      {/* Broadcast Header */}
      <div className="flex items-center justify-between pb-6 border-b border-card-border mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-volt/10 border border-volt/30 text-volt">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{session.name}</h1>
            <p className="text-sm text-text-secondary flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live Broadcast • {GAME_MODE_LABELS[session.gameMode]}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-8">
        {session.gameMode === 'winner-takes-all-round-robin' && (
          <TournamentLeaderboard sessionId={session.id} />
        )}

        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-4">
            Courts in Play
          </h2>
          <CourtGrid courts={courts} />
        </div>
      </div>
    </div>
  );
}
