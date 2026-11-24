import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCourtCallText,
  joinNames,
  speakCourtCall,
  announceCourtAssignments,
  isAudioMuted,
  setAudioMuted,
  getSelectedVoiceURI,
  setSelectedVoiceURI,
  getAvailableVoices,
  playDispatchCue,
  playWinCue,
  playTimeUpCue,
  triggerTimeUpCall,
} from './audio';

class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const speakSpy = vi.fn();
const cancelSpy = vi.fn();
const getVoicesSpy = vi.fn();

let mockStorage: Record<string, string> = {};

const createMockAudioContext = () => {
  return class MockAudioContext {
    currentTime = 0;
    createOscillator = vi.fn(() => ({
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }));
    createGain = vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }));
    destination = {};
    close = vi.fn();
  };
};

beforeEach(() => {
  speakSpy.mockReset();
  cancelSpy.mockReset();
  mockStorage = {};

  const fakeVoices = [
    { voiceURI: 'voice-1', name: 'Alex English', lang: 'en-US', default: true },
    { voiceURI: 'voice-2', name: 'Samantha AI', lang: 'en-US', default: false },
  ];
  getVoicesSpy.mockReturnValue(fakeVoices);

  vi.stubGlobal('window', {
    speechSynthesis: {
      speak: speakSpy,
      cancel: cancelSpy,
      getVoices: getVoicesSpy,
    },
    SpeechSynthesisUtterance: FakeUtterance,
    AudioContext: createMockAudioContext(),
    localStorage: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('audio', () => {
  it('formats a court call announcement with an Oxford comma', () => {
    expect(formatCourtCallText(2, ['Alex', 'Dave', 'Sarah', 'Lisa'])).toBe(
      'Court 2 is ready: Alex, Dave, Sarah, and Lisa'
    );
    expect(formatCourtCallText(1, ['Alex'])).toBe('Court 1 is ready: Alex');
    expect(formatCourtCallText(3, ['Alex', 'Dave'])).toBe('Court 3 is ready: Alex and Dave');
  });

  it('joins names correctly for one, two, and many players', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['Alex'])).toBe('Alex');
    expect(joinNames(['Alex', 'Dave'])).toBe('Alex and Dave');
    expect(joinNames(['Alex', 'Dave', 'Sarah'])).toBe('Alex, Dave, and Sarah');
  });

  it('speaks a court call via speechSynthesis', () => {
    speakCourtCall('Court 2 is ready: Alex, Dave, Sarah, and Lisa');
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0].text).toBe('Court 2 is ready: Alex, Dave, Sarah, and Lisa');
  });

  it('announces multiple assignments in order', () => {
    announceCourtAssignments([
      { id: '1', courtNumber: 1, playerNames: ['A', 'B', 'C', 'D'] },
      { id: '2', courtNumber: 2, playerNames: ['E', 'F', 'G', 'H'] },
    ]);
    expect(speakSpy).toHaveBeenCalledTimes(2);
    expect(speakSpy.mock.calls[0][0].text).toBe('Court 1 is ready: A, B, C, and D');
    expect(speakSpy.mock.calls[1][0].text).toBe('Court 2 is ready: E, F, G, and H');
  });

  it('gracefully no-ops when speechSynthesis is unavailable', () => {
    vi.stubGlobal('window', {});
    expect(() => speakCourtCall('hi')).not.toThrow();
  });

  describe('per-screen mute controls', () => {
    it('defaults to unmuted and toggles mute state in storage', () => {
      expect(isAudioMuted()).toBe(false);
      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);
      setAudioMuted(false);
      expect(isAudioMuted()).toBe(false);
    });

    it('suppresses speech announcements when muted', () => {
      setAudioMuted(true);
      speakCourtCall('Court 1 is ready');
      expect(speakSpy).not.toHaveBeenCalled();

      announceCourtAssignments([
        { id: '1', courtNumber: 1, playerNames: ['A', 'B', 'C', 'D'] },
      ]);
      expect(speakSpy).not.toHaveBeenCalled();
    });
  });

  describe('voice selection', () => {
    it('retrieves available voices from speechSynthesis', () => {
      const voices = getAvailableVoices();
      expect(voices).toHaveLength(2);
      expect(voices[0].name).toBe('Alex English');
    });

    it('saves and applies chosen voice to utterance', () => {
      setSelectedVoiceURI('voice-2');
      expect(getSelectedVoiceURI()).toBe('voice-2');

      speakCourtCall('Court 1 ready');
      expect(speakSpy).toHaveBeenCalledTimes(1);
      const utterance = speakSpy.mock.calls[0][0];
      expect(utterance.voice?.voiceURI).toBe('voice-2');
    });
  });

  describe('audio sound cues', () => {
    it('plays dispatch chime without error', () => {
      expect(() => playDispatchCue()).not.toThrow();
    });

    it('plays win cue fanfare without error', () => {
      expect(() => playWinCue()).not.toThrow();
    });

    it('plays time-up cue without error', () => {
      expect(() => playTimeUpCue()).not.toThrow();
    });

    it('does not play cues if audio is muted', () => {
      setAudioMuted(true);
      expect(() => playDispatchCue()).not.toThrow();
    });

    it('triggers time up speech call and cue', () => {
      triggerTimeUpCall(3);
      expect(speakSpy).toHaveBeenCalledTimes(1);
      expect(speakSpy.mock.calls[0][0].text).toBe('Time is up on Court 3');
    });
  });
});
