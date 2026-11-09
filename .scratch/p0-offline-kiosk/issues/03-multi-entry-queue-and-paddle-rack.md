# 03: Multi-Entry Queueing and Visual Paddle Rack

**What to build:** The physical-to-digital paddle queue board on the Kiosk. Players can tap large touch buttons (>=56px) for "Join Solo", "Join Pair", or "Join 4-Stack", type their name in a rapid 3-second workflow, and select their Skill Level (Beginner, Intermediate, Advanced). Returning players get 1-tap autocomplete pills from the local session directory to instantly restore their skill level. Entries render on a visual Paddle Rack with position badges (#1 Next Up, #2 On Deck) and venue readiness counts ("8 ready — enough for 2 games"). Solo joins automatically merge into the oldest incomplete Stack.

**Blocked by:** 01: App Scaffold, Design System Tokens, and Session Launch Shell

**Status:** ready-for-agent

- [ ] Touch buttons for "Join Solo", "Join Pair", and "Join 4-Stack" with minimum 56px touch height (`h-14`) and rounded corners (`rounded-xl`).
- [ ] 3-second minimal name entry modal with 1-tap Skill Level selection (Beginner, Intermediate, Advanced) on first join.
- [ ] 1-tap autocomplete suggestion pills for players already present in the local session directory, automatically filling their saved skill level.
- [ ] "Join Pair" creates a Team Lock binding the 2 partners together in the queue.
- [ ] "Join 4-Stack" immediately creates a complete 4-player Stack in the queue line.
- [ ] Solo walk-in entries automatically merge into the oldest incomplete Stack (1/4 $\rightarrow$ 2/4 $\rightarrow$ 3/4 $\rightarrow$ 4/4) rather than creating fragmented rows.
- [ ] Visual Paddle Rack displays queued Stacks with visible position badges (#1 Next Up, #2 On Deck) and readiness counts ("8 ready — enough for 2 games").
- [ ] Queue state and player directory persist reliably to IndexedDB with UUID primary keys.
