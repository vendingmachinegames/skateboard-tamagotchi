# Skateboard Tamagotchi — Game Mechanics (v1 POC)

## Core Concept
You have one skateboard. It degrades over time. You maintain it (low effort) and do tricks on it (high effort). Both keep it alive. Tricks earn you cosmetics.

**Target audience:** 30-50 year old males who skated as kids/teens. Nostalgia + fidget toy.
**Aesthetic:** Jet Set Radio — bold outlines, saturated colors, street art, graffiti, attitude.
**Constraint:** AI dark factory — all assets (art, code, design) are AI-generated.

---

## Board Health — 3 Stats

| Stat | Decays | Maintained By | Effect When Low |
|------|--------|---------------|-----------------|
| **Deck** | -1/hr | Wipe down (tap) | Cracks appear visually, tricks score less |
| **Wheels** | -2/hr | Tighten (hold + turn gesture) | Board drifts in animations, slower trick cooldown |
| **Grip** | -1/2hr | Apply grip tape (swipe) | Trick patterns require more precision |

Each stat: 0-100. Starts at 80. If any hits 0, board is "busted" — no tricks until repaired. No permadeath (this isn't stressful, it's a fidget toy).

**Why 3 stats, not 5:** KISS. Three fits on one screen, each maps to one gesture, each has a visible effect.

---

## Low Friction — Maintenance Actions

Three actions, one per stat. Each takes <2 seconds:

1. **Wipe Deck** — Tap the board 3 times. Restores 20 Deck.
2. **Tighten Wheels** — Hold and rotate. Restores 25 Wheels.
3. **Apply Grip Tape** — Swipe across the board. Restores 15 Grip.

Cooldown: 30 seconds per action. No resource cost. Instant gratification.

---

## High Engagement — Trick System

Tricks require timing and have a cooldown based on Wheel health:

| Trick | Input | Score | Cooldown (base) |
|-------|-------|-------|-----------------|
| Ollie | Quick tap | 10 pts | 5s |
| Kickflip | Tap + swipe | 25 pts | 8s |
| Heelflip | Swipe + hold | 30 pts | 10s |
| 360 Flip | Double swipe | 50 pts | 15s |

Score is reduced by % of Deck health (cracked deck = sloppy tricks). Cooldown increases as Wheels degrade.

---

## Progression — Cosmetics & Collection

Earn "Style Points" from tricks. Spend on:

- **Deck graphics** (primary cosmetic) — 10 variants
- **Wheel colors** — 8 variants  
- **Grip tape patterns** — 5 variants
- **Board name** — customize your board's personality

No power-ups, no pay-to-win. Purely cosmetic progression.

---

## Technical Notes

- Single HTML file + vanilla JS (no framework needed for POC)
- Canvas-based rendering for the board and tricks
- localStorage for persistence (save/load stats and cosmetics)
- Mobile-first touch controls with keyboard fallback
- No network dependency — fully offline capable
