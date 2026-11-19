/**
 * Client-side .xlsx export for Session Recap (ticket #14).
 *
 * Uses SheetJS (xlsx) which bundles entirely client-side — no network or
 * external service required, fully offline-capable.
 */

import type { PlayerRecapRow, MatchHistoryRow } from './recapService';
import { formatDuration, formatAvgWait } from './recapService';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportSessionXlsx(
  sessionName: string,
  playerRows: PlayerRecapRow[],
  matchRows: MatchHistoryRow[]
): Promise<void> {
  // Dynamic import so the ~1MB xlsx bundle is only loaded on demand
  const XLSX = await import('xlsx');

  // --- Player Stats sheet ---
  const playerData = [
    ['Player', 'Wins', 'Losses', 'Games Played', 'Courts Played', 'Avg Wait Time'],
    ...playerRows.map((r) => [
      r.name,
      r.wins,
      r.losses,
      r.gamesPlayed,
      r.courtsPlayed,
      formatAvgWait(r.avgWaitTimeMs),
    ]),
  ];

  // --- Match History sheet ---
  const matchData = [
    ['Court', 'Team 1', 'Team 2', 'Score', 'Winner', 'Duration'],
    ...matchRows.map((r) => [
      r.courtNumber,
      r.team1,
      r.team2,
      r.score,
      r.winner,
      formatDuration(r.durationMs),
    ]),
  ];

  const wb = XLSX.utils.book_new();

  const wsPlayers = XLSX.utils.aoa_to_sheet(playerData);
  // Auto-width: measure longest value per column
  const playerColWidths = playerData[0].map((_, colIdx) =>
    Math.max(...playerData.map((row) => String(row[colIdx] ?? '').length)) + 2
  );
  wsPlayers['!cols'] = playerColWidths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsPlayers, 'Player Stats');

  const wsMatches = XLSX.utils.aoa_to_sheet(matchData);
  const matchColWidths = matchData[0].map((_, colIdx) =>
    Math.max(...matchData.map((row) => String(row[colIdx] ?? '').length)) + 2
  );
  wsMatches['!cols'] = matchColWidths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsMatches, 'Match History');

  const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  triggerDownload(blob, `paddleq_recap_${safeName}.xlsx`);
}
