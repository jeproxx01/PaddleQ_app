'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, type Session } from '../../db/db';
import { runAutoDispatch } from '../dispatch/dispatchEngine';
import { getCourtsWithMatches, type CourtWithMatch } from '../courts/courtService';
import { getWaitingStacksWithPlayers, type StackWithPlayers } from '../queue/queueService';

/**
 * Loads the live session board (courts + waiting queue) and runs auto-dispatch.
 * Shared by the courts view and the queue view.
 */
export function useSessionBoard(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [courts, setCourts] = useState<CourtWithMatch[]>([]);
  const [stacks, setStacks] = useState<StackWithPlayers[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await db.sessions.get(sessionId);
      if (!current) {
        setSession(null);
        setCourts([]);
        setStacks([]);
        return;
      }
      setSession(current);

      // Automatically dispatch waiting players into any Open courts.
      const MAX_DISPATCH_ROUNDS = 12;
      for (let i = 0; i < MAX_DISPATCH_ROUNDS; i++) {
        const dispatched = await runAutoDispatch(sessionId);
        if (dispatched.length === 0) break;
      }

      setCourts(await getCourtsWithMatches(sessionId));
      setStacks(await getWaitingStacksWithPlayers(sessionId));
    } catch (err) {
      console.error('Failed to load session board:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { session, courts, stacks, loading, refresh };
}
