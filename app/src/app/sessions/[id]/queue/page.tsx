'use client';

import { RefreshCw } from 'lucide-react';
import { useSessionBoard } from '@/features/session/useSessionBoard';
import { useSessionId } from '@/features/layout/SessionContext';
import { PaddleRack } from '@/features/queue/PaddleRack';

export default function QueuePage() {
  const sessionId = useSessionId();
  const { session, stacks, loading, refresh } = useSessionBoard(sessionId);

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
    </div>
  );
}
