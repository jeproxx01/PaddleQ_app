export const STALLED_MATCH_THRESHOLD_SECONDS = 1200; // 20 minutes

export function formatMatchTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function isMatchDurationStalled(elapsedSeconds: number): boolean {
  return elapsedSeconds >= STALLED_MATCH_THRESHOLD_SECONDS;
}

export function getMatchTimerColorClass(elapsedSeconds: number): string {
  return isMatchDurationStalled(elapsedSeconds) ? 'text-tangerine' : 'text-cyan';
}
