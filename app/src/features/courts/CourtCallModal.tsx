'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

const DISMISS_MS = 10000;

interface CourtCallModalProps {
  courtNumber: number;
  playerNames: string[];
  onDismiss: () => void;
}

export function CourtCallModal({ courtNumber, playerNames, onDismiss }: CourtCallModalProps) {
  const [progress, setProgress] = useState(100);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const remaining = 100 - ((Date.now() - startedAt) / DISMISS_MS) * 100;
      if (remaining <= 0) {
        clearInterval(interval);
        onDismissRef.current();
      } else {
        setProgress(remaining);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={onDismiss}
      data-testid="court-call-modal"
    >
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-cyan">
        <Volume2 className="w-4 h-4" />
        Court call
      </div>
      <div className="mt-2 text-7xl md:text-9xl font-black font-mono text-white text-center">
        Court {courtNumber}
      </div>
      <div className="mt-6 text-2xl md:text-4xl font-bold text-white text-center px-8 max-w-3xl">
        {playerNames.join(' · ')}
      </div>

      <div className="absolute bottom-10 left-10 right-10">
        <div className="h-2 rounded-full bg-card-border overflow-hidden">
          <div className="h-full bg-volt" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="absolute top-6 right-6 text-sm text-text-secondary">Tap to dismiss</div>
    </div>
  );
}
