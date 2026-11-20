# 05: Web Speech API TTS Caller and Full-Screen Court Call Flash

**What to build:** Vocal and high-visibility court dispatch announcements. Whenever an open court is dispatched, the kiosk synthesizes speech via the offline Web Speech API announcing the court number and player names (e.g. *"Court 2 is ready for Stack 1: Alex, Dave, Sarah, and Lisa"*). Simultaneously, a high-visibility full-screen visual modal flashes the assigned court number and player names for 10 seconds, ensuring players hear and see their call in noisy or outdoor venues. Includes richer callouts: selectable device/AI voices, horn/bell cues on dispatch, win, and time-up, and per-screen audio controls (mute the Kiosk while keeping TV sound).

**Blocked by:** 04: QMaster Composite Dispatch Engine and Explainable Assignment

**Status:** ready-for-agent

- [x] Web Speech API adapter triggers offline text-to-speech audio upon court dispatch using `window.speechSynthesis`.
- [x] Speech utterance properly formats the phrase: *"Court [X] is ready: [Player 1], [Player 2], [Player 3], and [Player 4]"* — `formatCourtCallText()` in `audio.ts`.
- [x] Full-screen visual court call modal flashes with large Court number, player names, and a 10-second auto-dismiss progress bar — `CourtCallModal.tsx` present.
- [x] Modal can be dismissed manually before 10 seconds with a single tap on the screen.
- [x] Graceful degradation: if speech synthesis is blocked, unavailable, or unsupported by the browser, the visual callout modal continues to flash without throwing unhandled exceptions — confirmed in `speakCourtCall()`.
- [x] Vitest unit tests spy on `window.speechSynthesis.speak` to verify proper speech string formation and parameter formatting — `audio.test.ts` with `speakSpy` confirmed.
- [ ] Voice picker in Settings selects among available device/AI voices for announcements.
- [ ] Horn/bell audio cues fire on dispatch, win, and Time-Based time-up events.
- [ ] Per-screen audio controls allow muting the Kiosk while keeping the Broadcast Screen (`/show`) audio on.
- [ ] Time-Based auto-call triggers the same speech + visual flash pipeline at countdown zero.
