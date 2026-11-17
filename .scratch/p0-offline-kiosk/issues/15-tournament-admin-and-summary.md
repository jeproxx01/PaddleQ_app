# 15: Tournament Fixture Controls in Admin Drawer and Summary Podium

**What to build:** Tournament administration and recap tools for the `Winner Takes All` Game Mode. In the Settings PIN Admin Drawer (`/sessions/[id]/settings`), the organizer can view scheduled/in-play fixtures, manually record or correct fixture scores, enter a walkover/forfeit, or re-pair teams before tournament launch. In the Summary route (`/sessions/[id]/summary`), renders the final Tournament Podium (1st, 2nd, 3rd place with celebratory trophy badges), complete final standings (points scored, conceded, differential, match record), and an action to export tournament results.

**Blocked by:** 07: PIN Admin Drawer with Mid-Session Adjustments and Emergency Controls, 10: Winner Takes All Round Robin Tournament Mode

**Status:** ready-for-agent

- [x] Tournament fixtures panel in PIN Admin Drawer showing round, matchup, court assignment, and status.
- [x] Manual fixture score override / walkover resolution in Admin Drawer.
- [x] Pre-launch team re-pair / shuffle button before first tournament fixture is dispatched.
- [x] Tournament Podium in `/sessions/[id]/summary` celebrating the Champion and runners-up.
- [x] Standings table in Summary with total points, point differential (+/-), and win/loss record.
- [x] Standings export to CSV/JSON for organizer records.
- [x] Vitest coverage for fixture score overrides and standings recalculations.
