'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Shield, Activity, RefreshCw } from 'lucide-react';
import { Session } from '../db/db';
import { getActiveSession, endSession } from '../features/session/sessionService';
import { SessionLaunchModal } from '../features/session/SessionLaunchModal';
import { CourtWithMatch, getCourtsWithMatches } from '../features/courts/courtService';
import { CourtGrid } from '../features/courts/CourtGrid';

export default function KioskPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [courts, setCourts] = useState<CourtWithMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadActiveSession = useCallback(async () => {
    setLoading(true);
    try {
      const active = await getActiveSession();
      if (active) {
        setSession(active);
        const activeCourts = await getCourtsWithMatches(active.id);
        setCourts(activeCourts);
      } else {
        setSession(null);
        setCourts([]);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  const handleEndSession = async () => {
    if (!session) return;
    await endSession(session.id);
    await loadActiveSession();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-obsidian-dark text-white">
        <div className="flex items-center gap-3 text-lg font-mono text-volt">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Initializing PaddleQ Kiosk...
        </div>
      </div>
    );
  }

  if (!session) {
    return <SessionLaunchModal onSessionStarted={loadActiveSession} />;
  }

  return (
    <div className="min-h-screen bg-obsidian-dark text-white flex flex-col">
      {/* Kiosk Header */}
      <header className="h-20 border-b border-card-border bg-card-surface/70 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-volt animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              Paddle<span className="text-volt">Q</span>
            </h1>
          </div>
          <span className="text-xs uppercase tracking-wider font-mono px-2.5 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/30">
            Open-Play Kiosk
          </span>
        </div>

        {/* Center Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-dark border border-card-border text-sm">
            <Activity className="w-4 h-4 text-volt" />
            <span className="text-text-secondary">Courts:</span>
            <span className="font-mono font-bold text-white">{session.courtCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-dark border border-card-border text-sm">
            <span className="text-text-secondary">Mode:</span>
            <span className="font-semibold text-white">{session.rotationMode}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-obsidian-dark border border-card-border text-sm">
            {session.audioEnabled ? (
              <Volume2 className="w-4 h-4 text-volt" />
            ) : (
              <VolumeX className="w-4 h-4 text-text-secondary" />
            )}
            <span className={session.audioEnabled ? 'text-volt font-semibold' : 'text-text-secondary'}>
              {session.audioEnabled ? 'Audio Live' : 'Muted'}
            </span>
          </div>
        </div>

        {/* Right Admin Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndSession}
            className="h-10 px-4 rounded-lg bg-obsidian-dark hover:bg-card-border border border-card-border text-xs font-semibold text-text-secondary hover:text-white transition-colors"
          >
            End Session
          </button>
          <div className="p-2.5 rounded-lg bg-obsidian-dark border border-card-border text-text-secondary">
            <Shield className="w-5 h-5 text-volt" />
          </div>
        </div>
      </header>

      {/* Main Board Container */}
      <main className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Active Courts ({courts.length})
          </h2>
          <span className="text-xs text-text-secondary font-mono">
            Session ID: {session.id.slice(0, 8)}...
          </span>
        </div>

        {/* Dynamic Court Grid */}
        <CourtGrid courts={courts} />
      </main>
    </div>
  );
}
