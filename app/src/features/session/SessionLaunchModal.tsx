'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Play, Layers } from 'lucide-react';
import { RotationMode } from '../../db/db';
import { startSession } from './sessionService';
import { initializeAudio } from '../../shared/audio';

interface SessionLaunchModalProps {
  onSessionStarted: () => void;
}

export function SessionLaunchModal({ onSessionStarted }: SessionLaunchModalProps) {
  const [courtCount, setCourtCount] = useState<number>(4);
  const [rotationMode, setRotationMode] = useState<RotationMode>('4-In / 4-Out');
  const [pin, setPin] = useState<string>('1234');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleToggleAudio = () => {
    if (!audioEnabled) {
      initializeAudio();
      setAudioEnabled(true);
    } else {
      setAudioEnabled(false);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (audioEnabled) {
        initializeAudio();
      }
      await startSession({
        courtCount,
        rotationMode,
        pin: pin.trim().length === 4 ? pin.trim() : '1234',
        audioEnabled,
      });
      onSessionStarted();
    } catch (err) {
      console.error('Failed to launch session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card-surface border border-card-border p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-volt/10 text-volt border border-volt/20">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Start New Session</h1>
            <p className="text-sm text-text-secondary">PaddleQ Kiosk Court Operating System</p>
          </div>
        </div>

        <form onSubmit={handleLaunch} className="space-y-6">
          {/* Court Count */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Courts Available ({courtCount})
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCourtCount((c) => Math.max(1, c - 1))}
                className="h-14 w-14 flex items-center justify-center rounded-xl bg-obsidian-dark border border-card-border text-2xl font-bold text-white hover:border-volt/50 transition-colors"
                aria-label="Decrease courts"
              >
                -
              </button>
              <div className="flex-1 h-14 flex items-center justify-center rounded-xl bg-obsidian-dark border border-card-border text-2xl font-mono font-bold text-volt">
                {courtCount} {courtCount === 1 ? 'Court' : 'Courts'}
              </div>
              <button
                type="button"
                onClick={() => setCourtCount((c) => Math.min(12, c + 1))}
                className="h-14 w-14 flex items-center justify-center rounded-xl bg-obsidian-dark border border-card-border text-2xl font-bold text-white hover:border-volt/50 transition-colors"
                aria-label="Increase courts"
              >
                +
              </button>
            </div>
          </div>

          {/* Rotation Mode */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Rotation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRotationMode('4-In / 4-Out')}
                className={`h-14 rounded-xl border text-sm font-semibold transition-all ${
                  rotationMode === '4-In / 4-Out'
                    ? 'border-volt bg-volt/10 text-volt'
                    : 'border-card-border bg-obsidian-dark text-text-secondary hover:text-white'
                }`}
              >
                4-In / 4-Out (Standard)
              </button>
              <button
                type="button"
                onClick={() => setRotationMode('Winners Stay & Split')}
                className={`h-14 rounded-xl border text-sm font-semibold transition-all ${
                  rotationMode === 'Winners Stay & Split'
                    ? 'border-volt bg-volt/10 text-volt'
                    : 'border-card-border bg-obsidian-dark text-text-secondary hover:text-white'
                }`}
              >
                Winners Stay (2-Win Cap)
              </button>
            </div>
          </div>

          {/* Organizer PIN & Audio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan" />
                Admin PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full h-14 rounded-xl bg-obsidian-dark border border-card-border px-4 text-center font-mono text-xl tracking-widest text-white focus:outline-none focus:border-volt"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5">
                {audioEnabled ? <Volume2 className="w-4 h-4 text-volt" /> : <VolumeX className="w-4 h-4 text-text-secondary" />}
                Court Audio
              </label>
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`w-full h-14 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all ${
                  audioEnabled
                    ? 'border-volt/50 bg-volt/15 text-volt'
                    : 'border-card-border bg-obsidian-dark text-text-secondary hover:text-white'
                }`}
              >
                {audioEnabled ? 'Audio Active' : 'Audio Muted'}
              </button>
            </div>
          </div>

          {/* Launch Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 mt-4 rounded-xl bg-volt hover:bg-volt-hover text-obsidian-dark font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg shadow-volt/20 transition-all active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-current" />
            {isSubmitting ? 'Starting Session...' : 'Launch Open-Play Kiosk'}
          </button>
        </form>
      </div>
    </div>
  );
}
