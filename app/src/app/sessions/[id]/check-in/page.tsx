'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  Clock,
  Users,
  Trophy,
  Coffee,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/db/db';
import { useSessionId } from '@/features/layout/SessionContext';
import {
  lookupPlayerStatus,
  getAllSessionPlayersForLookup,
  type PlayerQueueStatus,
} from '@/features/checkin/checkInLookupService';

export default function CheckInPage() {
  const sessionId = useSessionId();

  const storageKey = `pickleq_checkin_player_${sessionId}`;

  const [sessionName, setSessionName] = useState<string>('');
  const [allPlayers, setAllPlayers] = useState<{ id: string; name: string }[]>([]);
  const [playerNameInput, setPlayerNameInput] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(`pickleq_checkin_player_${sessionId}`) || '';
    }
    return '';
  });
  const [activePlayerName, setActivePlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(`pickleq_checkin_player_${sessionId}`) || '';
    }
    return '';
  });
  const [status, setStatus] = useState<PlayerQueueStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initial load: get session info and roster
  useEffect(() => {
    db.sessions.get(sessionId).then((s) => {
      if (s) setSessionName(s.name);
    });

    getAllSessionPlayersForLookup(sessionId).then((list) => {
      setAllPlayers(list);
    });
  }, [sessionId]);

  // Lookup player status
  const refreshStatus = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setIsRefreshing(true);
    try {
      const res = await lookupPlayerStatus(sessionId, name);
      setStatus(res);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [sessionId]);

  // Auto-refresh active player status periodically and on name change
  useEffect(() => {
    if (!activePlayerName) return;
    let cancelled = false;

    void lookupPlayerStatus(sessionId, activePlayerName).then((res) => {
      if (!cancelled) {
        setStatus(res);
        setLastUpdated(new Date());
      }
    });

    const interval = setInterval(() => {
      void lookupPlayerStatus(sessionId, activePlayerName).then((res) => {
        if (!cancelled) {
          setStatus(res);
          setLastUpdated(new Date());
        }
      });
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activePlayerName, sessionId]);

  const handleSelectPlayer = (name: string) => {
    setActivePlayerName(name);
    setPlayerNameInput(name);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, name);
    }
  };

  const handleClearPlayer = () => {
    setActivePlayerName('');
    setStatus(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-dark text-white p-4 max-w-md mx-auto flex flex-col justify-between">
      {/* Top Banner */}
      <div>
        <header className="flex items-center justify-between pb-4 border-b border-card-border mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-volt/10 text-volt border border-volt/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Queue Status</h1>
              <p className="text-xs text-text-secondary truncate max-w-[180px]">
                {sessionName || 'PickleQ Session'}
              </p>
            </div>
          </div>

          {activePlayerName && (
            <button
              type="button"
              onClick={() => void refreshStatus(activePlayerName)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-card-surface border border-card-border text-text-secondary hover:text-white transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-volt' : ''}`} />
            </button>
          )}
        </header>

        {/* Player Selector if not selected */}
        {!activePlayerName ? (
          <div className="space-y-4 p-5 rounded-2xl bg-card-surface border border-card-border">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-white">Who are you?</h2>
              <p className="text-xs text-text-secondary">
                Select or enter your name to track your spot in line.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Type your name..."
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerNameInput.trim()) {
                    handleSelectPlayer(playerNameInput.trim());
                  }
                }}
                className="w-full h-12 rounded-xl bg-obsidian-dark border border-card-border px-4 text-sm text-white focus:outline-none focus:border-volt"
              />
              <button
                type="button"
                onClick={() => {
                  if (playerNameInput.trim()) {
                    handleSelectPlayer(playerNameInput.trim());
                  }
                }}
                disabled={!playerNameInput.trim()}
                className="absolute right-2 top-2 h-8 px-3 rounded-lg bg-volt text-obsidian-dark font-bold text-xs flex items-center gap-1 disabled:opacity-40"
              >
                Track <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Roster List */}
            {allPlayers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-card-border/50">
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Search className="w-3 h-3" /> Select from roster
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {allPlayers
                    .filter((p) =>
                      p.name.toLowerCase().includes(playerNameInput.toLowerCase())
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPlayer(p.name)}
                        className="p-2.5 rounded-lg bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-semibold text-left truncate text-white"
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Live Status Card */
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-text-secondary">
                Tracking for: <span className="font-bold text-white text-sm">{activePlayerName}</span>
              </p>
              <button
                type="button"
                onClick={handleClearPlayer}
                className="text-xs text-volt hover:underline"
              >
                Switch Player
              </button>
            </div>

            {status && (
              <>
                {/* 1. Playing on Court */}
                {status.status === 'in_play' && (
                  <div className="p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/80 text-center space-y-3 shadow-lg shadow-emerald-500/10">
                    <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400">
                      <Trophy className="w-8 h-8 animate-bounce" />
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-xs font-bold uppercase tracking-wider">
                        Live Match
                      </span>
                      <h2 className="text-3xl font-black text-white mt-2">
                        Court {status.courtNumber}
                      </h2>
                      <p className="text-sm text-emerald-200 mt-1">
                        You have been called to court! Head out and play.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Waiting in Queue */}
                {status.status === 'waiting' && (
                  <div className="p-6 rounded-2xl bg-card-surface border border-card-border text-center space-y-5 shadow-lg">
                    {/* Position Badge */}
                    <div>
                      {status.queuePosition === 1 ? (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-volt/20 text-volt border border-volt/50 font-mono font-bold text-sm uppercase">
                          <span className="w-2.5 h-2.5 rounded-full bg-volt animate-ping" />
                          #1 Next Up
                        </div>
                      ) : status.queuePosition === 2 ? (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tangerine/20 text-tangerine border border-tangerine/50 font-mono font-bold text-sm uppercase">
                          #2 On Deck
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-obsidian-dark text-white border border-card-border font-mono font-bold text-sm">
                          #{status.queuePosition} In Line
                        </div>
                      )}

                      <h2 className="text-4xl font-black text-white tracking-tight mt-3">
                        {status.queuePosition === 1 ? 'Get Ready!' : `Position #${status.queuePosition}`}
                      </h2>
                      <p className="text-xs text-text-secondary mt-1">
                        {status.queuePosition === 1
                          ? 'You will be dispatched as soon as a court opens.'
                          : 'Listen for your vocal announcement or watch the screen.'}
                      </p>
                    </div>

                    {/* Wait Metrics */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-card-border">
                      <div className="p-3 rounded-xl bg-obsidian-dark border border-card-border">
                        <Clock className="w-4 h-4 text-cyan mx-auto mb-1" />
                        <p className="text-lg font-bold font-mono text-white">
                          ~{status.estimatedWaitMinutes} min
                        </p>
                        <p className="text-[10px] text-text-secondary">Est. Wait</p>
                      </div>

                      <div className="p-3 rounded-xl bg-obsidian-dark border border-card-border">
                        <Users className="w-4 h-4 text-volt mx-auto mb-1" />
                        <p className="text-lg font-bold font-mono text-white">
                          {status.totalWaitingStacks}
                        </p>
                        <p className="text-[10px] text-text-secondary">Waiting Stacks</p>
                      </div>
                    </div>

                    {status.pool && status.pool !== 'neutral' && (
                      <div className="pt-1">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-card-surface border border-card-border text-cyan">
                          {status.pool === 'winners' ? 'Winners Pool' : 'Losers Pool'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Ready but not yet queued */}
                {status.status === 'ready_not_queued' && (
                  <div className="p-6 rounded-2xl bg-card-surface border border-card-border text-center space-y-3">
                    <CheckCircle2 className="w-8 h-8 text-volt mx-auto" />
                    <h2 className="text-xl font-bold text-white">Checked In</h2>
                    <p className="text-xs text-text-secondary">
                      You are checked in as ready. Tap &quot;+ Join&quot; on the tablet paddle rack to join a stack.
                    </p>
                  </div>
                )}

                {/* 4. Resting */}
                {status.status === 'resting' && (
                  <div className="p-6 rounded-2xl bg-card-surface border border-card-border text-center space-y-3">
                    <Coffee className="w-8 h-8 text-amber-400 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Resting</h2>
                    <p className="text-xs text-text-secondary">
                      You are currently resting. When you are ready to play again, let the organizer know at the kiosk.
                    </p>
                  </div>
                )}

                {/* 5. Not found / Not here */}
                {(status.status === 'not_found' || status.status === 'not_here') && (
                  <div className="p-6 rounded-2xl bg-card-surface border border-card-border text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Not In Queue</h2>
                    <p className="text-xs text-text-secondary">
                      &quot;{activePlayerName}&quot; is not yet queued for this session. Please check in at the venue kiosk.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 pt-4 border-t border-card-border/40 text-center text-[11px] text-text-secondary space-y-1">
        <p>Auto-refreshing every 4s • Local venue Wi-Fi</p>
        <p className="text-[10px] text-text-secondary/70">
          Last updated {lastUpdated.toLocaleTimeString()}
        </p>
      </footer>
    </div>
  );
}
