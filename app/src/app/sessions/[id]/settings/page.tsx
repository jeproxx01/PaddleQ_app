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
  Volume2,
  VolumeX,
  Bookmark,
  Layers,
  History,
  Play,
  Plus,
  Minus,
  Trash2,
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
  updateCourtGroup,
  getSessionPresets,
  saveCustomPreset,
  deleteCustomPreset,
  applySessionPreset,
  getDispatchAuditRecords,
  type SessionPreset,
  type DispatchAuditRecord,
} from '@/features/admin/adminService';
import {
  isAudioMuted,
  setAudioMuted,
  getSelectedVoiceURI,
  setSelectedVoiceURI,
  getAvailableVoices,
  playDispatchCue,
  playWinCue,
  playTimeUpCue,
  speakCourtCall,
} from '@/shared/audio';

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

  // Ticket 05 & 07 state
  const [muted, setMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [presets, setPresets] = useState<SessionPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [auditRecords, setAuditRecords] = useState<DispatchAuditRecord[]>([]);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const load = useCallback(async () => {
    const s = await db.sessions.get(sessionId);
    setSession(s ?? null);
    setStacks(await getWaitingStacksWithPlayers(sessionId));
    setPlayers(await db.players.toArray());
    const allFixtures = await db.tournamentFixtures.where('sessionId').equals(sessionId).toArray();
    setFixtures(allFixtures.sort((a, b) => a.round - b.round));
    const allTeams = await db.tournamentTeams.where('sessionId').equals(sessionId).toArray();
    setTeams(allTeams);
    const sessionCourts = await db.courts.where('sessionId').equals(sessionId).sortBy('courtNumber');
    setCourts(sessionCourts);

    // Audio & admin extras
    setMuted(isAudioMuted());
    setSelectedVoice(getSelectedVoiceURI() || '');
    setPresets(getSessionPresets());
    const audits = await getDispatchAuditRecords(sessionId);
    setAuditRecords(audits);
  }, [sessionId]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  // Load browser speech voices
  useEffect(() => {
    const updateVoices = () => {
      const v = getAvailableVoices();
      setVoices(v);
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

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
  const hasStarted = fixtures.some((f) => f.status !== 'completed' && f.status !== 'scheduled');

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

  const toggleMute = () => {
    const next = !muted;
    setAudioMuted(next);
    setMuted(next);
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoice(uri);
    setSelectedVoiceURI(uri || null);
  };

  const handleTestAnnouncement = () => {
    playDispatchCue();
    speakCourtCall('Court 1 is ready: Alex, Dave, Sarah, and Lisa');
  };

  const handleApplyPreset = async (preset: SessionPreset) => {
    await applySessionPreset(sessionId, preset);
    await load();
  };

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    saveCustomPreset({
      name: newPresetName.trim(),
      courtCount: session.courtCount,
      gameMode: session.gameMode,
      recordScores: session.recordScores,
      targetScore: session.targetScore,
    });
    setNewPresetName('');
    setPresets(getSessionPresets());
  };

  const handleDeletePreset = (id: string) => {
    deleteCustomPreset(id);
    setPresets(getSessionPresets());
  };

  const handleSetCourtGroup = async (courtId: string, groupLabel: string) => {
    await updateCourtGroup(courtId, groupLabel || undefined);
    await load();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <Shield className="w-6 h-6 text-volt" /> Organizer Settings & Admin Drawer
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
        /* ---- Unlocked Drawer Controls ---- */
        <div className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-volt/10 border border-volt/30">
            <span className="flex items-center gap-2 text-volt font-semibold">
              <Unlock className="w-4 h-4" /> Admin Drawer Unlocked
            </span>
            <button
              type="button"
              onClick={() => setUnlocked(false)}
              className="text-xs text-text-secondary hover:text-white"
            >
              Lock drawer
            </button>
          </div>

          {/* Quick Shortcuts */}
          <Section title="Quick Shortcuts" icon={Sparkles}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => updateCourtCount(sessionId, Math.min(12, session.courtCount + 1)).then(load)}
                className="p-2.5 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-volt" /> +1 Court
              </button>
              <button
                type="button"
                onClick={() => updateCourtCount(sessionId, Math.max(1, session.courtCount - 1)).then(load)}
                className="p-2.5 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Minus className="w-3.5 h-3.5 text-volt" /> -1 Court
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-2.5 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {muted ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Unmute
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" /> Mute Kiosk
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => seedDemoPlayers(sessionId).then(load)}
                className="p-2.5 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-cyan" /> Demo Data
              </button>
            </div>
          </Section>

          {/* Audio Controls & Voice Picker (Ticket #05) */}
          <Section title="Audio Caller & Sound Controls" icon={Volume2}>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-dark border border-card-border">
                <div>
                  <p className="text-sm font-semibold text-white">Kiosk Audio Announcements</p>
                  <p className="text-xs text-text-secondary">
                    Mute this tablet while leaving the venue TV broadcast (`/show`) sound active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    muted
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                      : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  }`}
                >
                  {muted ? 'MUTED' : 'ACTIVE'}
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                  Announcement Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full h-11 rounded-xl bg-obsidian-dark border border-card-border px-3 text-sm text-white focus:outline-none focus:border-volt"
                >
                  <option value="">Default System Voice</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestAnnouncement}
                  className="px-3 py-2 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-medium text-white flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-volt" /> Test Callout
                </button>
                <button
                  type="button"
                  onClick={() => playDispatchCue()}
                  className="px-3 py-2 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-medium text-text-secondary hover:text-white"
                >
                  Dispatch Chime
                </button>
                <button
                  type="button"
                  onClick={() => playWinCue()}
                  className="px-3 py-2 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-medium text-text-secondary hover:text-white"
                >
                  Win Fanfare
                </button>
                <button
                  type="button"
                  onClick={() => playTimeUpCue()}
                  className="px-3 py-2 rounded-xl bg-obsidian-dark border border-card-border hover:border-volt/50 text-xs font-medium text-text-secondary hover:text-white"
                >
                  Time-Up Horn
                </button>
              </div>
            </div>
          </Section>

          {/* Session Presets (Ticket #07) */}
          <Section title="Session Presets" icon={Bookmark}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-obsidian-dark border border-card-border flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{p.name}</p>
                      <p className="text-[11px] text-text-secondary mt-1">
                        {p.courtCount} courts • {GAME_MODE_LABELS[p.gameMode]}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-card-border/40">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="flex-1 py-1 rounded bg-volt/10 border border-volt/30 text-volt text-[11px] font-semibold hover:bg-volt/20"
                      >
                        Apply
                      </button>
                      {!p.isBuiltIn && (
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(p.id)}
                          className="p-1 rounded text-text-secondary hover:text-red-400"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-card-border/40">
                <input
                  type="text"
                  placeholder="New preset name (e.g. Wednesday League)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 h-10 rounded-xl bg-obsidian-dark border border-card-border px-3 text-xs text-white focus:outline-none focus:border-volt"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentAsPreset}
                  disabled={!newPresetName.trim()}
                  className="h-10 px-3 rounded-xl bg-volt text-obsidian-dark font-bold text-xs hover:bg-volt-hover disabled:opacity-40"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </Section>

          {/* Court count */}
          <Section title="Court count" icon={Layers}>
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

          {/* Court Groups (Ticket #07) */}
          <Section title="Court Groups & Labels" icon={Layers}>
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">
                Assign group labels to courts (e.g., &quot;Beginner&quot;, &quot;Advanced&quot;, &quot;Challenge Court&quot;).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {courts.map((court) => (
                  <div
                    key={court.id}
                    className="p-2.5 rounded-xl bg-obsidian-dark border border-card-border flex items-center justify-between gap-2"
                  >
                    <span className="font-mono text-xs font-bold text-volt">
                      Court {court.courtNumber}
                    </span>
                    <input
                      type="text"
                      defaultValue={court.courtGroupId || ''}
                      placeholder="No group"
                      onBlur={(e) => handleSetCourtGroup(court.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSetCourtGroup(court.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                      className="w-32 h-8 rounded bg-card-surface border border-card-border px-2 text-xs text-white focus:outline-none focus:border-volt"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Game mode */}
          <Section title="Game mode" icon={Layers}>
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
            <Section title="Tournament Management" icon={Sparkles}>
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

          {/* Dispatch Audit Trail Viewer (Ticket #07) */}
          <Section title="Dispatch Decision Audit Trail" icon={History}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  Logged fairness decisions ({auditRecords.length} records)
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuditTrail((v) => !v)}
                  className="text-xs text-volt font-semibold hover:underline"
                >
                  {showAuditTrail ? 'Hide Log' : 'View Log'}
                </button>
              </div>

              {showAuditTrail && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {auditRecords.length === 0 ? (
                    <p className="text-xs text-text-secondary">No dispatch decisions logged yet.</p>
                  ) : (
                    auditRecords.map((record) => (
                      <div
                        key={record.matchId}
                        className="p-2.5 rounded-xl bg-obsidian-dark border border-card-border text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-volt font-bold">
                            Court {record.courtNumber}
                          </span>
                          <span className="text-[10px] text-text-secondary font-mono">
                            {new Date(record.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-white font-medium">
                          {record.playerNames.join(', ')}
                        </p>
                        {record.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {record.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-volt/10 text-volt border border-volt/20"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* Team locks */}
          <Section title="Team locks" icon={Link2}>
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
          <Section title="Waiting players" icon={Users}>
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
          <Section title="Skill override" icon={Users}>
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
          <Section title="Change PIN" icon={Lock}>
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
          <Section title="Demo" icon={Sparkles}>
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

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-2xl bg-card-surface border border-card-border">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5">
        {Icon ? <Icon className="w-4 h-4 text-volt" /> : <Users className="w-4 h-4 text-volt" />}
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
