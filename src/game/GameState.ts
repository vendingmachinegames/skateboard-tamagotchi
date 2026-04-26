import type { BoardStats, GamePhase } from "../types/game-types";

/**
 * GameState manages the single source of truth for all game systems.
 * Encapsulates board stats, game phase, score, and timing information.
 */
export class GameState {
  public stats: BoardStats;
  public phase: GamePhase;
  public score: number;
  public ticksAlive: number;
  public lastTick: number;

  /** Optional callback invoked during update for external systems (e.g., degradation). */
  private onTickCallback?: (stats: BoardStats, deltaTime: number) => void;

  constructor() {
    this.stats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    this.phase = "new";
    this.score = 0;
    this.ticksAlive = 0;
    this.lastTick = Date.now();
  }

  /**
   * Register a callback to be invoked on each update tick.
   * Used by external systems (e.g., degradation) to react to time passage.
   * @param callback - Function receiving current stats and deltaTime
   */
  setOnTick(callback: ((stats: BoardStats, deltaTime: number) => void) | undefined): void {
    this.onTickCallback = callback;
  }

  /**
   * Advance game time by deltaTime milliseconds.
   * Updates ticksAlive and lastTick. Invokes onTick callback if registered
   * (used by degradation system in US-003 to modify stats based on elapsed time).
   *
   * Boundary handling:
   * - NaN, Infinity, or negative deltaTime: ticksAlive is not advanced
   * - Zero deltaTime: valid no-op, lastTick still updated
   * - Positive finite deltaTime: accumulated into ticksAlive normally
   *
   * @param deltaTime - Time elapsed since last call in milliseconds
   * @returns this for method chaining
   */
  update(deltaTime: number): this {
    // Guard against invalid time values — only accumulate positive finite deltas
    if (Number.isFinite(deltaTime) && deltaTime > 0) {
      this.ticksAlive += deltaTime;
    }
    // Invoke external tick handlers for stat degradation, phase updates, etc.
    // These are registered by the Game class and systems like degradation.ts
    if (this.onTickCallback) {
      this.onTickCallback(this.stats, deltaTime);
    }
    this.lastTick = Date.now();
    return this;
  }

  /**
   * Reset the game to initial pristine state.
   * All stats restored to 100, phase set to 'new', score and ticks zeroed.
   * @returns this for method chaining
   */
  reset(): this {
    this.stats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    this.phase = "new";
    this.score = 0;
    this.ticksAlive = 0;
    this.lastTick = Date.now();
    return this;
  }
}
