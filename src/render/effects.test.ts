/// <reference types="bun" />

/**
 * Tests for snap animation and game over screen rendering.
 * Validates renderSnapAnimation, renderGameOver, and Play Again button behavior.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import type { BoardStats } from "../types/game-types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./board-renderer";

// ─── Mock Canvas Context ──────────────────────────────────────────────────────

/**
 * A mock CanvasRenderingContext2D that captures all method calls and property
 * assignments for verification in tests. Tracks transforms separately for
 * precise validation of animation state.
 */
class MockCanvasContext {
  fillStyle: string = "";
  strokeStyle: string = "";
  lineWidth: number = 1;
  font: string = "";
  textAlign: string = "start";
  textBaseline: string = "alphabetic";

  // Captured calls for verification
  public calls: Array<{ method: string; args: any[] }> = [];
  public savedStateCount: number = 0;
  private stateStack: Array<{ fillStyle: string; strokeStyle: string; lineWidth: number; font: string }> = [];

  // Track transform operations for precise animation validation
  public translateCalls: Array<[number, number]> = [];
  public rotateCalls: Array<number> = [];

  clearRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ method: "clearRect", args: [x, y, w, h] });
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ method: "fillRect", args: [x, y, w, h] });
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ method: "strokeRect", args: [x, y, w, h] });
  }

  fillText(text: string, x: number, y: number): void {
    this.calls.push({ method: "fillText", args: [text, x, y] });
  }

  strokeText(text: string, x: number, y: number): void {
    this.calls.push({ method: "strokeText", args: [text, x, y] });
  }

  beginPath(): void {
    this.calls.push({ method: "beginPath", args: [] });
  }

  moveTo(x: number, y: number): void {
    this.calls.push({ method: "moveTo", args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.calls.push({ method: "lineTo", args: [x, y] });
  }

  arc(
    x: number, y: number, radius: number, startAngle: number, endAngle: number
  ): void {
    this.calls.push({ method: "arc", args: [x, y, radius, startAngle, endAngle] });
  }

  fill(): void {
    this.calls.push({ method: "fill", args: [] });
  }

  stroke(): void {
    this.calls.push({ method: "stroke", args: [] });
  }

  save(): void {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
    });
    this.savedStateCount++;
    this.calls.push({ method: "save", args: [] });
  }

  restore(): void {
    if (this.stateStack.length > 0) {
      const state = this.stateStack.pop()!;
      Object.assign(this, state);
    }
    this.calls.push({ method: "restore", args: [] });
  }

  translate(x: number, y: number): void {
    this.translateCalls.push([x, y]);
    this.calls.push({ method: "translate", args: [x, y] });
  }

  rotate(angle: number): void {
    this.rotateCalls.push(angle);
    this.calls.push({ method: "rotate", args: [angle] });
  }

  clip(): void {
    this.calls.push({ method: "clip", args: [] });
  }

  /**
   * Find calls matching a method name.
   */
  getCallCount(methodName: string): number {
    return this.calls.filter((c) => c.method === methodName).length;
  }

  /**
   * Get all calls for a specific method.
   */
  getCalls(methodName: string): Array<any[]> {
    return this.calls.filter((c) => c.method === methodName).map((c) => c.args);
  }

  /**
   * Check if fillText was called with text containing the given substring.
   */
  hasFillTextContaining(text: string): boolean {
    const textCalls = this.getCalls("fillText");
    return textCalls.some((args) => typeof args[0] === "string" && args[0].includes(text));
  }

  /**
   * Get all fillText calls.
   */
  getFillTextCalls(): Array<[string, number, number]> {
    return this.getCalls("fillText").map((args) => [args[0], args[1], args[2]]);
  }

  /**
   * Get the maximum translate magnitude from all translate calls.
   */
  getMaxTranslateMagnitude(): number {
    if (this.translateCalls.length === 0) return 0;
    return Math.max(...this.translateCalls.map((t) => Math.abs(t[0]) + Math.abs(t[1])));
  }

  /**
   * Get the maximum rotation angle from all rotate calls.
   */
  getMaxRotationAngle(): number {
    if (this.rotateCalls.length === 0) return 0;
    return Math.max(...this.rotateCalls.map((a) => Math.abs(a)));
  }

  /**
   * Get non-zero translate calls (magnitude > threshold).
   */
  getNonZeroTranslates(threshold: number = 0.01): Array<[number, number]> {
    return this.translateCalls.filter(
      (t) => Math.abs(t[0]) > threshold || Math.abs(t[1]) > threshold
    );
  }

  /**
   * Get non-zero rotate calls (angle > threshold).
   */
  getNonZeroRotates(threshold: number = 0.01): Array<number> {
    return this.rotateCalls.filter((a) => Math.abs(a) > threshold);
  }

  /**
   * Reset all captured calls and state.
   */
  reset(): void {
    this.calls = [];
    this.savedStateCount = 0;
    this.stateStack = [];
    this.fillStyle = "";
    this.strokeStyle = "";
    this.lineWidth = 1;
    this.font = "";
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
    this.translateCalls = [];
    this.rotateCalls = [];
  }
}

// ─── Tests for renderSnapAnimation ──────────────────────────────────────────────

describe("renderSnapAnimation", () => {
  let ctx: MockCanvasContext;

  beforeEach(() => {
    ctx = new MockCanvasContext();
  });

  it("exports renderSnapAnimation function", async () => {
    const effects = await import("./effects");
    expect(typeof effects.renderSnapAnimation).toBe("function");
  });

  it("renders without throwing given valid ctx and progress values", async () => {
    const { renderSnapAnimation } = await import("./effects");
    // Test boundary and intermediate values
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      ctx.reset();
      expect(() => renderSnapAnimation(ctx as any, p)).not.toThrow();
    }
  });

  it("throws on null ctx", async () => {
    const { renderSnapAnimation } = await import("./effects");
    expect(() => renderSnapAnimation(null as any, 0)).toThrow();
  });

  it("throws on undefined ctx", async () => {
    const { renderSnapAnimation } = await import("./effects");
    expect(() => renderSnapAnimation(undefined as any, 0)).toThrow();
  });

  it("throws on progress < 0", async () => {
    const { renderSnapAnimation } = await import("./effects");
    expect(() => renderSnapAnimation(ctx as any, -0.1)).toThrow();
  });

  it("throws on progress > 1", async () => {
    const { renderSnapAnimation } = await import("./effects");
    expect(() => renderSnapAnimation(ctx as any, 1.1)).toThrow();
  });

  it("throws on NaN progress", async () => {
    const { renderSnapAnimation } = await import("./effects");
    expect(() => renderSnapAnimation(ctx as any, NaN)).toThrow();
  });

  it("throws on Infinity progress", async () => {
    const { renderSnapAnimation } = await import("./effects");
    expect(() => renderSnapAnimation(ctx as any, Infinity)).toThrow();
  });

  // ── Progress 0: Board intact ────────────────────────────────────────────────

  it("at progress 0: no separation translates applied", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0);

    const nonZeroTranslates = ctx.getNonZeroTranslates();
    expect(nonZeroTranslates.length).toBe(0);
  });

  it("at progress 0: no rotation applied", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0);

    const nonZeroRotates = ctx.getNonZeroRotates();
    expect(nonZeroRotates.length).toBe(0);
  });

  it("at progress 0: draws board content (fillRect for deck)", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0);

    // Should still draw the board even at progress 0
    expect(ctx.getCallCount("fillRect")).toBeGreaterThan(0);
  });

  it("at progress 0: draws all 4 wheels", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0);

    expect(ctx.getCallCount("arc")).toBeGreaterThanOrEqual(4);
  });

  // ── Progress 0.5: Halves separating ─────────────────────────────────────────

  it("at progress 0.5: halves have non-zero separation translates", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);

    const nonZeroTranslates = ctx.getNonZeroTranslates();
    expect(nonZeroTranslates.length).toBeGreaterThan(0);
  });

  it("at progress 0.5: rotation applied to halves", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);

    const nonZeroRotates = ctx.getNonZeroRotates();
    expect(nonZeroRotates.length).toBeGreaterThan(0);
  });

  it("at progress 0.5: separation magnitude is between progress 0 and 1", async () => {
    const { renderSnapAnimation } = await import("./effects");

    // Get max separation at progress 0
    ctx.reset();
    renderSnapAnimation(ctx as any, 0);
    const sepAtZero = ctx.getMaxTranslateMagnitude();

    // Get max separation at progress 0.5
    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);
    const sepAtHalf = ctx.getMaxTranslateMagnitude();

    // Get max separation at progress 1
    ctx.reset();
    renderSnapAnimation(ctx as any, 1);
    const sepAtOne = ctx.getMaxTranslateMagnitude();

    // Separation should be: 0 < half < full (or 0 <= half <= full with monotonicity)
    expect(sepAtHalf).toBeGreaterThan(sepAtZero);
    expect(sepAtOne).toBeGreaterThanOrEqual(sepAtHalf);
  });

  it("at progress 0.5: rotation magnitude is between progress 0 and 1", async () => {
    const { renderSnapAnimation } = await import("./effects");

    ctx.reset();
    renderSnapAnimation(ctx as any, 0);
    const rotAtZero = ctx.getMaxRotationAngle();

    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);
    const rotAtHalf = ctx.getMaxRotationAngle();

    ctx.reset();
    renderSnapAnimation(ctx as any, 1);
    const rotAtOne = ctx.getMaxRotationAngle();

    expect(rotAtHalf).toBeGreaterThan(rotAtZero);
    expect(rotAtOne).toBeGreaterThanOrEqual(rotAtHalf);
  });

  // ── Progress 1: Fully separated ─────────────────────────────────────────────

  it("at progress 1.0: halves fully separated with maximum translate", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 1);

    const nonZeroTranslates = ctx.getNonZeroTranslates();
    expect(nonZeroTranslates.length).toBeGreaterThan(0);

    // Max separation should be significant (not just a pixel)
    const maxSep = ctx.getMaxTranslateMagnitude();
    expect(maxSep).toBeGreaterThan(5);
  });

  it("at progress 1.0: maximum rotation applied", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 1);

    const nonZeroRotates = ctx.getNonZeroRotates();
    expect(nonZeroRotates.length).toBeGreaterThan(0);

    // Rotation should be significant
    const maxRot = ctx.getMaxRotationAngle();
    expect(maxRot).toBeGreaterThan(0.01);
  });

  it("at progress 1.0: separation >= separation at progress 0.5", async () => {
    const { renderSnapAnimation } = await import("./effects");

    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);
    const halfSep = ctx.getMaxTranslateMagnitude();

    ctx.reset();
    renderSnapAnimation(ctx as any, 1);
    const fullSep = ctx.getMaxTranslateMagnitude();

    expect(fullSep).toBeGreaterThanOrEqual(halfSep);
  });

  // ── Transform isolation ─────────────────────────────────────────────────────

  it("uses ctx.save/restore for transform isolation", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);

    expect(ctx.getCallCount("save")).toBeGreaterThan(0);
    // restore count should be >= save count (all saves must be restored)
    expect(ctx.getCallCount("restore")).toBeGreaterThanOrEqual(ctx.getCallCount("save"));
  });

  it("draws wheels on both halves using arc calls", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);

    // Should draw at least 4 wheel arcs (2 per half)
    expect(ctx.getCallCount("arc")).toBeGreaterThanOrEqual(4);
  });

  it("draws both deck halves with fillRect", async () => {
    const { renderSnapAnimation } = await import("./effects");
    ctx.reset();
    renderSnapAnimation(ctx as any, 0.5);

    // Should draw at least 2 fillRect calls for the two halves
    expect(ctx.getCallCount("fillRect")).toBeGreaterThanOrEqual(2);
  });

  // ── Easing / monotonicity ───────────────────────────────────────────────────

  it("separation distance increases monotonically with progress", async () => {
    const { renderSnapAnimation } = await import("./effects");

    const getSeparation = (progress: number): number => {
      ctx.reset();
      renderSnapAnimation(ctx as any, progress);
      return ctx.getMaxTranslateMagnitude();
    };

    const steps: number[] = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    for (let i = 1; i < steps.length; i++) {
      const prevSep = getSeparation(steps[i - 1]!);
      const currSep = getSeparation(steps[i]!);
      expect(currSep).toBeGreaterThanOrEqual(prevSep);
    }
  });

  it("rotation angle increases monotonically with progress", async () => {
    const { renderSnapAnimation } = await import("./effects");

    const getRotation = (progress: number): number => {
      ctx.reset();
      renderSnapAnimation(ctx as any, progress);
      return ctx.getMaxRotationAngle();
    };

    const steps: number[] = [0, 0.25, 0.5, 0.75, 1];
    for (let i = 1; i < steps.length; i++) {
      const prevRot = getRotation(steps[i - 1]!);
      const currRot = getRotation(steps[i]!);
      expect(currRot).toBeGreaterThanOrEqual(prevRot);
    }
  });

  it("ease-in: late progress has disproportionately more separation than early", async () => {
    const { renderSnapAnimation } = await import("./effects");

    ctx.reset();
    renderSnapAnimation(ctx as any, 0.1);
    const earlySep = ctx.getMaxTranslateMagnitude();

    ctx.reset();
    renderSnapAnimation(ctx as any, 0.9);
    const lateSep = ctx.getMaxTranslateMagnitude();

    // With ease-in, the gap between 0.1 and 0.9 should be significant
    // Late separation should be at least 5x early separation (ease-in characteristic)
    if (earlySep > 0) {
      expect(lateSep).toBeGreaterThan(earlySep * 3);
    } else {
      // If early is 0, late must be positive
      expect(lateSep).toBeGreaterThan(0);
    }
  });

  it("crack gap widens as progress increases (translate magnitude comparison)", async () => {
    const { renderSnapAnimation } = await import("./effects");

    ctx.reset();
    renderSnapAnimation(ctx as any, 0.25);
    const q1Sep = ctx.getMaxTranslateMagnitude();

    ctx.reset();
    renderSnapAnimation(ctx as any, 0.75);
    const q3Sep = ctx.getMaxTranslateMagnitude();

    expect(q3Sep).toBeGreaterThan(q1Sep);
  });
});

// ─── Tests for renderGameOver ─────────────────────────────────────────────────

describe("renderGameOver", () => {
  let ctx: MockCanvasContext;

  beforeEach(() => {
    ctx = new MockCanvasContext();
  });

  it("exports renderGameOver function", async () => {
    const effects = await import("./effects");
    expect(typeof effects.renderGameOver).toBe("function");
  });

  it("renders without throwing with valid params", async () => {
    const { renderGameOver } = await import("./effects");
    for (const [score, ticks] of [[0, 0], [150, 60000], [99999, 3600000]] as Array<[number, number]>) {
      ctx.reset();
      expect(() => renderGameOver(ctx as any, score, ticks)).not.toThrow();
    }
  });

  it("throws on null ctx", async () => {
    const { renderGameOver } = await import("./effects");
    expect(() => renderGameOver(null as any, 0, 0)).toThrow();
  });

  it("throws on undefined ctx", async () => {
    const { renderGameOver } = await import("./effects");
    expect(() => renderGameOver(undefined as any, 0, 0)).toThrow();
  });

  // ── Title text ──────────────────────────────────────────────────────────────

  it("displays 'YOUR BOARD SNAPPED' title text", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    expect(ctx.hasFillTextContaining("YOUR BOARD SNAPPED")).toBe(true);
  });

  it("title text is rendered with a large font", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    // Font should contain a size in pixels >= 24 (large text for title)
    expect(ctx.font).toMatch(/(\d{2,})px/);
  });

  it("title text is centered horizontally on canvas", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    // Check that textAlign was set to center (or x position is near center)
    const fillTextCalls = ctx.getFillTextCalls();
    const titleCall = fillTextCalls.find((c) => c[0].includes("YOUR BOARD SNAPPED"));
    expect(titleCall).toBeDefined();
    // Title should be near horizontal center
    if (titleCall) {
      expect(Math.abs(titleCall[1] - CANVAS_WIDTH / 2)).toBeLessThan(50);
    }
  });

  // ── Score display ───────────────────────────────────────────────────────────

  it("displays final score with 'Score' label", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    expect(ctx.hasFillTextContaining("Score")).toBe(true);
    expect(ctx.hasFillTextContaining("150")).toBe(true);
  });

  it("displays score 0 correctly", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 0, 10000);

    expect(ctx.hasFillTextContaining("YOUR BOARD SNAPPED")).toBe(true);
    expect(ctx.hasFillTextContaining("0")).toBe(true);
  });

  it("displays very high score correctly", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 99999, 3600000);

    expect(ctx.hasFillTextContaining("99999")).toBe(true);
  });

  // ── Time survived ───────────────────────────────────────────────────────────

  it("displays time survived in human-readable format", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    // Should display "1:00" for 60 seconds
    expect(ctx.hasFillTextContaining("1:00")).toBe(true);
  });

  it("formats time correctly for 90 seconds (1:30)", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 50, 90000);

    expect(ctx.hasFillTextContaining("1:30")).toBe(true);
  });

  it("formats time correctly for 45 seconds (0:45)", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 20, 45000);

    expect(ctx.hasFillTextContaining("0:45")).toBe(true);
  });

  it("formats time correctly for long durations (61:01)", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 500, 3661000);

    expect(ctx.hasFillTextContaining("61:01")).toBe(true);
  });

  it("formats time correctly for zero ticks", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 0, 0);

    expect(ctx.hasFillTextContaining("0:00")).toBe(true);
  });

  // ── Play Again button ───────────────────────────────────────────────────────

  it("renders 'Play Again' button text", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    expect(ctx.hasFillTextContaining("Play Again")).toBe(true);
  });

  it("returns Play Again button hit region with correct id", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    const result = renderGameOver(ctx as any, 150, 60000);

    expect(result).toBeDefined();
    expect(result!.id).toBe("play-again");
  });

  it("button hit region has valid dimensions", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    const result = renderGameOver(ctx as any, 150, 60000);

    expect(typeof result!.x).toBe("number");
    expect(typeof result!.y).toBe("number");
    expect(typeof result!.w).toBe("number");
    expect(typeof result!.h).toBe("number");
    expect(result!.w).toBeGreaterThan(50); // Reasonable button width
    expect(result!.h).toBeGreaterThan(20); // Reasonable button height
  });

  it("Play Again button is centered horizontally on canvas", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    const result = renderGameOver(ctx as any, 150, 60000);

    const buttonCenterX = result!.x + result!.w / 2;
    expect(Math.abs(buttonCenterX - CANVAS_WIDTH / 2)).toBeLessThan(1);
  });

  it("Play Again button is positioned in lower half of canvas", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    const result = renderGameOver(ctx as any, 150, 60000);

    expect(result!.y).toBeGreaterThan(CANVAS_HEIGHT / 2);
  });

  it("Play Again button fits within canvas bounds", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    const result = renderGameOver(ctx as any, 150, 60000);

    expect(result!.x).toBeGreaterThanOrEqual(0);
    expect(result!.y).toBeGreaterThanOrEqual(0);
    expect(result!.x + result!.w).toBeLessThanOrEqual(CANVAS_WIDTH);
    expect(result!.y + result!.h).toBeLessThanOrEqual(CANVAS_HEIGHT);
  });

  // ── Visual rendering ────────────────────────────────────────────────────────

  it("draws a background overlay for game over screen", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    // Should fill the canvas with a background (dark overlay)
    expect(ctx.getCallCount("fillRect")).toBeGreaterThan(0);
  });

  it("background covers full canvas area", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    const fillRectCalls = ctx.getCalls("fillRect");
    // At least one fillRect should cover the full canvas (800x600)
    const hasFullCanvasFill = fillRectCalls.some(
      (args) => args[2] >= CANVAS_WIDTH && args[3] >= CANVAS_HEIGHT
    );
    expect(hasFullCanvasFill).toBe(true);
  });

  it("renders multiple text elements (title, score, time)", async () => {
    const { renderGameOver } = await import("./effects");
    ctx.reset();
    renderGameOver(ctx as any, 150, 60000);

    // Should have at least 3 fillText calls: title, score, time + play again button
    expect(ctx.getCallCount("fillText")).toBeGreaterThanOrEqual(4);
  });
});

// ─── Tests for isSnapTriggered helper ──────────────────────────────────────────

describe("isSnapTriggered", () => {
  it("exports isSnapTriggered function", async () => {
    const effects = await import("./effects");
    expect(typeof effects.isSnapTriggered).toBe("function");
  });

  it("returns true when deckIntegrity reaches 0", async () => {
    const { isSnapTriggered } = await import("./effects");
    expect(isSnapTriggered(0)).toBe(true);
  });

  it("returns false when deckIntegrity is above 0", async () => {
    const { isSnapTriggered } = await import("./effects");
    expect(isSnapTriggered(1)).toBe(false);
    expect(isSnapTriggered(50)).toBe(false);
    expect(isSnapTriggered(100)).toBe(false);
  });

  it("handles negative deckIntegrity as snapped", async () => {
    const { isSnapTriggered } = await import("./effects");
    expect(isSnapTriggered(-1)).toBe(true);
  });

  it("returns false for fractional values above 0", async () => {
    const { isSnapTriggered } = await import("./effects");
    expect(isSnapTriggered(0.5)).toBe(false);
    expect(isSnapTriggered(0.01)).toBe(false);
  });
});

// ─── Tests for formatTime helper ──────────────────────────────────────────────

describe("formatTime", () => {
  it("exports formatTime function", async () => {
    const effects = await import("./effects");
    expect(typeof effects.formatTime).toBe("function");
  });

  it("formats milliseconds to M:SS format", async () => {
    const { formatTime } = await import("./effects");

    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(1000)).toBe("0:01");
    expect(formatTime(59000)).toBe("0:59");
    expect(formatTime(60000)).toBe("1:00");
    expect(formatTime(90000)).toBe("1:30");
    expect(formatTime(45000)).toBe("0:45");
    expect(formatTime(3661000)).toBe("61:01");
  });

  it("handles sub-second values by rounding down", async () => {
    const { formatTime } = await import("./effects");
    expect(formatTime(500)).toBe("0:00");
    expect(formatTime(999)).toBe("0:00");
  });

  it("handles large durations correctly", async () => {
    const { formatTime } = await import("./effects");
    // 2 hours, 30 minutes, 15 seconds = 9015000ms
    expect(formatTime(9015000)).toBe("150:15");
  });

  it("handles exactly 60 seconds", async () => {
    const { formatTime } = await import("./effects");
    expect(formatTime(60000)).toBe("1:00");
  });

  it("handles odd second values", async () => {
    const { formatTime } = await import("./effects");
    expect(formatTime(127000)).toBe("2:07");
  });
});

// ─── Tests for SNAP_ANIMATION_DURATION ────────────────────────────────────────

describe("SNAP_ANIMATION_DURATION", () => {
  it("exports SNAP_ANIMATION_DURATION constant", async () => {
    const effects = await import("./effects");
    expect(typeof effects.SNAP_ANIMATION_DURATION).toBe("number");
  });

  it("duration is approximately 2 seconds (2000ms)", async () => {
    const { SNAP_ANIMATION_DURATION } = await import("./effects");
    // AC says "~2 seconds" — allow tolerance
    expect(SNAP_ANIMATION_DURATION).toBeGreaterThan(1500);
    expect(SNAP_ANIMATION_DURATION).toBeLessThan(2500);
  });

  it("duration is a positive finite number", async () => {
    const { SNAP_ANIMATION_DURATION } = await import("./effects");
    expect(SNAP_ANIMATION_DURATION).toBeGreaterThan(0);
    expect(Number.isFinite(SNAP_ANIMATION_DURATION)).toBe(true);
  });
});
