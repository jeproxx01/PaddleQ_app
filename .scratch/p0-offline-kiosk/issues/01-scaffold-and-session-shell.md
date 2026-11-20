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

- [x] **Replace the Session Launch Modal** with the 3-screen setup journey: Landing Page (`/`) → New Session Wizard (`/sessions/new`) → Lobby (`/sessions/[id]/lobby`). The modal is removed entirely.
- [x] **Add the 4-step wizard routes**: ① Details (name, courts stepper, record-scores mode, target score) → ② Game Mode (4 modes + Enable Court Audio toggle) → ③ Players (bulk add / pre-populate) → ④ Review & Launch (navigates to Lobby).
- [x] **Expand the game mode enum** — `sessions.gameMode` now has `open-play`, `winner-vs-loser-pools`, `winner-takes-all-round-robin` (3 values per current domain model).
- [x] **Add `sessions` fields**: `name`, `recordScores`, `targetScore`, `timeLimitMinutes`, `status` ('lobby' | 'live' | 'ended') — all present in db schema.
- [x] **Move PIN setup out of the wizard** into the Settings route (`/sessions/[id]/settings`), defaulting to 1234 when unset.
- [x] **Relocate "Enable Court Audio"** from the launch modal to Wizard Step 2 (Game Mode).
- [x] **Scaffold the persistent Sidebar layout** component wrapping all `/sessions/[id]/*` routes — `SessionShell.tsx` and `SessionSidebar.tsx` present.
- [x] **Landing Page resume & Sidebar Courts link**: Landing Page detects active session in IndexedDB and provides direct "Resume Session" / "Go to Queue" CTAs; Sidebar LayoutGrid icon now explicitly routes to Courts (`/sessions/[id]`) with an exit action (`←`) to all sessions.

## Comments

- **Navigation & Resume Enhancement**: Resolved issue where clicking "Sessions" in the sidebar returned to the landing page without a way to re-enter the running session or Queue. The sidebar now routes `LayoutGrid` to Courts (`/sessions/[id]`) and adds an exit button (`←`) to return home. The Landing Page now queries `db.sessions` and displays an "Active session in progress" banner with direct "Courts dashboard" and "Go to Queue" buttons, as well as a local session switcher. All 84 unit tests pass.
