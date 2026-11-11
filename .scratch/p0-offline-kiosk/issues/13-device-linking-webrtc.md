# 13: Device Linking (WebRTC / Local Join Code)

**What to build:** Linking multiple devices — a scoring tablet, the main Kiosk, and a TV display — over the local network using a join code or QR via WebRTC data channels, with no internet required. Each device is assigned a role (`Kiosk`, `Scorer`, or `Display`) that scopes what it can do and show. Devices share the live session state so a scorer tablet can record scores while the Kiosk drives announcements and the TV broadcasts.

**Blocked by:** 01: App Scaffold, Design System Tokens, and Session Launch Shell (local web app routing), 12: TV Broadcast Screen (`/show`)

**Status:** ready-for-agent

- [ ] Join code / QR generation on the Kiosk to invite additional devices to the session.
- [ ] WebRTC data channel signaling established entirely over the local network (no internet or STUN/TURN dependency).
- [ ] Role assignment on join: `Kiosk` (full control), `Scorer` (score entry only), `Display` (broadcast view).
- [ ] Role-scoped UI: Scorer sees the scorekeeper for active courts; Display renders `/show`; Kiosk retains organizer controls.
- [ ] State propagation: a score recorded on a Scorer tablet updates the Kiosk and TV in real time.
- [ ] Reconnect resilience: a dropped device can rejoin via the same join code and resync to current state.
- [ ] Offline verification: full multi-device flow works with the venue's internet connection disabled.
