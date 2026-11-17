# PaddleQ

Offline-first pickleball court operating system: a kiosk board that runs open-play paddle stacking, court rotation, and match calls without internet, syncing to the cloud when connected.

## Language

**Kiosk**:
The single tablet or laptop mounted at the court gate that runs the board; the one screen everyone interacts with or mirrors to a TV.
_Avoid_: board, terminal, display

**Session**:
One contiguous period of open play at a venue, with its own court count, game mode, and roster. Created when play starts, ended by the organizer.
_Avoid_: game night, event

**Court**:
One playable court in a session, holding an in-progress match or standing `Open`.
_Avoid_: lane, station

**Stack**:
A group of players waiting to fill a foursome. Entered as a Solo (1 player, merged into the oldest incomplete stack), a Pair (2 locked partners), or a Foursome (complete 4).
_Avoid_: group, batch, lineup

**Team Lock**:
A pair bound to play together — as stacked partners or as court partners — until they choose Shuffle or an admin unlocks them.
_Avoid_: duo, partnership flag

**Game Mode**:
The session-wide rule for how a court runs and who leaves after a match: `Open Play` (4-In / 4-Out, everyone rotates), `Winner/Winner vs Loser/Loser` (split queue pools: winning pairs play winning pairs, losing pairs play losing pairs), or `Winner Takes All` (bracketed round-robin tournament with balanced High-Low pairing, cumulative point scoring, and a grand prize for highest total score). Chosen in the New Session Wizard and changeable mid-session in the PIN admin drawer.
_Avoid_: rotation type, algorithm, rotation mode

**Winner vs Loser Pools**:
A `Game Mode` where after a match, winning partners stay together in the Winners Pool to challenge another winning pair, losing partners stay together in the Losers Pool to face another losing pair, and fresh entrants enter as unranked neutral pairs.
_Avoid_: king-of-the-hill, ladder court

**Winner Takes All**:
A `Game Mode` tournament format where entrants are auto-paired using a Seeded High-Low balanced draw (preventing two advanced players from being teammates). Teams compete in pre-generated round-robin fixtures, accumulating points across all matches to top the live leaderboard and win the prize.
_Avoid_: single elimination, knockout bracket

**Leaderboard**:
The live, continuously-updating ranking of tournament teams on the Kiosk and Broadcast screens, ordered by total points, then point differential, then wins.
_Avoid_: standings

**Standings**:
The final tournament table on the Summary route ranking every team by total points, point differential, and win/loss record — the source of the podium and export.
_Avoid_: leaderboard

**Skill Level**:
A player's self-declared tier at first join: Beginner, Low Intermediate, Intermediate, High Intermediate, or Advanced. Used to balance the four picked for a court; admins may override.
_Avoid_: rating, rank, DUPR (a specific external rating system)

**Check-in State**:
A player's attendance status in the Lobby: `Not here` (added, hasn't arrived), `Ready` (checked in, enters the queue), or `Resting` (present but sitting out, keeps queue position).
_Avoid_: present, absent, status

**Mixed Doubles**:
A format where a foursome is composed of two male and two female players. Supported by all Game Modes.
_Avoid_: co-ed, mixed pairs

**Win/Loss**:
A per-player record of match wins and losses tracked across a single Session, surfaced in the recap and export. The tournament-team equivalent is Standings, not this term.
_Avoid_: ranking

**Dispatch**:
The act of assigning the next eligible Stack to an Open court, announcing it via audio call and on-screen flash.
_Avoid_: assignment, seating

**Selection Criteria**:
The reasons a given four were picked, shown tappable on the court card: waited longest, skill mix, new partners. Exists to settle "why them and not me?" disputes.
_Avoid_: matchmaking score, algorithm

**Post-Match Choice**:
The prompt shown to winners after a recorded score: Stay together, Same players new teams, or Shuffle. Default follows the active game mode.
_Avoid_: winner menu, re-team dialog

**PIN Admin Drawer**:
The PIN-protected organizer controls: court count, game mode, team unlocks, court groups, session presets, session end. Opened from the Settings route (the PIN is set here, not in the wizard).
_Avoid_: settings panel, admin panel

**Landing Page**:
The root route (`/`) hero screen with a "Start a session →" action and a live preview showcase.
_Avoid_: home page, splash screen

**New Session Wizard**:
The 4-step guided setup at `/sessions/new`: Details → Game Mode → Players → Review & Launch.
_Avoid_: setup form, launch modal

**Lobby**:
The pre-session staging area at `/sessions/[id]/lobby` with check-in tabs, an attendance progress bar, and the "Start session →" CTA.
_Avoid_: waiting room, pre-game screen

**Sidebar**:
The persistent left navigation (collapsed 64px) present across all `/sessions/[id]/*` routes.
_Avoid_: nav rail, menu bar

**Broadcast Screen**:
The read-only `/show` route rendered on a TV via HDMI or local-network cast, showing live court assignments, winner moments, and queue animations.
_Avoid_: TV mode, projector view

**Audit Trail**:
The timestamped log of every dispatch decision and its reasoning, reviewable in the History and Summary routes.
_Avoid_: decision log, match log

**QR Check-In**:
A QR code shown on the Kiosk that players scan with their phone to open a local-network page showing their queue position ("Am I next?"). Works offline over the local network.
_Avoid_: QR join, mobile join

**Device Linking**:
Connecting multiple devices (Kiosk, Scorer, Display) via a local join code or QR using WebRTC data channels over the LAN, each assigned a role.
_Avoid_: pairing, sync
