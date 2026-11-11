# 01: App Scaffold, Design System Tokens, and Session Launch Shell

**What to build:** The foundational Next.js application scaffold inside the `app/` directory with the "Electric Obsidian" design system tokens, local storage setup via Dexie.js (IndexedDB) with UUID primary keys (ADR-0001), Vitest setup, and the initial Kiosk Session launch experience. An organizer can start a new Session by picking court count (1–12, defaulting to 4), setting a 4-digit PIN (defaulting to 1234), and tapping the "Enable Court Audio" toggle. The active session state persists across browser page refreshes.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Next.js app scaffold created in `app/` with Tailwind CSS configured with "Electric Obsidian" color tokens (`#0B0F19` base, `#161F30` card surface, `#24324D` border, `#CCFF00` volt primary, `#00E5FF` cyan accent, `#FF8A00` tangerine warning) and typography (`font-sans`, `font-mono`/`tabular-nums`).
- [x] Vitest test runner configured and working for pure TypeScript domain testing.
- [x] Dexie.js (IndexedDB) database initialized with UUID primary keys for `sessions`, `players`, `stacks`, `courts`, and `matches` according to ADR-0001.
- [x] Session Launch Modal renders when no active session exists: allows setting initial Court count (1–12, default 4), Rotation Mode (`4-In / 4-Out` or `Winners Stay & Split`), and 4-digit PIN (default 1234).
- [x] One-tap "Enable Court Audio" button on session launch initializes browser audio context to unlock speech synthesis autoplay policies.
- [x] Active session state persists in local storage so refreshing the browser returns directly to the active session view.

## Retrofit (QMaster Parity — required)

> [!WARNING]
> This ticket is resolved, but the shipped single-screen Session Launch Modal must be replaced by the multi-screen routing workflow. The shared `sessions.gameMode` type change below must land before tickets `#09`–`#14`.

- [ ] **Replace the Session Launch Modal** with the 3-screen setup journey: Landing Page (`/`) → New Session Wizard (`/sessions/new`) → Lobby (`/sessions/[id]/lobby`). The modal is removed entirely.
- [ ] **Add the 4-step wizard routes**: ① Details (name, courts stepper, record-scores mode, target score) → ② Game Mode (4 modes + Enable Court Audio toggle) → ③ Players (bulk add / pre-populate) → ④ Review & Launch (navigates to Lobby).
- [ ] **Expand the game mode enum** from 2 → 4 values on `sessions.gameMode`: `open-play`, `winners-stay-split`, `challenge-court`, `time-based`. Rename the former `4-In / 4-Out` to `Open Play`.
- [ ] **Add `sessions` fields**: `name`, `recordScores` ('winners' | 'winners-and-scores'), `targetScore`, `timeLimitMinutes`, `status` ('lobby' | 'live' | 'ended').
- [ ] **Move PIN setup out of the wizard** into the Settings route (`/sessions/[id]/settings`), defaulting to 1234 when unset.
- [ ] **Relocate "Enable Court Audio"** from the launch modal to Wizard Step 2 (Game Mode).
- [ ] **Scaffold the persistent Sidebar layout** component wrapping all `/sessions/[id]/*` routes with `Sessions` / `Lobby` / `Queue` / `Players` / `History` / `Summary` / `Settings` / `Show`.
