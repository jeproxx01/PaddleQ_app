# 11: QR Self Check-In ("Am I Next?")

**What to build:** A QR code displayed on the Kiosk that waiting players scan with their phone to open a local-network page showing their live queue position ("Am I next?") without crowding the Kiosk. The page is served over the venue's local WiFi — no internet required. Scanning shows the player's position in the queue, current court assignments, and any dispatch call they should watch for.

**Blocked by:** 01: App Scaffold, Design System Tokens, and Session Launch Shell (local web app routing), 03: Multi-Entry Queueing and Visual Paddle Rack

**Status:** ready-for-agent

- [ ] QR code generated on the Kiosk pointing at the local-network URL (e.g., `http://<lan-ip>/sessions/[id]/check-in`).
- [ ] Local-network check-in route served entirely offline (no external assets or CDNs).
- [ ] Player lookup by name or QR payload shows the current queue position (e.g., "#3 Next Up") and court status.
- [ ] Page auto-refreshes position without a full manual reload as the queue advances.
- [ ] Graceful behavior when the scanned player is not found or not yet queued (clear "you're not in the queue yet" state).
- [ ] Verified working on a phone connected to the venue LAN with the tablet's internet disconnected.
