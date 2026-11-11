'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSessionBoard } from '@/features/session/useSessionBoard';
import { useSessionId } from '@/features/layout/SessionContext';
import { PaddleRack } from '@/features/queue/PaddleRack';
import { CourtCallModal } from '@/features/courts/CourtCallModal';

export default function QueuePage() {
  const sessionId = useSessionId();
  const { session, stacks, calls, loading, refresh } = useSessionBoard(sessionId);
  const [callIndex, setCallIndex] = useState(0);

  useEffect(() => {
    setCallIndex(0);
  }, [calls]);

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

  return (
    <div className="p-6">
      <PaddleRack sessionId={sessionId} stacks={stacks} onQueueUpdated={refresh} />

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
