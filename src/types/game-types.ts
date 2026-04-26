/**
 * Core type definitions for the Skateboard Tamagotchi game.
 * All data types are interfaces (no classes) following the project's type-first architecture.
 */

/**
 * BoardStats tracks the four condition metrics of the skateboard.
 * Each value ranges from 0 (completely degraded) to 100 (perfect condition).
 */
export interface BoardStats {
  deckIntegrity: number;   // 0-100, reaches 0 = board snaps
  wheelWear: number;       // 0-100, low wheels reduce control
  truckTightness: number;  // 0-100, loose trucks cause faster deck wear
  gripCondition: number;   // 0-100, worn grip causes falls = deck damage
}

/**
 * GamePhase represents the current state of the game flow.
 */
export type GamePhase =
  | "new"       // Fresh board, all stats at 100%
  | "playing"   // Stats degrading, player performing actions
  | "warning"   // One or more stats below 30%
  | "critical"  // Any stat below 10%
  | "snapped"   // Deck integrity reached 0 — game over
  | "paused";   // Player paused the game

/**
 * GameState is the single source of truth for all game systems.
 */
export interface GameState {
  stats: BoardStats;
  phase: GamePhase;
  score: number;
  ticksAlive: number;  // Total elapsed time in milliseconds
  lastTick: number;    // Timestamp of the last update call
}

/**
 * CareAction defines a player-performable maintenance action on the skateboard.
 */
export interface CareAction {
  id: string;              // Unique identifier (e.g., "tighten-trucks")
  label: string;           // Human-readable display name
  shortcut: string;        // Keyboard shortcut key (empty string if none)
  cooldown: number;        // Milliseconds between allowed uses
  lastUsed: number;        // Timestamp of last use (0 = never used)
  effects: Partial<BoardStats>; // Stat changes applied when performed
}
