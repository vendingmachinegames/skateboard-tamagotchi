export class Game {
  private running = false;
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private readonly MAX_DELTA_MS = 100; // Cap delta to prevent runaway after tab switch
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

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
    // Game tick logic goes here - currently a no-op placeholder
    // Future: call degradation systems, update state, etc.
    void deltaTime;
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
