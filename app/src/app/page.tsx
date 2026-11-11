'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Sparkles, Zap, Radio, Trophy } from 'lucide-react';
import { startSession } from '../features/session/sessionService';
import { seedDemoPlayers } from '../features/admin/adminService';

export default function LandingPage() {
  const router = useRouter();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleDemo = async () => {
    setLoadingDemo(true);
    try {
      const session = await startSession({ name: 'Demo Session', courtCount: 4 });
      await seedDemoPlayers(session.id);
      router.push(`/sessions/${session.id}/lobby`);
    } catch (err) {
      console.error('Failed to start demo:', err);
      setLoadingDemo(false);
    }
  };

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
          <span className="hover:text-white cursor-pointer">How it works</span>
          <span className="hover:text-white cursor-pointer">Features</span>
        </nav>
        <Link
          href="/sessions/new"
          className="h-11 px-5 rounded-xl bg-volt text-obsidian-dark font-bold flex items-center gap-2 hover:bg-volt-hover transition-colors"
        >
          Start →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto px-6 py-16 items-center">
        <div>
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
              Start a session →
            </Link>
            <button
              type="button"
              onClick={handleDemo}
              disabled={loadingDemo}
              className="h-14 px-6 rounded-xl border border-card-border bg-obsidian-dark text-white font-bold text-base hover:border-volt/50 transition-all disabled:opacity-50"
            >
              {loadingDemo ? 'Loading demo…' : 'Try demo'}
            </button>
          </div>
        </div>

        {/* Live preview showcase */}
        <div className="rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold">Live session preview</span>
            <span className="px-2.5 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/30 text-xs font-mono">
              Live
            </span>
          </div>
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
          <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-volt" />
            Offline-first · local network · no account
          </div>
        </div>
      </main>
    </div>
  );
}
