# PaddleQ

Offline-first pickleball court operating system: a kiosk board that runs open-play paddle stacking, court rotation, and match calls without internet, syncing to the cloud when connected.

## Language

**Kiosk**:
The single tablet or laptop mounted at the court gate that runs the board; the one screen everyone interacts with or mirrors to a TV.
_Avoid_: board, terminal, display

**Session**:
One contiguous period of open play at a venue, with its own court count, rotation mode, and roster. Created when play starts, ended by the organizer.
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

**Rotation Mode**:
The session-wide rule for who leaves the court after a match: `4-In / 4-Out` (everyone rotates) or `Winners Stay & Split` (winners remain until capped). Set once per session in the PIN admin drawer.
_Avoid_: rotation type, algorithm

**Max Win Limit**:
The cap (2 consecutive wins) that forces winners off the court in Winners Stay & Split, so no team holds a court indefinitely.
_Avoid_: win streak cap, streak limit

**Skill Level**:
A player's self-declared tier at first join: Beginner, Intermediate, or Advanced. Used to balance the four picked for a court; admins may override.
_Avoid_: rating, rank, DUPR (a specific external rating system)

**Dispatch**:
The act of assigning the next eligible Stack to an Open court, announcing it via audio call and on-screen flash.
_Avoid_: assignment, seating

**Selection Criteria**:
The reasons a given four were picked, shown tappable on the court card: waited longest, skill mix, new partners. Exists to settle "why them and not me?" disputes.
_Avoid_: matchmaking score, algorithm

**Post-Match Choice**:
The prompt shown to winners after a recorded score: Stay together, Same players new teams, or Shuffle. Default follows the active rotation mode.
_Avoid_: winner menu, re-team dialog

**PIN Admin Drawer**:
The PIN-protected organizer controls: court count, rotation mode, team unlocks, session end.
_Avoid_: settings panel, admin panel
