# Specification: PaddleQ P0 — Offline-First Kiosk & Local Web App (QMaster Parity)

Status: ready-for-agent

## Problem Statement

Pickleball open-play courts at public parks and indoor venues frequently suffer from chaotic physical paddle racks, disputes over rotation order ("Who was next?"), no-shows leaving courts empty, and partner mismatching. Furthermore, outdoor parks and indoor courts often have weak or non-existent internet connectivity, rendering cloud-dependent applications completely unusable on-site. Organizers waste significant play time acting as referees and shouting names across courts, while recreational and competitive players experience frustrating wait times, confusing rotation rules, and disputed court assignments.

## Solution

PaddleQ is an offline-first court operating system that runs both as a dedicated touch **Kiosk** (tablet or laptop at the court gate, launched via `chrome --kiosk`) and as an offline **Local Web App** served over the venue's local network (for scorer tablets/phones, TV displays, and player check-in). It provides an automated, visible, and vocal court management system with zero internet requirement:

1. **Multi-Screen Routing Workflow**: Replaces the single-screen modal launcher with a full journey — **Landing Page** (`/`) → **New Session Wizard** (`/sessions/new`, 4 steps) → **Pre-Session Lobby** (`/sessions/[id]/lobby`) → **Active Session** (`/sessions/[id]/*`) wrapped in a persistent left **Sidebar**.
2. **Three Core Game Modes**: `Open Play` (4-In / 4-Out), `Winner/Winner vs Loser/Loser` (dual-pool queue matching winners vs winners and losers vs losers), and `Winner Takes All` (bracketed round-robin tournament with Seeded High-Low balanced pairing, live leaderboard, and grand prize) — plus **Mixed Doubles** format support and per-player **Win/Loss tracking**.
3. **Five Skill Tiers**: Beginner, Low Intermediate, Intermediate, High Intermediate, and Advanced, with **gender metadata** and explicit **mixing rules** to keep foursomes balanced.
4. **QMaster Composite Dispatch Engine**: Transparently and fairly assigns waiting players to open courts using a sliding candidate window of the **first 14 eligible players** (FIFO backbone), ranked by Waited Longest, Skill Mix, New Partners, and a **repeat-opponent penalty**. Every court assignment displays a tappable "Why these 4?" badge and a full **audit trail**.
5. **Automated Court Audio & Visual Calling**: Uses the device's native offline Web Speech API (with selectable voices, horns/bells, and per-screen audio controls) to call player names and court numbers over connected speakers, paired with a high-visibility full-screen visual flash.
6. **Flexible Scorekeeper & Rotation Rules**: Rapid numeric score entry with 1-tap winner selection, plus **score correction**, **undo**, **abandon match**, and **soft win-by-2** enforcement.
7. **PIN Admin Drawer (Settings)**: Password-protected organizer controls to adjust court count, switch game mode, unlock partnerships, evict no-shows, manage court groups, load session presets, and end the session. PIN setup lives in Settings, not the wizard.
8. **Secondary TV Broadcast & Device Linking**: A read-only `/show` broadcast route for TV displays, plus **QR self check-in** ("Am I next?") and **WebRTC device linking** (Kiosk / Scorer / Display roles) over the local network.
9. **Analytics & Export**: A session recap dashboard (win/loss per player, courts played, average wait time) with Excel (`.xlsx`) export.
10. **Resilient Local Persistence**: Persists all session data locally in IndexedDB using UUID primary keys, surviving browser refreshes and device battery loss.

## User Stories

### Session Initialization & Setup

1. As an organizer, I want to open the Landing Page and tap "Start a session →", so that I can begin setup with one touch without an account.
2. As an organizer, I want a 4-step New Session Wizard (`/sessions/new`), so that I configure Details, Game Mode, Players, and Review in a guided sequence instead of a single modal.
3. As an organizer, I want to set the session name, court count (1 to 12 via stepper), record-scores mode (Just winners vs Winners and scores), and target score in Step 1 (Details), so that the board matches the venue's active capacity.
4. As an organizer, I want to pick the Game Mode (`Open Play`, `Winner/Winner vs Loser/Loser`, or `Winner Takes All`) and toggle "Enable Court Audio" in Step 2, so that rotation and audio rules are configured up front.
5. As an organizer, I want to bulk-add or pre-populate players in Step 3 (Players), so that I can optionally pre-load a roster before the session starts.
6. As an organizer, I want a Review step (Step 4) summarizing all settings before tapping "Start session →", so that I can confirm the configuration and proceed to the Lobby.
7. As an organizer, I want to establish a 4-digit PIN (defaulting to 1234) in the Settings screen after launch, so that players cannot tamper with court counts or rotation settings.
8. As an organizer, I want a 1-tap "Enable Court Audio" activation prompt during setup, so that browser autoplay policies do not silence court callouts.
9. As a developer/organizer, I want a "Load Demo Session" button, so that I can instantly populate courts and players with varying skills to verify system behavior.

### Player Check-in & Queue Joining (Lobby)

10. As a casual walk-in player, I want to tap "Join Solo", enter my name in 3 seconds, and pick my Skill Level, so that I can queue up without downloading an app or creating an account.
11. As a returning player, I want autocomplete suggestions to appear as I type my name, so that I can tap my name with 1 touch and automatically restore my saved skill level and gender without creating a duplicate record.
12. As a paired duo, I want to tap "Join Pair", enter both player names, and have a Team Lock created, so that we are guaranteed to play on the same court together.
13. As a complete foursome, I want to tap "Join 4-Stack", enter all four names, and enter the queue directly as a full Stack, so that our group stays together for our next match.
14. As a solo player, I want my entry to automatically merge into the oldest incomplete Stack (1/4, 2/4, or 3/4), so that groups fill up efficiently in the order they arrived.
15. As a waiting player, I want to see my position badge (#1 Next Up, #2 On Deck) and a venue readiness count (e.g., "8 ready — enough for 2 games"), so that I know exactly when to prepare my paddle and stretch.
16. As an organizer in the Lobby, I want player status tabs (`Not here`, `Ready`, `Resting`) and an attendance progress bar, so that I can check players in and know how many are ready to start.
17. As an organizer, I want a "Start session →" CTA in the Lobby that transitions the session to `Live`, so that the active courts view opens only when play begins.

### Court Monitoring & Timers

18. As a player standing in the sun, I want high-contrast "Electric Obsidian" cards with clear status pills (IN PLAY, OPEN), so that I can read court statuses from a distance.
19. As an organizer, I want to see a live elapsed match timer on every active Court card in tabular monospace font, so that I can track match durations without visual jitter.
20. As an organizer, I want active court timers to visually shift to Warm Tangerine when a match exceeds 20 minutes, so that I can easily spot stalled games and keep open play moving.
21. As a player, I want to see which specific players are currently on each active Court, so that I know who is playing where.
22. As a player on a Time-Based court, I want to see a countdown clock with a warning flash at 2 minutes remaining and an auto-call at time-up, so that I know exactly when the match ends.

### Automated Dispatch & Audio Court Calling

23. As a player, I want the Kiosk to automatically dispatch the next eligible Stack the moment a Court is marked finished, so that courts do not sit empty waiting for manual intervention.
24. As a waiting player, I want the Dispatch engine to pick players fairly by giving primary weight to who waited longest (FIFO backbone), so that nobody skips ahead in line without justification.
25. As a competitive player, I want the Dispatch engine to balance all five skill tiers within the first-14 waiting window, so that games are competitive and fun.
26. As a player, I want the Dispatch engine to avoid pairing me with repeat opponents (not just partners) from recent matches, so that open play feels diverse and social.
27. As a curious or skeptical player, I want to tap a "Why these 4?" badge on any dispatched Court card, so that I can see the exact Selection Criteria used (e.g., "Waited longest", "Skill mix", "New partners", "No repeat opponents") and know the assignment was fair.
28. As an organizer, I want a full audit trail logging every dispatch decision with timestamp and reasoning, so that I can review past assignments and resolve disputes later.
29. As a player warming up on the sideline, I want the Kiosk to announce court assignments via offline text-to-speech through a Bluetooth speaker (e.g., "Court 2 is ready for Stack 1: Alex, Dave, Sarah, and Lisa"), so that I hear my call even if I am not looking at the screen.
30. As a player in a loud gym, I want a full-screen high-visibility visual flash displaying the assigned Court number for 10 seconds, so that I cannot miss my court call even if audio is muted or inaudible.
31. As an organizer, I want selectable device/AI voices, horn/bell audio cues on dispatch, win, and time-up, and per-screen audio controls (mute the Kiosk but keep TV sound), so that callouts fit the venue.

### Scorekeeping & Game Modes

32. As a player completing a match, I want to walk up to the Kiosk, tap "Record Score" on my Court, and enter the numeric game score using a fast Big-Pad numeric keypad, so that score submission takes under 10 seconds.
33. As a player recording a score, I want to tap the winning pair with 1 touch, so that winners are clearly designated without complex form validation.
34. As a player, I want soft win-by-2 enforcement (accepted flexibly, not rigidly blocking), so that time-capped or sudden-death games are never stuck at the Kiosk.
35. As a player who mis-entered a score, I want to correct the score after submission or undo the last score entry, so that a typo does not corrupt the match record.
36. As an organizer, I want to abandon a match (remove it from the court without a score), so that stalled or abandoned games can be cleared without inventing a result.
37. As a winning team in an Open Play session, I want the Kiosk to rotate all four players off the court and back into the queue according to our post-match choice, so that new waiting players get on court.
38. As a winning team in a Winners Stay & Split session, I want my partner and me to remain on court while the losing team rotates out, so that winning earns continuous court time.
39. As an organizer in a Winners Stay & Split session, I want the Kiosk to enforce a strict Max Win Limit of 2 consecutive wins, forcing winners off after their second consecutive win so no group hogs a court indefinitely.
40. As a winning player recording a score, I want to be prompted with a Post-Match Choice (Stay Together, Same Players New Teams, or Shuffle), so that our group can choose how we re-enter rotation.
41. As players choosing "Stay Together", I want our pair to remain a locked Pair (Team Lock) in the queue, so that we continue playing together in future rotations.
42. As players choosing "Shuffle", I want all four players to exit as individual Solo entries at the back of the queue, so that we can mix with other players.
43. As a competitive player on a Challenge Court, I want the winning pair to hold the court and face the next waiting pair, with a streak cap forcing them off after the configured limit, so that the challenge format stays fair.
44. As a player, I want my per-player Win/Loss record tracked across the session, so that I can see my performance in the recap and export.

### Organizer Controls (PIN Admin Drawer / Settings)

45. As an organizer, I want to open a slide-out PIN Admin Drawer from the Settings route by entering my 4-digit PIN, so that authorized settings are secure from accidental taps by players.
46. As an organizer, I want to increase or decrease the active Court count (1 to 12) during a live session, so that courts can be added or closed as venue availability changes.
47. As an organizer, I want to switch the Session Game Mode mid-session, so that I can adapt rules to changing queue sizes.
48. As an organizer, I want to manually unlock any Team Lock from the admin drawer, so that partners who wish to disband can be split back into solo players.
49. As an organizer, I want to remove an absent player or disband a stuck Stack directly from the admin drawer, so that missing walk-ins do not block courts or other waiting players.
50. As an organizer, I want to override a player's self-declared Skill Level, so that sandbagging or mismatched skill levels can be corrected.
51. As an organizer, I want to define court groups (e.g., "Beginner courts") and save/load session presets, so that recurring setups are one tap away.
52. As an organizer, I want to end the active Session with a confirmation prompt, so that the kiosk safely finalizes records and resets for the next event.

### Secondary Display, Device Linking & Check-In

53. As an organizer, I want to open the read-only `/show` route on a TV (via HDMI or local-network cast), so that the whole venue sees live court assignments, winner moments, and queue animations.
54. As a waiting player, I want to scan a QR code displayed on the Kiosk with my phone and land on a local-network page showing my queue position ("Am I next?"), so that I can check my spot without crowding the Kiosk.
55. As an organizer, I want to link multiple devices (a scoring tablet, the main Kiosk, and a TV) via a local join code or QR using WebRTC data channels, with each device assigned a role (Kiosk, Scorer, Display), so that the session works across devices without internet.

### Analytics & Export

56. As an organizer, I want a session recap dashboard showing win/loss per player, courts played, and average wait time, so that I can review the session at a glance.
57. As an organizer, I want to export the session recap to an Excel (`.xlsx`) file, so that I can share or archive results offline.

### Offline Reliability & Persistence

58. As an organizer, I want all session state, court allocations, queues, and player records persisted in local IndexedDB with UUID primary keys, so that refreshing the browser or recovering from a dead battery loses zero data.
59. As an organizer operating in a remote park, I want the entire application to load, function, announce speech, and record scores with zero internet connectivity, so that the venue operates seamlessly regardless of cellular reception.

## Implementation Decisions

### Application Architecture & Routing

1. **Application Directory (`app/`)**: All Next.js application code, components, state management, and tests reside inside the [`app/`](file:///C:/Users/Jeffrey/Desktop/Project/Pickle_app/PickleQ/app) directory. The repository root remains reserved for agent workflow files, GLOSSARY.md, ADRs, documentation, and the issue tracker.
2. **Multi-Screen Routing Workflow** (replaces the single-screen modal launcher):
   - `/` — Landing Page: dark "Electric Obsidian" hero with a "Start a session →" action alongside a live preview showcase.
   - `/sessions/new` — 4-step New Session Wizard: **① Details** (name, courts stepper, record-scores mode, target score) → **② Game Mode** (4 modes + Enable Court Audio toggle) → **③ Players** (bulk add / pre-populate) → **④ Review & Launch** (navigates to Lobby).
   - `/sessions/[id]/lobby` — Pre-session Lobby: status tabs (`Not here`, `Ready`, `Resting`), attendance progress bar, and "Start session →" CTA to transition to `Live`.
   - `/sessions/[id]` — Active courts view (`Live`), wrapped in the persistent sidebar layout.
3. **Persistent Left Sidebar** (wraps all `/sessions/[id]/*` routes, collapsed 64px, `#0B0F19`):
   - `Sessions` → `/` · `Lobby` → `/lobby` · `Queue` → `/queue` · `Players` → `/players` · `History` → `/history` · `Summary` → `/summary` · `Settings` → `/settings` (PIN Admin) · `Show` → `/show` (broadcast).
4. **Dual-Mode Deployment**: The same build operates as (a) a dedicated touch Kiosk via `chrome --kiosk` and (b) an offline Local Web App served over the venue's LAN IP for scorer tablets/phones, TV displays via `/show`, and player QR check-in. No cloud endpoint is contacted.

### Feature-Isolated Modules

5. **Feature Slice Structure** (strictly separated responsibilities, cross-feature imports only via `shared/`):
   - `features/queue/`: Paddle rack, multi-entry join modals, FIFO position badges, stack merging, and check-in states.
   - `features/courts/`: Active court grid, live/countdown timers, status badges, and visual court flash callouts.
   - `features/scoring/`: Big-Pad scorekeeper, winner selection, correction/undo/abandon, soft win-by-2, and post-match transitions.
   - `features/game-modes/`: Open Play, Winners Stay & Split, Challenge Court, and Time-Based rotation semantics.
   - `features/dispatch/`: QMaster composite dispatch engine (first-14 window, skill mix, new partners, repeat-opponent penalty), "Why these 4?" explanation generator, and audit trail.
   - `features/admin/`: PIN-protected drawer, session configuration, court groups, presets, eviction, and demo seeding.
   - `features/linking/`: QR self check-in and WebRTC device linking (roles, join codes).
   - `features/show/`: Read-only TV broadcast screen and queue/court animations.
   - `features/analytics/`: Session recap dashboard and `.xlsx` export.
   - `shared/`: High-contrast UI primitives ("Electric Obsidian" design tokens), audio synthesizer adapter, and generic layout containers.

### Offline Persistence & Data Layer (ADR-0001)

6. **IndexedDB via Dexie.js with UUID Primary Keys**:
   - `sessions`: `id` (UUID), `status` ('lobby' | 'live' | 'ended'), `name`, `courtCount`, `gameMode` ('open-play' | 'winners-stay-split' | 'challenge-court' | 'time-based'), `recordScores` ('winners' | 'winners-and-scores'), `targetScore`, `timeLimitMinutes`, `pin`, `audioEnabled`, `startedAt`, `endedAt`.
   - `players`: `id` (UUID), `name`, `skillLevel` ('beginner' | 'low-intermediate' | 'intermediate' | 'high-intermediate' | 'advanced'), `gender`, `wins`, `losses`, `gamesPlayed`, `createdAt`.
   - `stacks`: `id` (UUID), `sessionId`, `entryType` ('solo' | 'pair' | 'foursome'), `playerIds` (UUID array), `teamLockId` (optional UUID), `queuedAt`, `status` ('waiting' | 'dispatched' | 'cancelled').
   - `courts`: `id` (UUID), `sessionId`, `courtNumber` (1-12), `courtGroupId` (optional), `status` ('open' | 'in_play'), `activeMatchId` (optional UUID), `updatedAt`.
   - `matches`: `id` (UUID), `sessionId`, `courtId`, `gameMode`, `playerIds` (UUID array of 4), `team1PlayerIds` (UUID array of 2), `team2PlayerIds` (UUID array of 2), `score1`, `score2`, `winningTeam` (1 | 2), `consecutiveWins` (number), `selectionReasons` (string array), `mixedDoubles` (boolean), `status` ('in_play' | 'completed' | 'abandoned'), `startedAt`, `completedAt`.
   - All models use string UUIDs generated client-side via `crypto.randomUUID()`, preserving future synchronization compatibility with SQLite and cloud PostgreSQL (Supabase) without key collision or re-indexing issues.

### Game Modes & Rotation Mechanics

7. **Four Game Modes** (replaces the two-value `rotationMode`):
   - `Open Play` (4-In / 4-Out): all four players rotate off after each match.
   - `Winners Stay & Split`: the winning pair stays and splits into opposing teams; capped at Max Win Limit (2 consecutive wins).
   - `Challenge Court`: king-of-the-court — the winning pair holds the court and faces the next waiting pair, subject to a streak cap.
   - `Time-Based`: courts run a countdown clock (default 15 minutes) with a 2-minute warning flash and an auto-call + auto-end at time-up.
   - Each mode supports **Mixed Doubles** format and feeds per-player **Win/Loss tracking**.
8. **Skill Mixing & Gender**: Five skill tiers (Beginner, Low Intermediate, Intermediate, High Intermediate, Advanced) with explicit mixing rules and gender metadata to keep foursomes balanced.

### Dispatch & Queue Mechanics

9. **First-14 Sliding Window Dispatch Algorithm**:
   - The engine evaluates an open court using a candidate pool of the **first 14 eligible waiting players** in FIFO order.
   - Candidate foursomes are ranked by: (1) highest average wait time (strict FIFO backbone), (2) skill balance across the five tiers, (3) partner novelty, and (4) a **repeat-opponent penalty** (penalizing any repeat pairing from recent matches, not just partners).
   - The court card shows a tappable "Why these 4?" badge listing the applied criteria, and every decision is logged to an **audit trail** (timestamp + reasoning).
10. **Post-Match Choice**: *Stay Together* (re-enter as Team Lock), *Same Players New Teams* (immediate rematch with swapped teams), or *Shuffle* (four solo entries at the queue tail).

### Audio & Device APIs

11. **Autoplay-Compliant Web Speech API**:
    - Offline announcements run through `window.speechSynthesis` (`SpeechSynthesisUtterance`), with selectable device/AI voices, horn/bell cues (dispatch, win, time-up), and per-screen audio controls (e.g., mute Kiosk, keep TV sound).
    - An explicit "Enable Court Audio" action (Wizard Step 2) unlocks audio playback on iOS/iPadOS and Android tablet browsers.
    - Graceful degradation: if speech fails or is unsupported, the 10-second visual callout remains fully functional.
12. **Local Device Linking**: QR self check-in serves a local-network page showing queue position; WebRTC data channels (signaled over the LAN, no internet) link devices with roles Kiosk / Scorer / Display.

### UI & Styling System ("Electric Obsidian")

13. **Design System Tokens**:
    - Background Base: `#0B0F19` (Obsidian Dark) · Card Surface: `#161F30` · Card Border: `#24324D`.
    - Primary Action / Highlight: `#CCFF00` (Pickleball Volt) · Status & Live: `#00E5FF` (Electric Cyan) · Warning & Alert: `#FF8A00` (Warm Tangerine).
    - Typography: sans for interface text; monospace tabular numbers for timers and scores.
    - Minimum button height of 56px (`h-14`) with `rounded-xl` corners for touch usability.

## Testing Decisions

### What Makes a Good Test

Tests must exclusively test **observable external behavior**, never private component implementation details, internal reducer methods, or internal IndexedDB mechanics. Tests should survive refactorings as long as user-facing interactions and business rules remain invariant.

### Testing Seams & Frameworks

1. **End-to-End Kiosk UI Seam (Playwright - Highest Seam)**:
   - Tool: Playwright against a tablet viewport (1024x768); Page Object Model (`KioskPageObject`) covering Landing, Wizard, Lobby, Courts Grid, Queue, Scorekeeper, Settings Drawer, and `/show` broadcast.
   - Scenarios:
     - Landing → Wizard → Lobby → Live journey: Start a session through all 4 wizard steps and verify the sidebar routes render.
     - Walk-in join flow: Join Solo → enter name → select skill → verify appearance in the Queue and check-in state transitions (Not here / Ready / Resting).
     - Match progression: Mark Court Finished → enter 11–8 → select winner → verify automated dispatch and visual court call modal.
     - Game mode coverage: Time-Based countdown → warning flash → auto-call at time-up; Challenge Court streak cap.
     - Audio trigger verification: Spy on `window.speechSynthesis.speak` to verify speech string generation and horn/bell cues.
     - Organizer PIN flow: Open Settings → enter 1234 → adjust court count → verify grid updates.
     - QR check-in and `/show` broadcast render against local-network URLs.
  2. **Domain Engine Seam (Vitest - Core Invariant Seam)**:
   - Tool: Vitest for pure TypeScript domain functions.
   - Scenarios:
     - First-14 FIFO window: players outside the top-14 pool are never dispatched ahead of older players.
     - Repeat-opponent penalty: recent opponents are deprioritized versus fresh pairings.
     - Skill mixing: five-tier balancing and gender mixing rules produce balanced foursomes.
     - Max Win Limit / Challenge streak cap: a pair winning 2 consecutive games is forced off.
     - Time-Based auto-end: countdown reaching zero auto-ends the match and dispatches the next stack.
     - Stack merging: solo joins merge chronologically into incomplete stacks.
     - Selection criteria + audit trail: "Why these 4?" output reflects the applied heuristic; dispatch decisions are logged.
     - Scoring corrections/undo/abandon and win/loss tracking state transitions.
     - Post-match transitions: Team Lock on "Stay Together" vs solo re-entry on "Shuffle".
     - `.xlsx` export: recap data serializes correctly.

## Out of Scope

The following capabilities are explicitly deferred to post-MVP iterations and are out of scope for this build:

1. **Cloud Synchronization & User Accounts**: No cloud sync worker, Supabase synchronization, cloud endpoints, SSO, or user accounts. The system stays 100% offline-first / local network.
2. **DUPR Official Partner Export**: No export to DUPR rating servers or numeric DUPR rating calculations (2.5–5.0).
3. **Automated 45-Second Ghost Player Countdown**: No automated countdown timer evicting unresponsive players; organizers handle no-shows manually via the PIN Admin Drawer.
4. **Tournament Bracketing**: No Single Elimination, Double Elimination, or Round Robin pool play bracketing.
5. **Cross-Session Leaderboards**: No multi-session player leaderboards or historical stat screens; analytics are scoped to a single session recap.

## Further Notes

- **Ubiquitous Language Compliance**: All code identifiers, interface types, and UI strings must strictly adhere to [GLOSSARY.md](file:///C:/Users/Jeffrey/Desktop/Project/Pickle_app/PickleQ/GLOSSARY.md). Use *Kiosk* (not board), *Session* (not game night), *Court* (not lane), *Stack* (not group), *Team Lock* (not partnership flag), *Game Mode* (not algorithm), *Dispatch* (not assignment), and *PIN Admin Drawer* (not settings panel).
- **Subdirectory Execution**: The application lives in `app/`. Root configuration files (`AGENTS.md`, `GLOSSARY.md`, `skills-lock.json`) must remain in place.
