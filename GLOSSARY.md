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
The session-wide rule for how a court runs and who leaves after a match: `Open Play` (4-In / 4-Out, everyone rotates), `Winners Stay & Split` (winners remain until capped), `Challenge Court` (king-of-the-court with a streak cap), or `Time-Based` (countdown clock with auto-call). Chosen in the New Session Wizard and changeable mid-session in the PIN admin drawer.
_Avoid_: rotation type, algorithm, rotation mode

**Max Win Limit**:
The cap (2 consecutive wins) that forces winners off the court in Winners Stay & Split, so no team holds a court indefinitely.
_Avoid_: win streak cap, streak limit

**Challenge Court**:
A `Game Mode` where the winning pair holds the court and faces the next waiting pair, subject to a streak cap (the Max Win Limit concept). King-of-the-court variant.
_Avoid_: king-of-the-hill, ladder court

**Time-Based**:
A `Game Mode` where courts run on a countdown clock (default 15 minutes), flashing a warning at 2 minutes remaining and auto-calling + auto-ending at time-up.
_Avoid_: timed play, shot clock

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
A per-player record of match wins and losses tracked across a single Session, surfaced in the recap and export.
_Avoid_: standings, ranking

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
The root route (`/`) hero screen with "Start a session →" and "Try demo" actions and a live preview showcase.
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
