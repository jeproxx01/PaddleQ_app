'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Users } from 'lucide-react';
import { db, type Session } from '@/db/db';
import { transitionToLive } from '@/features/session/sessionService';
import { getWaitingStacksWithPlayers, type StackWithPlayers } from '@/features/queue/queueService';
import { useSessionId } from '@/features/layout/SessionContext';
import { GAME_MODE_LABELS } from '@/shared/display';

export default function LobbyPage() {
  const sessionId = useSessionId();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [stacks, setStacks] = useState<StackWithPlayers[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    db.sessions.get(sessionId).then((s) => setSession(s ?? null));
    getWaitingStacksWithPlayers(sessionId).then(setStacks);
  }, [sessionId]);

  if (!session) {
    return <div className="p-8 text-text-secondary">Loading…</div>;
  }

  const totalPlayers = stacks.reduce((n, s) => n + s.playerIds.length, 0);
  const capacity = session.courtCount * 4;
  const progress = Math.min(100, (totalPlayers / Math.max(1, capacity)) * 100);

  const handleStart = async () => {
    await transitionToLive(sessionId);
    router.push(`/sessions/${sessionId}`);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {session.courtCount} courts · {GAME_MODE_LABELS[session.gameMode]} · PIN {session.pin}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-tangerine/15 text-tangerine border border-tangerine/30 text-xs font-mono">
          Not started
        </span>
      </div>

      <div className="mt-8 p-6 rounded-2xl bg-card-surface border border-card-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Players ready</h2>
            <p className="text-sm text-text-secondary mt-1">
              {totalPlayers} of {capacity} spots filled
            </p>
          </div>
          <button
            type="button"
            onClick={handleStart}
            className="h-14 px-6 rounded-xl bg-volt text-obsidian-dark font-extrabold flex items-center gap-2 hover:bg-volt-hover transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            Start session →
          </button>
        </div>

        <div className="mt-4 h-2 rounded-full bg-obsidian-dark overflow-hidden">
          <div className="h-full bg-volt transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6">
          {stacks.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-card-border text-center">
              <Users className="w-10 h-10 text-text-secondary/50 mx-auto mb-2" />
              <p className="text-sm text-text-secondary">No players yet.</p>
              <Link
                href={`/sessions/${sessionId}/queue`}
                className="inline-block mt-3 px-4 py-2 rounded-lg bg-obsidian-dark border border-card-border text-sm text-volt hover:border-volt/50"
              >
                Add players →
              </Link>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {stacks.flatMap((s) => s.players).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-dark/60 border border-card-border/50"
                >
                  <span className="font-semibold text-sm">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
