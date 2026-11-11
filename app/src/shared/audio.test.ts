import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCourtCallText,
  joinNames,
  speakCourtCall,
  announceCourtAssignments,
} from './audio';

class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  constructor(text: string) {
    this.text = text;
  }
}

const speakSpy = vi.fn();
const cancelSpy = vi.fn();

beforeEach(() => {
  speakSpy.mockReset();
  cancelSpy.mockReset();
  vi.stubGlobal('window', {
    speechSynthesis: { speak: speakSpy, cancel: cancelSpy },
    SpeechSynthesisUtterance: FakeUtterance,
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
});
