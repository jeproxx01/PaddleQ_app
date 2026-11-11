'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, type Match, type Session } from '../../db/db';
import { runAutoDispatch } from '../dispatch/dispatchEngine';
import { getCourtsWithMatches, type CourtWithMatch } from '../courts/courtService';
import { getWaitingStacksWithPlayers, type StackWithPlayers } from '../queue/queueService';
import { announceCourtAssignments, type CourtCall } from '../../shared/audio';

/**
 * Loads the live session board (courts + waiting queue) and runs auto-dispatch.
 * Shared by the courts view and the queue view. Newly dispatched matches are
 * announced (audio) and surfaced as `calls` for the full-screen court-call flash.
 */
export function useSessionBoard(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [courts, setCourts] = useState<CourtWithMatch[]>([]);
  const [stacks, setStacks] = useState<StackWithPlayers[]>([]);
  const [calls, setCalls] = useState<CourtCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await db.sessions.get(sessionId);
      if (!current) {
        setSession(null);
        setCourts([]);
        setStacks([]);
        setCalls([]);
        return;
      }
      setSession(current);

      // Automatically dispatch waiting players into any Open courts, but only when
      // Auto-fill is enabled — otherwise the organizer starts full stacks manually.
      const MAX_DISPATCH_ROUNDS = 12;
      const dispatchedMatches: Match[] = [];
      if (current.autoFill) {
        for (let i = 0; i < MAX_DISPATCH_ROUNDS; i++) {
          const dispatched = await runAutoDispatch(sessionId);
          if (dispatched.length === 0) break;
          dispatchedMatches.push(...dispatched);
        }
      }

      // Build court-call records for newly dispatched matches.
      const newCalls: CourtCall[] = [];
      for (const match of dispatchedMatches) {
        const court = await db.courts.get(match.courtId);
        const players = await db.players.where('id').anyOf(match.playerIds).toArray();
        const playerMap = new Map(players.map((p) => [p.id, p]));
        newCalls.push({
          id: match.id,
          courtNumber: court?.courtNumber ?? 0,
          playerNames: match.playerIds.map((id) => playerMap.get(id)?.name ?? 'Player'),
        });
      }
      setCalls(newCalls);
      if (current.audioEnabled && newCalls.length > 0) {
        announceCourtAssignments(newCalls);
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

  return { session, courts, stacks, calls, loading, refresh };
}
