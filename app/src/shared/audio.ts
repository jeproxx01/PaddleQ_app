/**
 * Offline court audio: Web Speech API (TTS) announcements.
 *
 * Degrades gracefully when speech synthesis is unavailable — callers always
 * fall back to the visual court-call flash.
 */

export interface CourtCall {
  id: string;
  courtNumber: number;
  playerNames: string[];
}

export function initializeAudio(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    const utterance = new window.SpeechSynthesisUtterance('Audio enabled');
    utterance.volume = 0.01; // subtle unlock sound
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function formatCourtCallText(courtNumber: number, playerNames: string[]): string {
  return `Court ${courtNumber} is ready: ${joinNames(playerNames)}`;
}

export function speakCourtCall(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel(); // cancel any pending speech
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('TTS execution failed:', error);
  }
}

export function announceCourtAssignments(calls: CourtCall[]): void {
  if (calls.length === 0) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    for (const call of calls) {
      const utterance = new window.SpeechSynthesisUtterance(
        formatCourtCallText(call.courtNumber, call.playerNames)
      );
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('TTS execution failed:', error);
  }
}
