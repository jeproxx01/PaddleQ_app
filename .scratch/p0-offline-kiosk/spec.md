# Specification: PaddleQ P0 Offline Kiosk

Status: ready-for-agent

## Problem Statement

Pickleball open-play courts at public parks and indoor venues frequently suffer from chaotic physical paddle racks, disputes over rotation order ("Who was next?"), no-shows leaving courts empty, and partner mismatching. Furthermore, outdoor parks and indoor courts often have weak or non-existent internet connectivity, rendering cloud-dependent applications completely unusable on-site. Organizers waste significant play time acting as referees and shouting names across courts, while recreational and competitive players experience frustrating wait times, confusing rotation rules, and disputed court assignments.

## Solution

PaddleQ is an offline-first kiosk court operating system running on a tablet or laptop positioned at the court gate. It provides an automated, visible, and vocal court management system with zero internet requirement:
1. **Multi-Entry Paddle Stacking**: Supports Solo (1/4), Pair (2/4 with Team Lock), and Full Foursome (4/4) joins via a high-contrast 3-second touch workflow.
2. **QMaster Composite Dispatch Engine**: Transparently and fairly assigns waiting players to open courts based on clear priority criteria: Waited Longest (FIFO backbone), Skill Mix (balanced Beginner, Intermediate, Advanced), and New Partners (avoiding repetitive pairings). Every court assignment displays a tappable "Why these 4?" badge to instantly resolve disputes.
3. **Automated Court Audio & Visual Calling**: Uses the device's native offline Web Speech API to call player names and court numbers over connected speakers, paired with a high-visibility full-screen visual flash.
4. **Flexible Big-Pad Scorekeeper & Rotation Rules**: Allows rapid numeric score entry with 1-tap winner selection, enforcing either `4-In / 4-Out` or `Winners Stay & Split` (with a strict 2-consecutive-win limit) and prompting winners with clear post-match transitions.
5. **PIN Admin Drawer**: Gives organizers password-protected oversight to adjust court count, toggle rotation modes, unlock partnerships, evict no-shows, or disband stalled stacks.
6. **Resilient Local Persistence**: Persists all session data locally in IndexedDB using UUID primary keys, surviving browser refreshes and device battery loss.

## User Stories

### Session Initialization & Setup
1. As an organizer, I want to create a new Session on the Kiosk by setting the court count (1 to 12) and rotation mode, so that the board matches the venue's active capacity.
2. As an organizer, I want to establish a 4-digit PIN when launching a Session (defaulting to 1234 if skipped), so that players cannot tamper with court counts or rotation settings.
3. As an organizer, I want a 1-tap "Enable Court Audio" activation prompt during session startup, so that browser autoplay policies do not silence court callouts.
4. As an organizer, I want to mirror the Kiosk display to an external TV monitor via HDMI or wireless casting, so that players across the entire venue can see the active queue and courts.
5. As a developer/organizer, I want a "Load Demo Session" button in admin/development mode, so that I can instantly populate 4 active courts and 12 queued players with varying skills to verify system behavior.

### Player Check-in & Queue Joining
6. As a casual walk-in player, I want to tap "Join Solo", enter my name in 3 seconds, and pick my Skill Level, so that I can queue up without downloading an app or creating an account.
7. As a returning player, I want autocomplete suggestions to appear as I type my name, so that I can tap my name with 1 touch and automatically restore my saved skill level without creating a duplicate record.
8. As a paired duo, I want to tap "Join Pair", enter both player names, and have a Team Lock created, so that we are guaranteed to play on the same court together.
9. As a complete foursome, I want to tap "Join 4-Stack", enter all four names, and enter the queue directly as a full Stack, so that our group stays together for our next match.
10. As a solo player, I want my entry to automatically merge into the oldest incomplete Stack (1/4, 2/4, or 3/4), so that groups fill up efficiently in the order they arrived.
11. As a waiting player, I want to see my position badge (#1 Next Up, #2 On Deck) and a venue readiness count (e.g., "8 ready — enough for 2 games"), so that I know exactly when to prepare my paddle and stretch.

### Court Monitoring & Timers
12. As a player standing in the sun, I want high-contrast "Electric Obsidian" cards with clear status pills (IN PLAY, OPEN), so that I can read court statuses from a distance.
13. As an organizer, I want to see a live elapsed match timer on every active Court card in tabular monospace font, so that I can track match durations without visual jitter.
14. As an organizer, I want active court timers to visually shift to Warm Tangerine when a match exceeds 20 minutes, so that I can easily spot stalled games and keep open play moving.
15. As a player, I want to see which specific players are currently on each active Court, so that I know who is playing where.

### Automated Dispatch & Audio Court Calling
16. As a player, I want the Kiosk to automatically dispatch the next eligible Stack the moment a Court is marked finished, so that courts do not sit empty waiting for manual intervention.
17. As a waiting player, I want the Dispatch engine to pick players fairly by giving primary weight to who waited longest (FIFO backbone), so that nobody skips ahead in line without justification.
18. As a competitive player, I want the Dispatch engine to balance Beginner, Intermediate, and Advanced skill tiers within the top waiting window (6–8 players), so that games are competitive and fun.
19. As a player, I want the Dispatch engine to avoid pairing me with the exact same players from my immediate previous match, so that open play feels diverse and social.
20. As a curious or skeptical player, I want to tap a "Why these 4?" badge on any dispatched Court card, so that I can see the exact Selection Criteria used (e.g., "Waited longest", "Skill mix", "New partners") and know the assignment was fair.
21. As a player warming up on the sideline, I want the Kiosk to announce court assignments via offline text-to-speech through a Bluetooth speaker (e.g., "Court 2 is ready for Stack 1: Alex, Dave, Sarah, and Lisa"), so that I hear my call even if I am not looking at the screen.
22. As a player in a loud gym, I want a full-screen high-visibility visual flash displaying the assigned Court number for 10 seconds, so that I cannot miss my court call even if audio is muted or inaudible.

### Scorekeeping & Rotation Modes
23. As a player completing a match, I want to walk up to the Kiosk, tap "Record Score" on my Court, and enter the numeric game score using a fast Big-Pad numeric keypad, so that score submission takes under 10 seconds.
24. As a player recording a score, I want to tap the winning pair with 1 touch, so that winners are clearly designated without complex form validation.
25. As a player, I want the scorekeeper to accept flexible numeric scores (e.g., 11–9, 15–13) without rigidly blocking on "win by 2" formatting, so that time-capped or sudden-death games are never stuck at the Kiosk.
26. As a winning team in a 4-In / 4-Out session, I want the Kiosk to rotate all four players off the court and back into the queue according to our post-match choice, so that new waiting players get on court.
27. As a winning team in a Winners Stay & Split session, I want my partner and me to remain on court while the losing team rotates out, so that winning earns continuous court time.
28. As an organizer in a Winners Stay & Split session, I want the Kiosk to enforce a strict Max Win Limit of 2 consecutive wins, forcing winners off after their second consecutive win so no group hogs a court indefinitely.
29. As a winning player recording a score, I want to be prompted with a Post-Match Choice (Stay Together, Same Players New Teams, or Shuffle), so that our group can choose how we re-enter rotation.
30. As players choosing "Stay Together", I want our pair to remain a locked Pair (Team Lock) in the queue, so that we continue playing together in future rotations.
31. As players choosing "Shuffle", I want all four players to exit as individual Solo entries at the back of the queue, so that we can mix with other players.

### Organizer Controls (PIN Admin Drawer)
32. As an organizer, I want to open a slide-out PIN Admin Drawer by entering my 4-digit PIN, so that authorized settings are secure from accidental taps by players.
33. As an organizer, I want to increase or decrease the active Court count (1 to 12) during a live session, so that courts can be added or closed as venue availability changes.
34. As an organizer, I want to switch the Session Rotation Mode between `4-In / 4-Out` and `Winners Stay & Split` mid-session, so that I can adapt rules to changing queue sizes.
35. As an organizer, I want to manually unlock any Team Lock from the admin drawer, so that partners who wish to disband can be split back into solo players.
36. As an organizer, I want to remove an absent player or disband a stuck Stack directly from the admin drawer, so that missing walk-ins do not block courts or other waiting players.
37. As an organizer, I want to override a player's self-declared Skill Level, so that sandbagging or mismatched skill levels can be corrected.
38. As an organizer, I want to end the active Session with a confirmation prompt, so that the kiosk safely finalizes records and resets for the next event.

### Offline Reliability & Persistence
39. As an organizer, I want all session state, court allocations, queues, and player records persisted in local IndexedDB with UUID primary keys, so that refreshing the browser or recovering from a dead battery loses zero data.
40. As an organizer operating in a remote park, I want the entire application to load, function, announce speech, and record scores with zero internet connectivity, so that the venue operates seamlessly regardless of cellular reception.

## Implementation Decisions

### Module Boundaries & Directory Structure
1. **Application Directory (`app/`)**: All Next.js application code, components, state management, and tests will reside inside the [`app/`](file:///C:/Users/Jeffrey/Desktop/Project/Pickle_app/PickleQ/app) directory. The repository root remains strictly reserved for agent workflow files, GLOSSARY.md, ADRs, documentation, and issue tracker specifications.
2. **Feature-Isolated Architecture**: Code is structured into isolated feature slices with strictly separated responsibilities:
   - `features/queue/`: Paddle rack, multi-entry join modals, FIFO position badges, and stack merging.
   - `features/courts/`: Active court grid, live match timers, status badges, and visual court flash callouts.
   - `features/scoring/`: Big-Pad numeric scorekeeper, winner selection, and post-match choice transitions.
   - `features/admin/`: PIN-protected drawer, session configuration, manual player eviction, and demo seeding.
   - `features/dispatch/`: QMaster composite dispatch engine (waited longest, skill mix, new partners) and "Why these 4?" explanation generator.
   - `shared/`: High-contrast UI primitives ("Electric Obsidian" design tokens), audio synthesizer adapter, and generic layout containers. No cross-feature imports are permitted except through shared primitives.

### Offline Persistence & Data Layer (ADR-0001)
3. **IndexedDB via Dexie.js with UUID Primary Keys**:
   - The application uses Dexie.js to manage in-browser IndexedDB storage with strict relational table schemas:
     - `sessions`: `id` (UUID), `status`, `courtCount`, `rotationMode`, `pin`, `startedAt`, `endedAt`.
     - `players`: `id` (UUID), `name`, `skillLevel` ('Beginner' | 'Intermediate' | 'Advanced'), `gamesPlayed`, `createdAt`.
     - `stacks`: `id` (UUID), `sessionId`, `entryType` ('solo' | 'pair' | 'foursome'), `playerIds` (UUID array), `teamLockId` (optional UUID), `queuedAt`, `status` ('waiting' | 'dispatched' | 'cancelled').
     - `courts`: `id` (UUID), `sessionId`, `courtNumber` (1-12), `status` ('open' | 'in_play'), `activeMatchId` (optional UUID), `updatedAt`.
     - `matches`: `id` (UUID), `sessionId`, `courtId`, `playerIds` (UUID array of 4), `team1PlayerIds` (UUID array of 2), `team2PlayerIds` (UUID array of 2), `score1`, `score2`, `winningTeam` (1 | 2), `consecutiveWins` (number), `selectionReasons` (string array), `startedAt`, `completedAt`.
   - All models use string UUIDs generated client-side via `crypto.randomUUID()`. This guarantees future synchronization compatibility with SQLite and cloud PostgreSQL (Supabase) without key collision or re-indexing issues.

### Dispatch & Queue Mechanics
4. **Sliding Window Dispatch Algorithm**:
   - The dispatch engine evaluates an open court using a candidate pool constrained to the oldest **6 to 8 eligible waiting players** in the FIFO line.
   - Within this window, the engine ranks candidate foursomes by:
     1. Highest average wait time (strict FIFO backbone; never skipped without recorded cause).
     2. Skill balance (minimizing variance between Beginner, Intermediate, and Advanced tiers across both opposing sides).
     3. Partner novelty (penalizing combinations of players who shared a court in the past 2 matches recorded in session history).
   - The court card displays a tappable "Why these 4?" badge that lists the computed selection criteria (e.g. `Waited longest`, `Skill balance`, `New partners`).
5. **Rotation State Transitions**:
   - In `4-In / 4-Out`, all four players exit upon match completion.
   - In `Winners Stay & Split`, the winning pair remains on court for their next match, but splits into opposing teams unless capped. If `consecutiveWins >= 2` (Max Win Limit), both players are forced to rotate out, ensuring court availability.
   - The Post-Match Choice prompt offers *Stay Together* (re-enters queue as a Team Lock pair), *Same Players New Teams* (immediate court rematch with swapped teams), or *Shuffle* (four individual solo entries at the queue tail).

### Audio & Device APIs
6. **Autoplay-Compliant Web Speech API**:
   - Offline announcements run through the browser's native `window.speechSynthesis` API using `SpeechSynthesisUtterance`.
   - An explicit "Enable Court Audio" button is presented during session setup to ensure an initial user gesture unlocks audio playback on iOS/iPadOS and Android tablet browsers.
   - Fallback graceful degradation: If audio fails or is unsupported, the 10-second visual callout modal remains fully functional.

### UI & Styling System ("Electric Obsidian")
7. **Design System Tokens**:
   - Background Base: `#0B0F19` (Obsidian Dark).
   - Card Surface: `#161F30` with Card Border `#24324D`.
   - Primary Action / Highlight: `#CCFF00` (Pickleball Volt).
   - Status & Live Elements: `#00E5FF` (Electric Cyan).
   - Warning & Alert Elements: `#FF8A00` (Warm Tangerine), applied to match timers exceeding 20 minutes and "On Deck" badges.
   - Typography: Sans font for interface text, and monospace tabular numbers for match timers and scores to avoid layout shifting.
   - Minimum button height of 56px (`h-14`) with rounded-xl corners for high-speed touch usability with sweaty hands.

## Testing Decisions

### What Makes a Good Test
Tests must exclusively test **observable external behavior**, never private component implementation details, internal reducer methods, or internal IndexedDB mechanics. Tests should survive refactorings as long as user-facing interactions and business rules remain invariant.

### Testing Seams & Frameworks
1. **End-to-End Kiosk UI Seam (Playwright - Highest Seam)**:
   - Tool: Playwright running against a tablet viewport (1024x768).
   - Pattern: Page Object Model (`KioskPageObject`) representing kiosk views (Courts Grid, Paddle Rack, Join Modal, Scorekeeper Pad, PIN Drawer).
   - Scenarios:
     - Walk-in join flow: Join Solo $\rightarrow$ enter name $\rightarrow$ select skill $\rightarrow$ verify appearance in Paddle Rack.
     - Match progression: Mark Court 1 Finished $\rightarrow$ enter 11–8 $\rightarrow$ select winner $\rightarrow$ verify automated dispatch of Stack 1 and visual court call modal.
     - Audio trigger verification: Spy on `window.speechSynthesis.speak` to verify proper speech utterance string generation.
     - Organizer PIN flow: Open PIN drawer $\rightarrow$ enter 1234 $\rightarrow$ adjust court count $\rightarrow$ verify grid updates immediately.
2. **Domain Engine Seam (Vitest - Core Invariant Seam)**:
   - Tool: Vitest running fast headless unit and invariant tests on pure TypeScript domain functions.
   - Scenarios:
     - Queue FIFO sliding window: Verify that players outside the top 8 waiting pool are never dispatched ahead of older players.
     - Max Win Limit: Verify that a pair winning 2 consecutive games in `Winners Stay & Split` is forced off the court on the second win.
     - Stack merging: Verify that solo joins merge chronologically into existing incomplete stacks (1/4 to 2/4 to 3/4 to 4/4).
     - Selection criteria generator: Verify that "Why these 4?" output strings correctly reflect the exact heuristic applied.
     - Post-match state transitions: Verify Team Lock creation when "Stay Together" is chosen vs individual solo re-entry on "Shuffle".

## Out of Scope

The following capabilities are explicitly deferred to post-MVP iterations and are out of scope for this build (matching PRD §8):
1. **Cloud Synchronization & Supabase Backend**: No cloud sync worker, Supabase PostgreSQL synchronization, or cloud endpoints in this P0 release.
2. **DUPR Official Partner Export**: No export to DUPR rating servers or numeric DUPR rating calculations (2.5–5.0).
3. **Mobile QR Code Remote Join**: No scanning kiosk QR codes from personal phones; all joins happen on the Kiosk screen.
4. **Automated 45-Second Ghost Player Countdown**: No automated countdown timer evicting unresponsive players; organizers handle no-shows manually via the PIN Admin Drawer.
5. **Tournament Bracketing**: No Single Elimination, Double Elimination, or Round Robin pool play bracketing.
6. **Player Leaderboards & Historical Analytics**: No multi-session win/loss leaderboards or historical player stat screens.
7. **Dedicated Secondary TV Display Route**: No separate multi-screen server route; TV monitors display an HDMI/AirPlay mirror of the Kiosk.

## Further Notes

- **Ubiquitous Language Compliance**: All code identifiers, interface types, and UI strings must strictly adhere to [GLOSSARY.md](file:///C:/Users/Jeffrey/Desktop/Project/Pickle_app/PickleQ/GLOSSARY.md). Use *Kiosk* (not board), *Session* (not game night), *Court* (not lane), *Stack* (not group), *Team Lock* (not partnership flag), *Rotation Mode* (not algorithm), *Dispatch* (not assignment), and *PIN Admin Drawer* (not settings panel).
- **Subdirectory Execution**: The application will be scaffolded in `app/`. Root configuration files (`AGENTS.md`, `GLOSSARY.md`, `skills-lock.json`) must remain in place.
