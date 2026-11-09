# 01: App Scaffold, Design System Tokens, and Session Launch Shell

**What to build:** The foundational Next.js application scaffold inside the `app/` directory with the "Electric Obsidian" design system tokens, local storage setup via Dexie.js (IndexedDB) with UUID primary keys (ADR-0001), Vitest setup, and the initial Kiosk Session launch experience. An organizer can start a new Session by picking court count (1–12, defaulting to 4), setting a 4-digit PIN (defaulting to 1234), and tapping the "Enable Court Audio" toggle. The active session state persists across browser page refreshes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Next.js app scaffold created in `app/` with Tailwind CSS configured with "Electric Obsidian" color tokens (`#0B0F19` base, `#161F30` card surface, `#24324D` border, `#CCFF00` volt primary, `#00E5FF` cyan accent, `#FF8A00` tangerine warning) and typography (`font-sans`, `font-mono`/`tabular-nums`).
- [ ] Vitest test runner configured and working for pure TypeScript domain testing.
- [ ] Dexie.js (IndexedDB) database initialized with UUID primary keys for `sessions`, `players`, `stacks`, `courts`, and `matches` according to ADR-0001.
- [ ] Session Launch Modal renders when no active session exists: allows setting initial Court count (1–12, default 4), Rotation Mode (`4-In / 4-Out` or `Winners Stay & Split`), and 4-digit PIN (default 1234).
- [ ] One-tap "Enable Court Audio" button on session launch initializes browser audio context to unlock speech synthesis autoplay policies.
- [ ] Active session state persists in local storage so refreshing the browser returns directly to the active session view.
