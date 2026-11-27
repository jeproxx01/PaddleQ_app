'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionBoard } from '../session/useSessionBoard';
import {
  getRecentResults,
  getNextGames,
  type RecentResult,
  type NextGame,
} from './broadcastService';

/**
 * Extends `useSessionBoard` with broadcast-specific data: recent results,
 * next games waiting line, and winner flash events. Auto-refreshes on a
 * configurable interval so the TV mirrors the Kiosk in near-real-time.
 */

export interface WinnerEvent {
  id: string;
  courtNumber: number;
  winnerNames: string[];
}

export function useBroadcast(sessionId: string, refreshIntervalMs = 3000) {
  const board = useSessionBoard(sessionId);
  const { refresh: refreshBoard, courts, stacks } = board;
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [nextGames, setNextGames] = useState<NextGame[]>([]);
  const [winnerEvent, setWinnerEvent] = useState<WinnerEvent | null>(null);

  // Track previously seen completed match IDs to detect new winners
  const seenMatchIds = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Refresh broadcast data whenever the board refreshes, and on interval
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getRecentResults(sessionId, 5),
      getNextGames(sessionId, 8),
    ]).then(([results, games]) => {
      if (cancelled) return;

      if (!initializedRef.current) {
        for (const r of results) {
          seenMatchIds.current.add(r.matchId);
        }
        initializedRef.current = true;
      } else {
        for (const result of results) {
          if (!seenMatchIds.current.has(result.matchId)) {
            seenMatchIds.current.add(result.matchId);
            const winnerNames =
              result.winningTeam === 1 ? result.team1Names : result.team2Names;
            setWinnerEvent({
              id: result.matchId,
              courtNumber: result.courtNumber,
              winnerNames,
            });
          }
        }
      }

      setRecentResults(results);
      setNextGames(games);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, courts, stacks]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshBoard();
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshBoard, refreshIntervalMs]);

  const dismissWinner = useCallback(() => {
    setWinnerEvent(null);
  }, []);

  return {
    ...board,
    recentResults,
    nextGames,
    winnerEvent,
    dismissWinner,
  };
}
