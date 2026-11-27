'use client';

import React from 'react';
import { type CourtWithMatch } from '../courts/courtService';
import { BroadcastCourtCard } from './BroadcastCourtCard';

/**
 * TV-optimised court grid for the Broadcast Screen.
 * Same responsive layout logic as CourtGrid but uses BroadcastCourtCard
 * (read-only, no buttons, larger type for distance).
 */

interface BroadcastCourtGridProps {
  courts: CourtWithMatch[];
}

export function BroadcastCourtGrid({ courts }: BroadcastCourtGridProps) {
  if (courts.length === 0) {
    return (
      <div className="w-full p-10 rounded-2xl border border-card-border bg-card-surface/50 text-center text-text-secondary text-lg">
        No active courts configured for this session.
      </div>
    );
  }

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
    <div
      className={`grid gap-4 w-full ${gridColsClass}`}
      data-testid="broadcast-court-grid"
    >
      {courts.map((court) => (
        <BroadcastCourtCard key={court.id} court={court} />
      ))}
    </div>
  );
}
