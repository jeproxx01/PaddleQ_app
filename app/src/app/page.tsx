'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Sparkles, Zap, Radio, Trophy, ListOrdered, ArrowRight, LayoutGrid } from 'lucide-react';
import { db, type Session } from '@/db/db';
import { GAME_MODE_LABELS } from '@/shared/display';

export default function LandingPage() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [waitingCount, setWaitingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const all = await db.sessions.toArray();
        all.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
        const current = all.find((s) => s.status === 'live' || s.status === 'lobby');
        if (!isMounted) return;
        setActiveSession(current ?? null);
        setRecentSessions(all.slice(0, 4));

        if (current) {
          const stacks = await db.stacks.where('sessionId').equals(current.id).toArray();
          const waiting = stacks.reduce((sum, s) => sum + s.playerIds.length, 0);
          if (isMounted) setWaitingCount(waiting);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-obsidian-dark text-white flex flex-col">
      {/* Top nav */}
      <header className="h-20 border-b border-card-border bg-card-surface/70 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-volt animate-pulse" />
          <h1 className="text-2xl font-black tracking-tight">
            Paddle<span className="text-volt">Q</span>
          </h1>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          <span className="hover:text-white cursor-pointer">Offline-first</span>
          <span className="hover:text-white cursor-pointer">Local Kiosk</span>
        </nav>
        <div className="flex items-center gap-3">
          {activeSession && (
            <Link
              href={`/sessions/${activeSession.id}`}
              className="h-11 px-5 rounded-xl bg-volt text-obsidian-dark font-bold flex items-center gap-2 hover:bg-volt-hover transition-colors shadow-lg shadow-volt/20"
            >
              Resume session →
            </Link>
          )}
          <Link
            href="/sessions/new"
            className={`h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-colors ${
              activeSession
                ? 'bg-card-surface border border-card-border text-white hover:border-volt/50'
                : 'bg-volt text-obsidian-dark hover:bg-volt-hover'
            }`}
          >
            {activeSession ? '+ New session' : 'Start →'}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto px-6 py-12 items-center">
        <div>
          {/* Active session banner if one exists */}
          {activeSession && (
            <div className="mb-6 p-5 rounded-2xl bg-volt/10 border border-volt/30 shadow-xl shadow-volt/5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-volt flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-volt animate-ping" />
                  Active session in progress
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-volt/20 text-volt text-xs font-mono font-bold">
                  {activeSession.status === 'live' ? 'Live' : 'Lobby'}
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white mb-1">
                {activeSession.name}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {activeSession.courtCount} Courts · {GAME_MODE_LABELS[activeSession.gameMode]}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/sessions/${activeSession.id}`}
                  className="h-11 px-5 rounded-xl bg-volt text-obsidian-dark font-bold text-sm flex items-center gap-2 hover:bg-volt-hover transition-all"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Courts dashboard →
                </Link>
                <Link
                  href={`/sessions/${activeSession.id}/queue`}
                  className="h-11 px-5 rounded-xl bg-card-surface border border-card-border hover:border-volt/50 text-white font-semibold text-sm flex items-center gap-2 transition-all"
                >
                  <ListOrdered className="w-4 h-4 text-volt" />
                  Go to Queue ({waitingCount} waiting)
                </Link>
              </div>
            </div>
          )}

          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Pickleball court
            <br />
            queue management.
          </h2>
          <p className="text-lg text-text-secondary mt-4 max-w-md">
            Less waiting. More playing. Create your session, organize your players,
            and keep every court moving — no account, no internet needed.
          </p>

          <div className="flex items-center gap-3 mt-8">
            <Link
              href="/sessions/new"
              className="h-14 px-6 rounded-xl bg-volt text-obsidian-dark font-extrabold text-base flex items-center gap-2 shadow-lg shadow-volt/20 hover:bg-volt-hover transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              {activeSession ? 'Start another session →' : 'Start a session →'}
            </Link>
          </div>
        </div>

        {/* Live session preview showcase or active session card */}
        <div className="rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold">
              {activeSession ? 'Current Session Status' : 'Live session preview'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/30 text-xs font-mono">
              {activeSession ? (activeSession.status === 'live' ? 'Live' : 'Lobby') : 'Live'}
            </span>
          </div>

          {activeSession ? (
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan">
                    <Radio className="w-3.5 h-3.5" /> {activeSession.courtCount} Courts Active
                  </div>
                  <Link
                    href={`/sessions/${activeSession.id}`}
                    className="text-xs text-volt hover:underline flex items-center gap-1"
                  >
                    Open Courts <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="text-base font-semibold">{activeSession.name}</div>
                <div className="text-xs text-text-secondary mt-1">
                  Mode: {GAME_MODE_LABELS[activeSession.gameMode]}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/sessions/${activeSession.id}/queue`}
                  className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border hover:border-volt/40 transition-colors block"
                >
                  <div className="flex items-center gap-2 text-xs font-mono text-volt mb-2">
                    <Zap className="w-3.5 h-3.5" /> Queue
                  </div>
                  <div className="text-sm font-semibold">{waitingCount} players waiting</div>
                  <div className="text-[11px] text-text-secondary mt-1">Click to open queue →</div>
                </Link>

                <Link
                  href={`/sessions/${activeSession.id}/summary`}
                  className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border hover:border-tangerine/40 transition-colors block"
                >
                  <div className="flex items-center gap-2 text-xs font-mono text-tangerine mb-2">
                    <Trophy className="w-3.5 h-3.5" /> Summary
                  </div>
                  <div className="text-sm font-semibold">Stats &amp; export</div>
                  <div className="text-[11px] text-text-secondary mt-1">View recap →</div>
                </Link>
              </div>

              {recentSessions.length > 1 && (
                <div className="mt-4 pt-4 border-t border-card-border">
                  <span className="text-xs font-mono text-text-secondary uppercase tracking-wider block mb-2">
                    All Local Sessions
                  </span>
                  <div className="flex flex-col gap-2">
                    {recentSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-obsidian-dark/40 border border-card-border"
                      >
                        <div className="truncate mr-2">
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-text-secondary ml-2">({s.status})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/sessions/${s.id}/queue`}
                            className="text-text-secondary hover:text-white"
                          >
                            Queue
                          </Link>
                          <Link
                            href={`/sessions/${s.id}`}
                            className="text-volt hover:underline font-bold"
                          >
                            Open →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan mb-2">
                  <Radio className="w-3.5 h-3.5" /> Court 1 · In play
                </div>
                <div className="text-sm font-semibold">Alex &amp; Dana</div>
                <div className="text-[11px] text-text-secondary">vs Sam &amp; Priya</div>
              </div>
              <div className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border">
                <div className="flex items-center gap-2 text-xs font-mono text-text-secondary mb-2">
                  <Radio className="w-3.5 h-3.5" /> Court 2 · Open
                </div>
                <div className="text-sm text-text-secondary">Next foursome auto-dispatches</div>
              </div>
              <div className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border">
                <div className="flex items-center gap-2 text-xs font-mono text-volt mb-2">
                  <Zap className="w-3.5 h-3.5" /> Queue
                </div>
                <div className="text-sm font-semibold">12 players waiting</div>
              </div>
              <div className="p-4 rounded-xl bg-obsidian-dark/70 border border-card-border">
                <div className="flex items-center gap-2 text-xs font-mono text-tangerine mb-2">
                  <Trophy className="w-3.5 h-3.5" /> Winner
                </div>
                <div className="text-sm font-semibold">Recap &amp; export</div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-volt" />
            Offline-first · local network · no account
          </div>
        </div>
      </main>
    </div>
  );
}
