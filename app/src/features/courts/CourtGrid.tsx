'use client';

import React from 'react';
import { CourtWithMatch } from './courtService';
import { CourtCard } from './CourtCard';

interface CourtGridProps {
  courts: CourtWithMatch[];
  onRecordScore?: (court: CourtWithMatch) => void;
  onWhyTheseFour?: (court: CourtWithMatch) => void;
}

export function CourtGrid({ courts, onRecordScore, onWhyTheseFour }: CourtGridProps) {
  if (courts.length === 0) {
    return (
      <div className="w-full p-8 rounded-2xl border border-card-border bg-card-surface/50 text-center text-text-secondary">
        No active courts configured for this session.
      </div>
    );
  }

  // Dynamic column layout according to court capacity
  let gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  if (courts.length <= 2) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2';
  } else if (courts.length <= 4) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  } else if (courts.length <= 8) {
    gridColsClass = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  } else {
    gridColsClass = 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6';
  }

  return (
    <div className={`grid gap-4 w-full ${gridColsClass}`} data-testid="court-grid">
      {courts.map((court) => (
        <CourtCard
          key={court.id}
          court={court}
          onRecordScore={onRecordScore}
          onWhyTheseFour={onWhyTheseFour}
        />
      ))}
    </div>
  );
}
