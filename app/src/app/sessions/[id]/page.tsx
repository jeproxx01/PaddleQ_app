'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, Activity, RefreshCw, Users } from 'lucide-react';
import { endSession } from '@/features/session/sessionService';
import { useSessionBoard } from '@/features/session/useSessionBoard';
import { useSessionId } from '@/features/layout/SessionContext';
import { CourtGrid } from '@/features/courts/CourtGrid';
import { CourtCallModal } from '@/features/courts/CourtCallModal';
import { WhyTheseFourModal } from '@/features/dispatch/WhyTheseFourModal';
import { ScorekeeperModal } from '@/features/scoring/ScorekeeperModal';
import { TournamentLeaderboard } from '@/features/tournament/TournamentLeaderboard';
import { GAME_MODE_LABELS } from '@/shared/display';
import type { CourtWithMatch } from '@/features/courts/courtService';

export default function CourtsPage() {
  const router = useRouter();
  const sessionId = useSessionId();

  const { session, courts, stacks, calls, loading, refresh } = useSessionBoard(sessionId);
  const [whyTheseFourCourt, setWhyTheseFourCourt] = useState<CourtWithMatch | null>(null);
  const [scoreCourt, setScoreCourt] = useState<CourtWithMatch | null>(null);
  const [callIndex, setCallIndex] = useState(0);
  const [prevCalls, setPrevCalls] = useState(calls);
  if (prevCalls !== calls) {
    setPrevCalls(calls);
    setCallIndex(0);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-volt font-mono">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading courts…
      </div>
    );
  }

  if (!session) {
    return <div className="p-8 text-text-secondary">Session not found.</div>;
  }

  const handleEndSession = async () => {
    await endSession(session.id);
    router.push('/');
  };

  const waitingPlayers = stacks.reduce((n, s) => n + s.playerIds.length, 0);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-card-border bg-card-surface/70 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">{session.name}</h1>
          <span className="px-2.5 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/30 text-xs font-mono">
            {session.status === 'live' ? 'Live' : 'Lobby'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-dark border border-card-border">
            <Activity className="w-4 h-4 text-volt" />
            <span className="text-text-secondary">Courts:</span>
            <span className="font-mono font-bold">{session.courtCount}</span>
          </span>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-dark border border-card-border">
            <span className="text-text-secondary">Mode:</span>
            <span className="font-semibold">{GAME_MODE_LABELS[session.gameMode]}</span>
          </span>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-dark border border-card-border">
            {session.audioEnabled ? (
              <Volume2 className="w-4 h-4 text-volt" />
            ) : (
              <VolumeX className="w-4 h-4 text-text-secondary" />
            )}
            <span className={session.audioEnabled ? 'text-volt' : 'text-text-secondary'}>
              {session.audioEnabled ? 'Audio Live' : 'Muted'}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleEndSession}
          className="h-10 px-4 rounded-lg bg-obsidian-dark border border-card-border text-xs font-semibold text-text-secondary hover:text-white"
        >
          End Session
        </button>
      </header>

      {/* Board */}
      <main className="flex-1 p-6 flex flex-col gap-6">
        {session.gameMode === 'winner-takes-all-round-robin' && (
          <TournamentLeaderboard sessionId={session.id} />
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            Active Courts ({courts.length})
          </h2>
          <Link
            href={`/sessions/${sessionId}/queue`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-obsidian-dark border border-card-border text-sm text-white hover:border-volt/50"
          >
            <Users className="w-4 h-4 text-volt" />
            Queue ({waitingPlayers} waiting)
          </Link>
        </div>

        <CourtGrid
          courts={courts}
          onWhyTheseFour={setWhyTheseFourCourt}
          onRecordScore={setScoreCourt}
        />
      </main>

      {whyTheseFourCourt && (
        <WhyTheseFourModal court={whyTheseFourCourt} onClose={() => setWhyTheseFourCourt(null)} />
      )}

      {scoreCourt && (
        <ScorekeeperModal
          court={scoreCourt}
          sessionId={sessionId}
          onClose={() => setScoreCourt(null)}
          onScored={refresh}
        />
      )}

      {calls.length > 0 && callIndex < calls.length && (
        <CourtCallModal
          courtNumber={calls[callIndex].courtNumber}
          playerNames={calls[callIndex].playerNames}
          onDismiss={() => setCallIndex((i) => i + 1)}
        />
      )}
    </div>
  );
}
