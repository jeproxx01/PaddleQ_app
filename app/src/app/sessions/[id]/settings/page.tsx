'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Unlock,
  Delete,
  Shield,
  LogOut,
  Sparkles,
  Users,
  Link2,
} from 'lucide-react';
import { db, type Court, type Player, type Session, type TournamentFixture, type TournamentTeam } from '@/db/db';
import { useSessionId } from '@/features/layout/SessionContext';
import {
  GAME_MODES_ORDERED,
  GAME_MODE_LABELS,
  SKILL_LEVELS_ORDERED,
  SKILL_LEVEL_LABELS,
} from '@/shared/display';
import { getWaitingStacksWithPlayers, removePlayerFromQueue, disbandStack, type StackWithPlayers } from '@/features/queue/queueService';
import { endSession } from '@/features/session/sessionService';
import {
  overrideTournamentFixtureScore,
  regenerateTournament,
} from '@/features/tournament/tournamentService';
import {
  verifyPin,
  setPin,
  updateCourtCount,
  updateGameMode,
  unlockTeamLock,
  overrideSkillLevel,
  seedDemoPlayers,
} from '@/features/admin/adminService';

export default function SettingsPage() {
  const sessionId = useSessionId();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [stacks, setStacks] = useState<StackWithPlayers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [unlocked, setUnlocked] = useState(false);

  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinError, setNewPinError] = useState<string | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [fixtures, setFixtures] = useState<TournamentFixture[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);

  const load = useCallback(async () => {
    const s = await db.sessions.get(sessionId);
    setSession(s ?? null);
    setStacks(await getWaitingStacksWithPlayers(sessionId));
    setPlayers(await db.players.toArray());
    const allFixtures = await db.tournamentFixtures.where('sessionId').equals(sessionId).toArray();
    setFixtures(allFixtures.sort((a, b) => a.round - b.round));
    const allTeams = await db.tournamentTeams.where('sessionId').equals(sessionId).toArray();
    setTeams(allTeams);
    setCourts(await db.courts.toArray());
  }, [sessionId]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  // Auto-verify once 4 digits are entered.
  useEffect(() => {
    if (pinEntry.length !== 4) return;
    verifyPin(sessionId, pinEntry).then((ok) => {
      if (ok) {
        setUnlocked(true);
        setPinError(false);
      } else {
        setPinError(true);
      }
      setPinEntry('');
    });
  }, [pinEntry, sessionId]);

  if (!session) {
    return <div className="p-8 text-text-secondary">Loading…</div>;
  }

  const lockedPairs = stacks.filter((s) => s.teamLockId);
  const waitingPlayers = stacks.flatMap((s) => s.players);
  const hasStarted = fixtures.some((f) => f.status !== 'scheduled');

  const pressDigit = (d: string) => {
    if (pinEntry.length < 4) setPinEntry((p) => p + d);
  };

  const handleChangePin = async () => {
    try {
      await setPin(sessionId, newPin);
      setNewPin('');
      setNewPinError(null);
    } catch (err) {
      setNewPinError((err as Error).message);
    }
  };

  const handleEndSession = async () => {
    await endSession(sessionId);
    router.push('/');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Shield className="w-6 h-6 text-volt" /> Settings
      </h1>

      {!unlocked ? (
        /* ---- PIN gate ---- */
        <div className="mt-8 max-w-xs mx-auto text-center">
          <div className="p-4 rounded-2xl bg-card-surface border border-card-border">
            <Lock className="w-8 h-8 text-volt mx-auto" />
            <p className="mt-2 text-sm text-text-secondary">Enter organizer PIN</p>

            <div className="flex items-center justify-center gap-3 my-5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full border ${
                    pinEntry.length > i ? 'bg-volt border-volt' : 'border-card-border bg-obsidian-dark'
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="text-xs text-red-400 mb-3">Incorrect PIN. Try again.</p>}

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pressDigit(d)}
                  className="h-12 rounded-lg bg-obsidian-dark border border-card-border text-lg font-bold text-white hover:border-volt/50"
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => pressDigit('0')}
                className="h-12 rounded-lg bg-obsidian-dark border border-card-border text-lg font-bold text-white hover:border-volt/50"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPinEntry((p) => p.slice(0, -1))}
                className="h-12 rounded-lg bg-obsidian-dark border border-card-border text-volt flex items-center justify-center hover:border-volt/50"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ---- Controls ---- */
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-volt/10 border border-volt/30">
            <span className="flex items-center gap-2 text-volt font-semibold">
              <Unlock className="w-4 h-4" /> Unlocked
            </span>
            <button
              type="button"
              onClick={() => setUnlocked(false)}
              className="text-xs text-text-secondary hover:text-white"
            >
              Lock again
            </button>
          </div>

          {/* Court count */}
          <Section title="Court count">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  updateCourtCount(sessionId, Math.max(1, session.courtCount - 1)).then(load);
                }}
                className="h-14 w-14 rounded-xl bg-card-surface border border-card-border text-2xl font-bold hover:border-volt/50"
              >
                -
              </button>
              <div className="flex-1 h-14 flex items-center justify-center rounded-xl bg-card-surface border border-card-border text-2xl font-mono font-bold text-volt">
                {session.courtCount}
              </div>
              <button
                type="button"
                onClick={() => {
                  updateCourtCount(sessionId, Math.min(12, session.courtCount + 1)).then(load);
                }}
                className="h-14 w-14 rounded-xl bg-card-surface border border-card-border text-2xl font-bold hover:border-volt/50"
              >
                +
              </button>
            </div>
          </Section>

          {/* Game mode */}
          <Section title="Game mode">
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES_ORDERED.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    updateGameMode(sessionId, mode).then(load);
                  }}
                  className={`h-12 rounded-xl border text-sm font-semibold ${
                    session.gameMode === mode
                      ? 'border-volt bg-volt/10 text-volt'
                      : 'border-card-border bg-card-surface text-text-secondary'
                  }`}
                >
                  {GAME_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </Section>

          {/* Tournament Management */}
          {session.gameMode === 'winner-takes-all-round-robin' && (
            <Section title="Tournament Management">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary">
                    {fixtures.length} Fixtures • {teams.length} Teams
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await regenerateTournament(sessionId);
                      await load();
                    }}
                    disabled={hasStarted}
                    title={hasStarted ? 'Cannot re-seed after the tournament has started' : 'Re-pair teams before the first fixture is dispatched'}
                    className="px-3 py-1.5 rounded-lg bg-obsidian-dark border border-volt/40 text-volt text-xs font-semibold hover:bg-volt/10 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Re-seed Teams
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {fixtures.length === 0 ? (
                    <p className="text-xs text-text-secondary">No tournament fixtures generated yet.</p>
                  ) : (
                    fixtures.map((f) => {
                      const t1 = teams.find((t) => t.id === f.team1Id);
                      const t2 = teams.find((t) => t.id === f.team2Id);
                      const court = courts.find((c) => c.id === f.courtId);
                      const isDone = f.status === 'completed';

                      return (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-xl bg-obsidian-dark/60 border border-card-border/50 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono text-volt font-bold mr-2">R{f.round}</span>
                              <span className="text-white font-medium">
                                {t1?.name.split('(')[0].trim() ?? 'Team 1'} vs {t2?.name.split('(')[0].trim() ?? 'Team 2'}
                              </span>
                              {court && (
                                <span className="ml-2 text-text-secondary">Court {court.courtNumber}</span>
                              )}
                              {isDone ? (
                                <span className="ml-2 font-mono text-cyan">
                                  ({f.score1} - {f.score2})
                                </span>
                              ) : (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-obsidian-dark text-text-secondary border border-card-border">
                                  {f.status}
                                </span>
                              )}
                            </div>

                            {!isDone && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await overrideTournamentFixtureScore(f.id, 11, 0);
                                    await load();
                                  }}
                                  className="px-2 py-1 rounded bg-obsidian-dark border border-card-border text-[11px] text-text-secondary hover:text-white"
                                  title="Award 11-0 walkover to Team 1"
                                >
                                  T1 Forfeit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await overrideTournamentFixtureScore(f.id, 0, 11);
                                    await load();
                                  }}
                                  className="px-2 py-1 rounded bg-obsidian-dark border border-card-border text-[11px] text-text-secondary hover:text-white"
                                  title="Award 11-0 walkover to Team 2"
                                >
                                  T2 Forfeit
                                </button>
                              </div>
                            )}
                          </div>

                          {!isDone && (
                            <FixtureScoreForm fixtureId={f.id} onApplied={load} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Team locks */}
          <Section title="Team locks">
            {lockedPairs.length === 0 ? (
              <p className="text-sm text-text-secondary">No locked pairs.</p>
            ) : (
              <ul className="space-y-2">
                {lockedPairs.map((stack) => (
                  <li
                    key={stack.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark/60 border border-card-border/50"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Link2 className="w-4 h-4 text-cyan" />
                      {stack.players.map((p) => p.name).join(' & ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => unlockTeamLock(sessionId, stack.id).then(load)}
                      className="px-3 py-1.5 rounded-lg bg-obsidian-dark border border-card-border text-xs text-text-secondary hover:text-white"
                    >
                      Unlock
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Queue controls */}
          <Section title="Waiting players">
            {waitingPlayers.length === 0 ? (
              <p className="text-sm text-text-secondary">Queue is empty.</p>
            ) : (
              <ul className="space-y-1.5">
                {waitingPlayers.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-dark/60 border border-card-border/50"
                  >
                    <span className="text-sm font-semibold">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => removePlayerFromQueue(sessionId, p.id).then(load)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-500/40 text-xs text-red-300 hover:bg-red-950/80"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  if (stacks.length > 0) disbandStack(sessionId, stacks[0].id).then(load);
                }}
                disabled={stacks.length === 0}
                className="h-10 px-4 rounded-lg bg-obsidian-dark border border-card-border text-xs text-text-secondary hover:text-white disabled:opacity-40"
              >
                Disband oldest stack
              </button>
            </div>
          </Section>

          {/* Skill override */}
          <Section title="Skill override">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full h-12 rounded-xl bg-card-surface border border-card-border px-3 text-white focus:outline-none focus:border-volt"
            >
              <option value="">Select a player…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {SKILL_LEVEL_LABELS[p.skillLevel]}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 mt-2">
              {SKILL_LEVELS_ORDERED.map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={!selectedPlayerId}
                  onClick={() =>
                    overrideSkillLevel(selectedPlayerId, level).then(load)
                  }
                  className="h-11 px-3 rounded-lg bg-card-surface border border-card-border text-xs font-semibold text-text-secondary hover:text-white disabled:opacity-40"
                >
                  {SKILL_LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </Section>

          {/* Change PIN */}
          <Section title="Change PIN">
            <div className="flex items-center gap-3">
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New 4-digit PIN"
                className="flex-1 h-12 rounded-xl bg-card-surface border border-card-border px-4 text-center font-mono tracking-widest text-white focus:outline-none focus:border-volt"
              />
              <button
                type="button"
                onClick={handleChangePin}
                className="h-12 px-4 rounded-xl bg-volt text-obsidian-dark font-bold hover:bg-volt-hover"
              >
                Save
              </button>
            </div>
            {newPinError && <p className="text-xs text-red-400 mt-2">{newPinError}</p>}
          </Section>

          {/* Load demo */}
          <Section title="Demo">
            <button
              type="button"
              onClick={() => seedDemoPlayers(sessionId).then(load)}
              className="h-12 px-4 rounded-xl bg-obsidian-dark border border-card-border text-sm font-semibold text-white flex items-center gap-2 hover:border-volt/50"
            >
              <Sparkles className="w-4 h-4 text-volt" /> Load demo players
            </button>
          </Section>

          {/* End session */}
          <button
            type="button"
            onClick={handleEndSession}
            className="w-full h-14 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 font-bold flex items-center justify-center gap-2 hover:bg-red-950/80"
          >
            <LogOut className="w-5 h-5" /> End session
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-card-surface border border-card-border">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5">
        <Users className="w-4 h-4 text-volt" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function FixtureScoreForm({ fixtureId, onApplied }: { fixtureId: string; onApplied: () => void }) {
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');

  const s1 = parseInt(score1, 10);
  const s2 = parseInt(score2, 10);
  const invalid = score1 === '' || score2 === '' || Number.isNaN(s1) || Number.isNaN(s2) || s1 === s2;

  const apply = async () => {
    if (invalid) return;
    try {
      await overrideTournamentFixtureScore(fixtureId, s1, s2);
      setScore1('');
      setScore2('');
      onApplied();
    } catch {
      // Fixture may have completed concurrently; the next load() reflects true state.
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-card-border/40">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={score1}
        onChange={(e) => setScore1(e.target.value)}
        placeholder="Score"
        aria-label="Team 1 score"
        className="w-16 h-8 rounded bg-obsidian-dark border border-card-border px-2 text-center font-mono text-white focus:outline-none focus:border-volt"
      />
      <span className="text-text-secondary">-</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={score2}
        onChange={(e) => setScore2(e.target.value)}
        placeholder="Score"
        aria-label="Team 2 score"
        className="w-16 h-8 rounded bg-obsidian-dark border border-card-border px-2 text-center font-mono text-white focus:outline-none focus:border-volt"
      />
      <button
        type="button"
        onClick={apply}
        disabled={invalid}
        className="px-2 py-1.5 rounded bg-obsidian-dark border border-card-border text-[11px] text-text-secondary hover:text-white disabled:opacity-40"
      >
        Save score
      </button>
    </div>
  );
}
