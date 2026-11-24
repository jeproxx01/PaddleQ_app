/**
 * Offline court audio: Web Speech API (TTS) announcements and Web Audio API cues.
 *
 * Degrades gracefully when speech synthesis or audio context is unavailable.
 * Audio controls (mute & selected voice) are stored in localStorage per-screen,
 * allowing the kiosk tablet to be muted while leaving TV broadcast (/show) audio on.
 */

export interface CourtCall {
  id: string;
  courtNumber: number;
  playerNames: string[];
}

export const STORAGE_KEY_AUDIO_MUTED = 'pickleq_audio_muted';
export const STORAGE_KEY_AUDIO_VOICE = 'pickleq_audio_voice_uri';

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY_AUDIO_MUTED) === 'true';
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY_AUDIO_MUTED, muted ? 'true' : 'false');
}

export function getSelectedVoiceURI(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEY_AUDIO_VOICE);
}

export function setSelectedVoiceURI(voiceURI: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  if (!voiceURI) {
    window.localStorage.removeItem(STORAGE_KEY_AUDIO_VOICE);
  } else {
    window.localStorage.setItem(STORAGE_KEY_AUDIO_VOICE, voiceURI);
  }
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

/**
 * Web Audio API synthesizer for offline audio chimes, horns, and bells.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    return new AudioCtx();
  } catch {
    return null;
  }
}

/**
 * 2-tone chime cue for court dispatches (C5 -> E5).
 */
export function playDispatchCue(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio cue playback failed:', err);
  }
}

/**
 * Fanfare / celebratory chime cue on match completion / win (C5 -> E5 -> G5 -> C6).
 */
export function playWinCue(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const step = 0.09;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * step;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (err) {
    console.warn('Win cue playback failed:', err);
  }
}

/**
 * Horn / buzzer cue on time-up (220 Hz buzzer buzz).
 */
export function playTimeUpCue(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3 buzzer

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (err) {
    console.warn('Time-up cue playback failed:', err);
  }
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

export function speakCourtCall(text: string, options?: { voiceURI?: string }): void {
  if (isAudioMuted()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel(); // cancel any pending speech
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const targetVoiceURI = options?.voiceURI || getSelectedVoiceURI();
    if (targetVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.voiceURI === targetVoiceURI);
      if (match) {
        utterance.voice = match;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('TTS execution failed:', error);
  }
}

export function announceCourtAssignments(calls: CourtCall[]): void {
  if (calls.length === 0) return;
  playDispatchCue();

  if (isAudioMuted()) return;
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

      const targetVoiceURI = getSelectedVoiceURI();
      if (targetVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.voiceURI === targetVoiceURI);
        if (match) {
          utterance.voice = match;
        }
      }

      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('TTS execution failed:', error);
  }
}

export function triggerTimeUpCall(courtNumber: number): void {
  playTimeUpCue();
  speakCourtCall(`Time is up on Court ${courtNumber}`);
}
