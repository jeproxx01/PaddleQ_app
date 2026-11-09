# 05: Web Speech API TTS Caller and Full-Screen Court Call Flash

**What to build:** Vocal and high-visibility court dispatch announcements. Whenever an open court is dispatched, the kiosk synthesizes speech via the offline Web Speech API announcing the court number and player names (e.g. *"Court 2 is ready for Stack 1: Alex, Dave, Sarah, and Lisa"*). Simultaneously, a high-visibility full-screen visual modal flashes the assigned court number and player names for 10 seconds, ensuring players hear and see their call in noisy or outdoor venues.

**Blocked by:** 04: QMaster Composite Dispatch Engine and Explainable Assignment

**Status:** ready-for-agent

- [ ] Web Speech API adapter triggers offline text-to-speech audio upon court dispatch using `window.speechSynthesis`.
- [ ] Speech utterance properly formats the phrase: *"Court [X] is ready for Stack [Y]: [Player 1], [Player 2], [Player 3], and [Player 4]"*.
- [ ] Full-screen visual court call modal flashes with large Court number, player names, and a 10-second auto-dismiss progress bar.
- [ ] Modal can be dismissed manually before 10 seconds with a single tap on the screen.
- [ ] Graceful degradation: if speech synthesis is blocked, unavailable, or unsupported by the browser, the visual callout modal continues to flash without throwing unhandled exceptions.
- [ ] Vitest unit tests spy on `window.speechSynthesis.speak` to verify proper speech string formation and parameter formatting.
