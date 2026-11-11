'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, ArrowRight, ArrowLeft, Check, Users } from 'lucide-react';
import { type GameMode, type SkillLevel, type SkillMixing, type RecordScoresMode } from '@/db/db';
import { GAME_MODES_ORDERED, GAME_MODE_LABELS, SKILL_LEVELS_ORDERED, SKILL_LEVEL_LABELS } from '@/shared/display';
import { startSession } from '@/features/session/sessionService';
import { getOrCreatePlayer, joinSolo } from '@/features/queue/queueService';

const STEPS = ['Details', 'Game mode', 'Players', 'Review'];

export default function NewSessionWizard() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('Wednesday Open Play');
  const [courtCount, setCourtCount] = useState(4);
  const [recordScores, setRecordScores] = useState<RecordScoresMode>('winners-and-scores');
  const [targetScore, setTargetScore] = useState<number>(11);
  const [customTargetScore, setCustomTargetScore] = useState('15');
  const [gameMode, setGameMode] = useState<GameMode>('open-play');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoFill, setAutoFill] = useState(true);
  const [skillMixing, setSkillMixing] = useState<SkillMixing>('auto-balance');
  const [bulkPlayers, setBulkPlayers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedTargetScore =
    targetScore === 0 ? (parseInt(customTargetScore, 10) || 11) : targetScore;

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const session = await startSession({
        name,
        courtCount,
        gameMode,
        recordScores,
        targetScore: resolvedTargetScore,
        timeLimitMinutes,
        audioEnabled,
      });

      const lines = bulkPlayers
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      for (const playerName of lines) {
        const player = await getOrCreatePlayer(playerName, 'intermediate' as SkillLevel);
        await joinSolo(session.id, player.id);
      }

      router.push(`/sessions/${session.id}/lobby`);
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('Failed to start session. Please try again.');
      setIsSubmitting(false);
    }
  };

  const canContinue =
    step === 0
      ? name.trim().length > 0
      : true;

  return (
    <div className="min-h-screen bg-obsidian-dark text-white flex flex-col">
      <header className="h-20 border-b border-card-border px-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-text-secondary hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-xl font-bold tracking-tight">New session</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {/* Progress stepper */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((label, idx) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border ${
                    idx <= step
                      ? 'bg-volt text-obsidian-dark border-volt'
                      : 'border-card-border text-text-secondary'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className={`text-sm font-semibold ${idx === step ? 'text-white' : 'text-text-secondary'}`}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-card-border" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 — Details */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Session name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 rounded-xl bg-card-surface border border-card-border px-4 text-white focus:outline-none focus:border-volt"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Courts ({courtCount})
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCourtCount((c) => Math.max(1, c - 1))}
                  className="h-14 w-14 rounded-xl bg-card-surface border border-card-border text-2xl font-bold hover:border-volt/50"
                >
                  -
                </button>
                <div className="flex-1 h-14 flex items-center justify-center rounded-xl bg-card-surface border border-card-border text-2xl font-mono font-bold text-volt">
                  {courtCount}
                </div>
                <button
                  type="button"
                  onClick={() => setCourtCount((c) => Math.min(12, c + 1))}
                  className="h-14 w-14 rounded-xl bg-card-surface border border-card-border text-2xl font-bold hover:border-volt/50"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Record scores
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecordScores('winners')}
                  className={`h-14 rounded-xl border text-sm font-semibold ${
                    recordScores === 'winners'
                      ? 'border-volt bg-volt/10 text-volt'
                      : 'border-card-border bg-card-surface text-text-secondary'
                  }`}
                >
                  Just winners
                </button>
                <button
                  type="button"
                  onClick={() => setRecordScores('winners-and-scores')}
                  className={`h-14 rounded-xl border text-sm font-semibold ${
                    recordScores === 'winners-and-scores'
                      ? 'border-volt bg-volt/10 text-volt'
                      : 'border-card-border bg-card-surface text-text-secondary'
                  }`}
                >
                  Winners and scores
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Games to
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[11, 15, 21].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setTargetScore(score)}
                    className={`h-12 px-5 rounded-xl border text-sm font-bold ${
                      targetScore === score
                        ? 'border-volt bg-volt/10 text-volt'
                        : 'border-card-border bg-card-surface text-text-secondary'
                    }`}
                  >
                    {score}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTargetScore(0)}
                  className={`h-12 px-5 rounded-xl border text-sm font-bold ${
                    targetScore === 0
                      ? 'border-volt bg-volt/10 text-volt'
                      : 'border-card-border bg-card-surface text-text-secondary'
                  }`}
                >
                  Other
                </button>
                {targetScore === 0 && (
                  <input
                    type="number"
                    value={customTargetScore}
                    onChange={(e) => setCustomTargetScore(e.target.value)}
                    className="w-20 h-12 rounded-xl bg-card-surface border border-card-border px-3 text-center font-mono text-white focus:outline-none focus:border-volt"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Game mode */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Game mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GAME_MODES_ORDERED.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGameMode(mode)}
                    className={`h-14 rounded-xl border text-sm font-semibold ${
                      gameMode === mode
                        ? 'border-volt bg-volt/10 text-volt'
                        : 'border-card-border bg-card-surface text-text-secondary'
                    }`}
                  >
                    {GAME_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            {gameMode === 'time-based' && (
              <div>
                <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Game duration (minutes)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTimeLimitMinutes((m) => Math.max(1, m - 1))}
                    className="h-14 w-14 rounded-xl bg-card-surface border border-card-border text-2xl font-bold hover:border-volt/50"
                  >
                    -
                  </button>
                  <div className="flex-1 h-14 flex items-center justify-center rounded-xl bg-card-surface border border-card-border text-2xl font-mono font-bold text-volt">
                    {timeLimitMinutes}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimeLimitMinutes((m) => m + 1)}
                    className="h-14 w-14 rounded-xl bg-card-surface border border-card-border text-2xl font-bold hover:border-volt/50"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-xl bg-card-surface border border-card-border">
              <div className="flex items-center gap-2">
                {audioEnabled ? (
                  <Volume2 className="w-5 h-5 text-volt" />
                ) : (
                  <VolumeX className="w-5 h-5 text-text-secondary" />
                )}
                <span className="font-semibold">Enable court audio</span>
              </div>
              <button
                type="button"
                onClick={() => setAudioEnabled((v) => !v)}
                className={`w-12 h-7 rounded-full transition-colors ${audioEnabled ? 'bg-volt' : 'bg-card-border'}`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    audioEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-card-surface border border-card-border">
              <span className="font-semibold">Auto-fill courts</span>
              <button
                type="button"
                onClick={() => setAutoFill((v) => !v)}
                className={`w-12 h-7 rounded-full transition-colors ${autoFill ? 'bg-volt' : 'bg-card-border'}`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    autoFill ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Skill mixing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['auto-balance', 'Auto balance'],
                  ['manual', 'Manual'],
                  ['gender-format', 'Mixed doubles'],
                ] as [SkillMixing, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSkillMixing(value)}
                    className={`h-12 rounded-xl border text-xs font-semibold ${
                      skillMixing === value
                        ? 'border-volt bg-volt/10 text-volt'
                        : 'border-card-border bg-card-surface text-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Players */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <Users className="w-5 h-5 text-volt" />
              <span className="font-semibold text-white">Bulk add players</span>
              <span className="text-xs">(optional — add more in the Lobby)</span>
            </div>
            <textarea
              value={bulkPlayers}
              onChange={(e) => setBulkPlayers(e.target.value)}
              placeholder={'One name per line\n\nAlex\nDana\nSam\nPriya'}
              rows={10}
              className="w-full rounded-xl bg-card-surface border border-card-border p-4 text-white font-mono focus:outline-none focus:border-volt"
            />
            <p className="text-xs text-text-secondary">
              {bulkPlayers.split('\n').filter((l) => l.trim()).length} player(s) will be added
            </p>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-card-surface border border-card-border divide-y divide-card-border">
              {[
                ['Name', name],
                ['Courts', String(courtCount)],
                ['Game mode', GAME_MODE_LABELS[gameMode]],
                ['Record scores', recordScores === 'winners' ? 'Just winners' : 'Winners and scores'],
                ['Games to', String(resolvedTargetScore)],
                ['Skill mixing', skillMixing === 'auto-balance' ? 'Auto balance' : skillMixing === 'manual' ? 'Manual' : 'Mixed doubles'],
                ['Audio', audioEnabled ? 'On' : 'Off'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between p-3">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <span className="text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary">
              The organizer PIN is set in Settings after the session starts.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="h-14 px-6 rounded-xl border border-card-border text-text-secondary hover:text-white disabled:opacity-30 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue}
              className="h-14 px-6 rounded-xl bg-volt text-obsidian-dark font-extrabold flex items-center gap-2 hover:bg-volt-hover disabled:opacity-50"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="h-14 px-6 rounded-xl bg-volt text-obsidian-dark font-extrabold flex items-center gap-2 hover:bg-volt-hover disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              {isSubmitting ? 'Starting…' : 'Start session →'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
