'use client';

import React from 'react';
import { Tv, ListOrdered, Trophy } from 'lucide-react';
import { useSessionId } from '@/features/layout/SessionContext';
import { useBroadcast } from '@/features/show/useBroadcast';
import { BroadcastCourtGrid } from '@/features/show/BroadcastCourtGrid';
import { RecentResultsPanel } from '@/features/show/RecentResultsPanel';
import { WaitingLinePanel } from '@/features/show/WaitingLinePanel';
import { WinnerFlash } from '@/features/show/WinnerFlash';
import { TournamentLeaderboard } from '@/features/tournament/TournamentLeaderboard';
import { GAME_MODE_LABELS } from '@/shared/display';

/**
 * TV Broadcast Screen — `/sessions/[id]/show`
 *
 * A full-screen, read-only mirror of the Kiosk's live session state optimised
 * for large screens and viewing distance. Renders without sidebar chrome and
 * ignores all input (no buttons, no touch targets). State updates flow from
 * the same IndexedDB store so the TV reflects the Kiosk without a network hop.
 *
 * Layout (landscape TV):
 * ┌──────────────────────────────────────────────┐
 * │  Header: session name, live badge, mode      │
 * ├──────────────────────┬───────────────────────┤
 * │                      │  Next Games           │
 * │  Live Court Grid     │  (waiting line)       │
 * │                      ├───────────────────────┤
 * │                      │  Recent Results       │
 * └──────────────────────┴───────────────────────┘
 */

export default function ShowPage() {
  const sessionId = useSessionId();
  const {
    session,
    courts,
    stacks,
    loading,
    recentResults,
    nextGames,
    winnerEvent,
    dismissWinner,
  } = useBroadcast(sessionId);

  if (loading || !session) {
    return (
      <div className="h-screen bg-obsidian-dark flex items-center justify-center text-volt font-mono text-xl">
        <Tv className="w-8 h-8 mr-3 animate-pulse" />
        Loading Broadcast…
      </div>
    );
  }

  const waitingPlayerCount = stacks.reduce(
    (sum, s) => sum + s.playerIds.length,
    0
  );

  return (
    <div className="min-h-screen bg-obsidian-dark text-white p-6 lg:p-8 flex flex-col select-none pointer-events-none">
      {/* Broadcast Header */}
      <div className="flex items-center justify-between pb-5 border-b border-card-border mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-volt/10 border border-volt/30 text-volt">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
              {session.name}
            </h1>
            <p className="text-sm text-text-secondary flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live Broadcast • {GAME_MODE_LABELS[session.gameMode]}
            </p>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-card-surface border border-card-border text-sm font-mono">
            <span className="text-text-secondary">Courts: </span>
            <span className="font-bold text-white">{session.courtCount}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-card-surface border border-card-border text-sm font-mono">
            <span className="text-text-secondary">Waiting: </span>
            <span className="font-bold text-volt">{waitingPlayerCount}</span>
          </div>
        </div>
      </div>

      {/* Tournament leaderboard (Winner Takes All only) */}
      {session.gameMode === 'winner-takes-all-round-robin' && (
        <div className="mb-6">
          <TournamentLeaderboard sessionId={session.id} />
        </div>
      )}

      {/* Main Content: Courts + Side Panels */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Live Court Grid (takes ~65% width) */}
        <div className="flex-[2] min-w-0 flex flex-col">
          <h2 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
            Courts in Play
            <span className="text-sm font-mono text-cyan">
              ({courts.filter((c) => c.status === 'in_play').length} active)
            </span>
          </h2>
          <BroadcastCourtGrid courts={courts} />
        </div>

        {/* Right: Side Panels (takes ~35% width) */}
        <div className="flex-1 min-w-[280px] max-w-[400px] flex flex-col gap-6 overflow-y-auto">
          {/* Next Games */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white mb-3 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-volt" />
              Next Games
            </h2>
            <WaitingLinePanel nextGames={nextGames} />
          </div>

          {/* Recent Results */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-tangerine" />
              Recent Results
            </h2>
            <RecentResultsPanel results={recentResults} />
          </div>
        </div>
      </div>

      {/* Winner Flash Overlay */}
      {winnerEvent && (
        <WinnerFlash
          courtNumber={winnerEvent.courtNumber}
          winnerNames={winnerEvent.winnerNames}
          onDismiss={dismissWinner}
        />
      )}
    </div>
  );
}
