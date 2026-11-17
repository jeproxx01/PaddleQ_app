'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { db } from '@/db/db';
import { useSessionBoard } from '@/features/session/useSessionBoard';
import { useSessionId } from '@/features/layout/SessionContext';
import { PaddleRack } from '@/features/queue/PaddleRack';
import { CourtCallModal } from '@/features/courts/CourtCallModal';
import { dispatchStack } from '@/features/dispatch/dispatchEngine';
import { announceCourtAssignments, type CourtCall } from '@/shared/audio';
import type { StackWithPlayers } from '@/features/queue/queueService';

export default function QueuePage() {
  const sessionId = useSessionId();
  const { session, stacks, calls, loading, refresh } = useSessionBoard(sessionId);
  const [callIndex, setCallIndex] = useState(0);
  const [manualCall, setManualCall] = useState<CourtCall | null>(null);
  const [prevCalls, setPrevCalls] = useState(calls);
  if (prevCalls !== calls) {
    setPrevCalls(calls);
    setCallIndex(0);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-volt font-mono">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading queue…
      </div>
    );
  }

  if (!session) {
    return <div className="p-8 text-text-secondary">Session not found.</div>;
  }

  const handleStartStack = async (stack: StackWithPlayers) => {
    const match = await dispatchStack(sessionId, stack.id);
    if (!match) {
      await refresh();
      return;
    }

    const court = await db.courts.get(match.courtId);
    const players = await db.players.where('id').anyOf(match.playerIds).toArray();
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const call: CourtCall = {
      id: match.id,
      courtNumber: court?.courtNumber ?? 0,
      playerNames: match.playerIds.map((id) => playerMap.get(id)?.name ?? 'Player'),
    };

    if (session.audioEnabled) {
      announceCourtAssignments([call]);
    }
    setManualCall(call);
    await refresh();
  };

  return (
    <div className="p-6">
      <PaddleRack
        sessionId={sessionId}
        stacks={stacks}
        onQueueUpdated={refresh}
        onStartStack={handleStartStack}
      />

      {calls.length > 0 && callIndex < calls.length && (
        <CourtCallModal
          courtNumber={calls[callIndex].courtNumber}
          playerNames={calls[callIndex].playerNames}
          onDismiss={() => setCallIndex((i) => i + 1)}
        />
      )}

      {manualCall && (
        <CourtCallModal
          courtNumber={manualCall.courtNumber}
          playerNames={manualCall.playerNames}
          onDismiss={() => setManualCall(null)}
        />
      )}
    </div>
  );
}
