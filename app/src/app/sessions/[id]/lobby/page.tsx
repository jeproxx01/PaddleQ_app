'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Plus, UserCheck } from 'lucide-react';
import { db, type CheckInState, type Session, type SkillLevel } from '@/db/db';
import { transitionToLive } from '@/features/session/sessionService';
import { useSessionId } from '@/features/layout/SessionContext';
import { GAME_MODE_LABELS, SKILL_LEVEL_LABELS } from '@/shared/display';
import { getOrCreatePlayer } from '@/features/queue/queueService';
import {
  getOrCreateSessionPlayer,
  setCheckInState,
  getSessionPlayersWithDetails,
  getRosterCounts,
  type SessionPlayerWithDetails,
} from '@/features/lobby/checkInService';

const TABS: { key: 'all' | CheckInState; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'not_here', label: 'Not here' },
  { key: 'ready', label: 'Ready' },
  { key: 'resting', label: 'Resting' },
];

const NEXT_STATE: Record<CheckInState, CheckInState> = {
  not_here: 'ready',
  ready: 'resting',
  resting: 'not_here',
};

const STATE_LABEL: Record<CheckInState, string> = {
  not_here: 'Not here',
  ready: 'Ready',
  resting: 'Resting',
};

function stateBadgeClass(state: CheckInState): string {
  switch (state) {
    case 'ready':
      return 'bg-volt/15 text-volt border-volt/40';
    case 'resting':
      return 'bg-tangerine/15 text-tangerine border-tangerine/40';
    default:
      return 'bg-obsidian-dark text-text-secondary border-card-border';
  }
}

export default function LobbyPage() {
  const sessionId = useSessionId();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [roster, setRoster] = useState<SessionPlayerWithDetails[]>([]);
  const [counts, setCounts] = useState<Record<CheckInState, number>>({
    not_here: 0,
    ready: 0,
    resting: 0,
  });
  const [tab, setTab] = useState<'all' | CheckInState>('all');
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState<SkillLevel>('intermediate');

  const load = useCallback(async () => {
    const s = await db.sessions.get(sessionId);
    setSession(s ?? null);
    setRoster(await getSessionPlayersWithDetails(sessionId));
    setCounts(await getRosterCounts(sessionId));
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!session) {
    return <div className="p-8 text-text-secondary">Loading…</div>;
  }

  const filtered =
    tab === 'all' ? roster : roster.filter((r) => r.checkInState === tab);

  const handleAddPlayer = async () => {
    const name = newName.trim();
    if (!name) return;
    const player = await getOrCreatePlayer(name, newSkill);
    await getOrCreateSessionPlayer(sessionId, player.id, 'not_here');
    setNewName('');
    await load();
  };

  const handleCycleState = async (playerId: string, current: CheckInState) => {
    await setCheckInState(sessionId, playerId, NEXT_STATE[current]);
    await load();
  };

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
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-tangerine/15 text-tangerine border border-tangerine/30 text-xs font-mono">
            Not started
          </span>
          <button
            type="button"
            onClick={handleStart}
            className="h-12 px-5 rounded-xl bg-volt text-obsidian-dark font-extrabold flex items-center gap-2 hover:bg-volt-hover transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            Start session →
          </button>
        </div>
      </div>

      {/* Add player */}
      <div className="mt-6 p-4 rounded-2xl bg-card-surface border border-card-border">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-volt" />
          <span className="text-sm font-semibold">Add player</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            className="flex-1 h-12 rounded-xl bg-obsidian-dark border border-card-border px-4 text-white focus:outline-none focus:border-volt"
          />
          <select
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value as SkillLevel)}
            className="h-12 rounded-xl bg-obsidian-dark border border-card-border px-3 text-white focus:outline-none focus:border-volt"
          >
            {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map((sk) => (
              <option key={sk} value={sk}>
                {SKILL_LEVEL_LABELS[sk]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddPlayer}
            className="h-12 px-4 rounded-xl bg-volt text-obsidian-dark font-bold hover:bg-volt-hover"
          >
            Add
          </button>
        </div>
      </div>

      {/* Roster */}
      <div className="mt-6 p-4 rounded-2xl bg-card-surface border border-card-border">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-volt" />
            Players ({counts.ready}/{roster.length} ready)
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`h-10 px-3 rounded-lg border text-xs font-semibold ${
                tab === t.key
                  ? 'border-volt bg-volt/10 text-volt'
                  : 'border-card-border bg-obsidian-dark text-text-secondary'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-60">
                {t.key === 'all' ? roster.length : counts[t.key as CheckInState]}
              </span>
            </button>
          ))}
        </div>

        {/* Player list */}
        <ul className="mt-4 space-y-1.5">
          {filtered.length === 0 ? (
            <li className="p-6 text-center text-sm text-text-secondary">
              No players here yet. Add players above or join from the Queue.
            </li>
          ) : (
            filtered.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-dark/60 border border-card-border/50"
              >
                <div>
                  <div className="text-sm font-semibold">{r.player.name}</div>
                  <div className="text-xs text-text-secondary">
                    {SKILL_LEVEL_LABELS[r.player.skillLevel]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCycleState(r.playerId, r.checkInState)}
                  title="Tap to change check-in state"
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${stateBadgeClass(r.checkInState)}`}
                >
                  {STATE_LABEL[r.checkInState]}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-4 text-center">
        <Link
          href={`/sessions/${sessionId}/queue`}
          className="text-sm text-volt hover:underline"
        >
          Manage the queue →
        </Link>
      </div>
    </div>
  );
}
