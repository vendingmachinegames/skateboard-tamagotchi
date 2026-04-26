import { GameState } from "./GameState";
import {
  saveGame,
  loadGame,
  AUTO_SAVE_INTERVAL_MS,
} from "../persistence/save-load";

export class Game {
  private running = false;
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private readonly MAX_DELTA_MS = 100; // Cap delta to prevent runaway after tab switch
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /** Game state manager — initialized on construction (loads from save if available). */
  public state: GameState;

  /** Seed for deterministic crack generation. Restored from save data or set to Date.now(). */
  public cracksSeed: number;

  /** Accumulated time since last auto-save. Used to trigger saves every AUTO_SAVE_INTERVAL_MS. */
  private timeSinceLastSave = 0;

  /**
   * Create a new Game instance.
   * @param canvas - Optional canvas element for rendering. If not provided,
   *                 the game runs headless (useful for testing/server environments).
   */
  constructor(canvas?: HTMLCanvasElement | null) {
    if (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }

    // Initialize game state — attempt to load from localStorage first
    try {
      const savedState = loadGame();
      if (savedState !== null) {
        // Restore from save — copy validated data into a fresh GameState instance
        this.state = new GameState();
        this.state.stats = savedState.stats;
        this.state.phase = savedState.phase;
        this.state.score = savedState.score;
        this.state.ticksAlive = savedState.ticksAlive;
        this.state.lastTick = savedState.lastTick;
        this.cracksSeed = savedState.cracksSeed ?? Date.now();
      } else {
        // No save found — start with a fresh board
        this.state = new GameState();
        this.cracksSeed = Date.now();
      }
    } catch (error) {
      // If anything goes wrong during initialization, fall back to fresh board
      console.warn("Failed to initialize game state, starting fresh:", error);
      this.state = new GameState();
      this.cracksSeed = Date.now();
    }
  }

  /**
   * Start the game loop using requestAnimationFrame.
   * Idempotent - calling start() while already running has no effect.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = null; // Reset so first frame doesn't get a huge delta
    if (typeof requestAnimationFrame === "undefined") {
      console.warn(
        "requestAnimationFrame not available — game loop cannot start in this environment"
      );
      return;
    }
    this.rafId = requestAnimationFrame((ts: number) => this.loop(ts));
  }

  /**
   * Stop the game loop. Safe to call when not running.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Process a single game tick with the given deltaTime in milliseconds.
   * Called automatically by the game loop, but can also be called manually.
   */
  tick(deltaTime: number): void {
    // Update game state with elapsed time
    this.state.update(deltaTime);

    // Auto-save every AUTO_SAVE_INTERVAL_MS during playing phase
    if (this.state.phase === "playing") {
      this.timeSinceLastSave += deltaTime;
      if (this.timeSinceLastSave >= AUTO_SAVE_INTERVAL_MS) {
        saveGame({ ...this.state, cracksSeed: this.cracksSeed });
        this.timeSinceLastSave = 0;
      }
    }
  }

  /**
   * Reset the game to a fresh board (used after snap / play-again).
   * Clears all stats, score, ticks, and auto-save timer.
   */
  resetGame(): void {
    this.state.reset();
    this.cracksSeed = Date.now();
    this.timeSinceLastSave = 0;
  }

  /**
   * Render the current game state to the canvas.
   * Called automatically at the end of each tick when a canvas is available.
   */
  render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas each frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Future: draw game objects here
    // This is where board rendering, UI overlays, and effects will go
  }

  private clampDelta(rawDelta: number): number {
    // Clamp negative or NaN values to 0
    if (!Number.isFinite(rawDelta) || rawDelta < 0) {
      return 0;
    }
    // Cap delta time to prevent runaway degradation after long tab-away periods
    return Math.min(rawDelta, this.MAX_DELTA_MS);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    if (this.lastTime === null) {
      this.lastTime = timestamp;
    }

    const rawDelta = timestamp - this.lastTime;
    this.lastTime = timestamp;

    const clampedDelta = this.clampDelta(rawDelta);
    this.tick(clampedDelta);
    this.render();

    // Schedule next frame
    this.rafId = requestAnimationFrame((ts: number) => this.loop(ts));
  }
}
