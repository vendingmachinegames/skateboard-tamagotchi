# Skateboard Tamagotchi — Product Requirements

## Overview

**Problem**: Classic tamagotchi/pet-simulation games are beloved but overdone with animals. There's no game where you nurture an inanimate object — a skateboard — keeping it from deteriorating through neglect. The tension of caring for something that can literally snap in two if ignored creates a unique emotional hook.
**Solution**: A browser-based mini-game where the player's skateboard degrades over time (wheels wear, trucks loosen, deck cracks). The player must perform care actions (tighten trucks, replace wheels, sand & wax the grip tape) to keep it in good shape. Neglect leads to progressive damage culminating in the board snapping in two — game over.
**Branch**: `ralph/skateboard-tamagotchi`

---

## Goals & Success

### Primary Goal
Build a fun, engaging browser mini-game where players care for a virtual skateboard that degrades over time, creating emotional attachment through the threat of permanent loss (the board snapping).

### Success Metrics
| Metric | Target | How Measured |
|--------|--------|--------------|
| Session length | > 3 minutes average | Analytics / local timing |
| Care action frequency | Player performs ≥5 care actions per session | Game state tracking |
| Replayability | Player restarts after board snaps | New game count tracking |
| Code quality | 0 type errors, all tests pass | CI pipeline |

### Non-Goals (Out of Scope)
- Multiplayer / social features — too complex for MVP, single-player focus
- Mobile touch controls — desktop keyboard/mouse only initially
- Persistent cloud saves — localStorage only for MVP
- Sound effects and music — visual-only feedback for MVP
- Multiple board types/skins — one default board for MVP

---

## User & Context

### Target User
- **Who**: Casual gamers, fans of tamagotchi-style games, skateboarding enthusiasts
- **Role**: Playing in short sessions (commute, break time) on a desktop browser
- **Current Pain**: Bored with traditional pet sims; wants something novel and slightly stressful

### User Journey
1. **Trigger**: Player opens the game in their browser
2. **Action**: Player sees their skateboard with status bars (Deck Integrity, Wheel Wear, Truck Tightness). Timers tick down. Player clicks buttons to perform care actions. If they neglect it, cracks appear, the board visually degrades. Eventually it snaps — dramatic visual of the board breaking in two.
3. **Outcome**: Player either keeps their board alive (win state / ongoing play) or watches it snap and starts over with a fresh board

---

## UX Requirements

### Interaction Model
- **Canvas-based rendering** — HTML5 Canvas for the skateboard visual, CSS overlay for UI controls
- **Care action buttons** — "Tighten Trucks", "Replace Wheels", "Sand Grip Tape", "Apply Wax"
- **Status bars** — Visual health meters for Deck Integrity, Wheel Wear, Truck Tightness, Grip Condition
- **Keyboard shortcuts** — Number keys (1-4) to trigger care actions quickly
- **Game loop** — Continuous degradation timer; player must keep up with maintenance

### States to Handle
| State | Description | Behavior |
|-------|-------------|----------|
| Initial / New Board | Fresh board, all stats at 100% | Clean skateboard rendered, all bars full green |
| Playing | Stats degrading over time, player performing actions | Animated degradation, visual feedback on care actions |
| Warning | One or more stats below 30% | Bars turn orange/red, subtle crack visuals appear on board |
| Critical | Any stat at 0% for >5 seconds | Board starts visibly cracking, screen shakes slightly |
| Snapped / Game Over | Deck integrity reaches 0 and board breaks | Dramatic snap animation, game over screen with score, restart button |
| Paused | Player pauses the game | Timer stops, overlay shows pause controls |

### Visual Design Notes
- Skateboard rendered as a top-down or angled view on canvas
- Progressive damage: hairline cracks → visible splits → clean break in two
- Color palette: warm wood tones for deck, black grip tape, white/colored wheels
- UI bars styled with skate culture aesthetic (grungy, bold typography)

---

## Technical Context

### Architecture Overview
This is a greenfield project. Recommended stack:
- **Runtime**: Bun (fast JS runtime, built-in test runner)
- **Language**: TypeScript for type safety
- **Rendering**: HTML5 Canvas API (no heavy game engine needed for this scope)
- **State Management**: Simple state object with event-driven updates
- **Persistence**: localStorage for saving game state between sessions
- **Testing**: Bun's built-in test runner

### Project Structure
```
src/
  game/
    Game.ts           — Main game loop, canvas setup, render orchestration
    GameState.ts      — State management (stats, timers, actions)
    constants.ts      — Game constants (degradation rates, action effects)
  systems/
    degradation.ts    — Stat degradation logic over time
    care-actions.ts   — Care action definitions and effects
    damage-visuals.ts — Crack generation and rendering
  render/
    board-renderer.ts — Skateboard canvas drawing
    ui-renderer.ts    — Status bars, buttons, overlays
    effects.ts        — Screen shake, particle effects on snap
  input/
    keyboard.ts       — Keyboard event handling
    click.ts          — Mouse/touch click detection on buttons
  persistence/
    save-load.ts      — localStorage save/load
  types/
    game-types.ts     — Core type definitions
  index.ts            — Entry point, initialization
public/
  index.html          — HTML shell with canvas element
```

### Key Types & Interfaces
```typescript
// Core game state
interface GameState {
  stats: BoardStats;
  phase: GamePhase;
  score: number;
  ticksAlive: number;
  lastTick: number;
}

interface BoardStats {
  deckIntegrity: number;   // 0-100, reaches 0 = snap
  wheelWear: number;       // 0-100, low wheels reduce control
  truckTightness: number;  // 0-100, loose trucks cause faster deck wear
  gripCondition: number;   // 0-100, worn grip causes falls = deck damage
}

type GamePhase = 'new' | 'playing' | 'warning' | 'critical' | 'snapped' | 'paused';

// Care action definition
interface CareAction {
  id: string;
  label: string;
  shortcut: string;
  cooldown: number;        // ms between uses
  lastUsed: number;
  effects: Partial<BoardStats>; // stat changes when performed
}
```

### Architecture Notes
- Game loop runs at ~60fps via `requestAnimationFrame`
- Degradation happens per real-time second (not frame-dependent)
- Care actions have cooldowns to prevent spamming
- Stats are interconnected: low truck tightness accelerates deck wear, worn grip causes falls that damage deck
- The "snap" is the dramatic climax — deck integrity hitting 0 triggers a multi-phase animation

---

## Implementation Summary

### Story Overview
| ID | Title | Priority | Dependencies |
|----|-------|----------|--------------|
| US-001 | Project scaffolding and game loop | 1 | — |
| US-002 | Core types and game state management | 2 | US-001 |
| US-003 | Stat degradation system | 3 | US-002 |
| US-004 | Skateboard canvas rendering | 3 | US-002 |
| US-005 | Care action system with cooldowns | 4 | US-002, US-003 |
| US-006 | Status bar UI overlay | 5 | US-002, US-004 |
| US-007 | Damage visuals (cracks and degradation) | 6 | US-003, US-004 |
| US-008 | Board snap animation and game over screen | 7 | US-004, US-007 |
| US-009 | Keyboard input for care actions | 5 | US-005 |
| US-010 | localStorage persistence (save/load) | 8 | US-002 |

### Dependency Graph
```
US-001 (project setup + game loop)
    ↓
US-002 (types + state management)
    ↓
US-003 (degradation) ← US-004 (board rendering)
    ↓                      ↓
US-005 (care actions)  US-006 (status bar UI)
    ↓                      ↓
US-009 (keyboard)     US-007 (damage visuals)
                            ↓
                       US-008 (snap + game over)
                            
US-010 (persistence) — independent, depends on US-002
```

---

## Validation Requirements

Every story must pass:
- [ ] Type-check: `bun run type-check`
- [ ] Tests: `bun run test`
- [ ] Lint: `bun run lint` (if configured)
- [ ] Format: `bun run format:check` (if configured)

---

*Generated: 2026-04-26T07:15:00.000Z*
