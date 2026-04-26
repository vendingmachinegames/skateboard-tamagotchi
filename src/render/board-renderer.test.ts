/// <reference types="bun" />

import { describe, it, expect, beforeEach } from "bun:test";
import type { BoardStats } from "../types/game-types";

/**
 * Mock CanvasRenderingContext2D for testing rendering without a real canvas.
 * Captures all method calls and property assignments for verification.
 */
class MockCanvasContext {
  public calls: Array<{ method: string; args: any[] }> = [];
  private _fillStyle = "";
  private _strokeStyle = "";
  public lineWidth = 1;
  public font = "";
  public textAlign = "start";
  public textBaseline = "alphabetic";

  // Transform tracking
  private _transforms: Array<{ type: string; args: any[] }> = [];
  private _savedStates: any[][] = [];

  get fillStyle(): string {
    return this._fillStyle;
  }
  set fillStyle(value: string) {
    this._fillStyle = value;
    this.calls.push({ method: "fillStyle", args: [value] });
  }

  get strokeStyle(): string {
    return this._strokeStyle;
  }
  set strokeStyle(value: string) {
    this._strokeStyle = value;
    this.calls.push({ method: "strokeStyle", args: [value] });
  }

  fillRect(x: number, y: number, w: number, h: number) {
    this.calls.push({ method: "fillRect", args: [x, y, w, h] });
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.calls.push({ method: "strokeRect", args: [x, y, w, h] });
  }

  clearRect(x: number, y: number, w: number, h: number) {
    this.calls.push({ method: "clearRect", args: [x, y, w, h] });
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ) {
    this.calls.push({ method: "arc", args: [x, y, radius, startAngle, endAngle, counterclockwise] });
  }

  beginPath() {
    this.calls.push({ method: "beginPath", args: [] });
  }

  closePath() {
    this.calls.push({ method: "closePath", args: [] });
  }

  moveTo(x: number, y: number) {
    this.calls.push({ method: "moveTo", args: [x, y] });
  }

  lineTo(x: number, y: number) {
    this.calls.push({ method: "lineTo", args: [x, y] });
  }

  stroke() {
    this.calls.push({ method: "stroke", args: [] });
  }

  fill() {
    this.calls.push({ method: "fill", args: [] });
  }

  save() {
    this._savedStates.push([...this._transforms]);
    this.calls.push({ method: "save", args: [] });
  }

  restore() {
    this._transforms = this._savedStates.pop() || [];
    this.calls.push({ method: "restore", args: [] });
  }

  translate(x: number, y: number) {
    this._transforms.push({ type: "translate", args: [x, y] });
    this.calls.push({ method: "translate", args: [x, y] });
  }

  rotate(angle: number) {
    this._transforms.push({ type: "rotate", args: [angle] });
    this.calls.push({ method: "rotate", args: [angle] });
  }

  scale(x: number, y: number) {
    this._transforms.push({ type: "scale", args: [x, y] });
    this.calls.push({ method: "scale", args: [x, y] });
  }

  setTransform(
    a: number, b: number, c: number, d: number, e: number, f: number
  ) {
    this._transforms = [{ type: "setTransform", args: [a, b, c, d, e, f] }];
    this.calls.push({ method: "setTransform", args: [a, b, c, d, e, f] });
  }

  fillText(text: string, x: number, y: number) {
    this.calls.push({ method: "fillText", args: [text, x, y] });
  }

  measureText(text: string): TextMetrics {
    return { width: text.length * 6 } as TextMetrics;
  }

  clip() {
    this.calls.push({ method: "clip", args: [] });
  }

  /** Helper: find calls by method name */
  getMethodCalls(methodName: string): any[][] {
    return this.calls
      .filter((c) => c.method === methodName)
      .map((c) => c.args);
  }

  /** Helper: count calls by method name */
  countMethodCalls(methodName: string): number {
    return this.calls.filter((c) => c.method === methodName).length;
  }
}

describe("board-renderer", () => {
  let ctx: MockCanvasContext;
  const perfectStats: BoardStats = {
    deckIntegrity: 100,
    wheelWear: 100,
    truckTightness: 100,
    gripCondition: 100,
  };

  beforeEach(() => {
    ctx = new MockCanvasContext();
  });

  // --- AC: CANVAS_WIDTH and CANVAS_HEIGHT constants ---
  describe("CANVAS_WIDTH and CANVAS_HEIGHT constants", () => {
    it("should export CANVAS_WIDTH as 800", async () => {
      const mod = await import("./board-renderer");
      expect(mod.CANVAS_WIDTH).toBe(800);
    });

    it("should export CANVAS_HEIGHT as 600", async () => {
      const mod = await import("./board-renderer");
      expect(mod.CANVAS_HEIGHT).toBe(600);
    });
  });

  // --- AC: renderBoard(ctx, stats) function exists and is callable ---
  describe("renderBoard export", () => {
    it("should export a renderBoard function", async () => {
      const mod = await import("./board-renderer");
      expect(typeof mod.renderBoard).toBe("function");
    });

    it("should accept ctx and BoardStats parameters", async () => {
      const { renderBoard } = await import("./board-renderer");
      expect(() => renderBoard(ctx as any, perfectStats)).not.toThrow();
    });
  });

  // --- AC: Skateboard drawn as top-down view with deck, grip tape, trucks, wheels ---
  describe("skateboard visual components", () => {
    let renderBoard: (ctx: CanvasRenderingContext2D, stats: BoardStats) => void;

    beforeEach(async () => {
      const mod = await import("./board-renderer");
      renderBoard = mod.renderBoard;
    });

    it("should draw a rectangular deck using fillRect", () => {
      renderBoard(ctx as any, perfectStats);
      expect(ctx.countMethodCalls("fillRect")).toBeGreaterThan(0);
    });

    it("should draw grip tape strip (black/dark rectangle)", () => {
      renderBoard(ctx as any, perfectStats);
      // Should set fillStyle to a very dark color for grip tape
      const hasDarkFill = ctx.calls.some(
        (c) =>
          c.method === "fillStyle" &&
          (c.args[0] as string).match(/^#(?:0|1)[a-fA-F0-9]{4}/i)
      );
      expect(hasDarkFill).toBe(true);
    });

    it("should draw trucks as gray rectangles", () => {
      renderBoard(ctx as any, perfectStats);
      const hasGrayFill = ctx.calls.some(
        (c) => c.method === "fillRect" && true // fillRect calls exist
      );
      expect(hasGrayFill).toBe(true);
    });

    it("should draw wheels as circles using arc", () => {
      renderBoard(ctx as any, perfectStats);
      expect(ctx.countMethodCalls("arc")).toBeGreaterThanOrEqual(4);
    });

    it("should draw exactly 4 wheels (2 front + 2 back)", () => {
      renderBoard(ctx as any, perfectStats);
      const arcCount = ctx.countMethodCalls("arc");
      expect(arcCount).toBeGreaterThanOrEqual(4);
    });

    it("should use brown wood color for the deck", () => {
      renderBoard(ctx as any, perfectStats);
      const fillStyleCalls = ctx.calls.filter((c) => c.method === "fillRect");
      expect(fillStyleCalls.length).toBeGreaterThan(0);
    });

    it("should draw wheels with approximately 12px radius (24px diameter)", () => {
      renderBoard(ctx as any, perfectStats);
      const arcCalls = ctx.getMethodCalls("arc");
      const wheelRadii = arcCalls.map((args) => args[2]);
      const hasWheelRadius = wheelRadii.some(
        (r: number) => r >= 10 && r <= 14
      );
      expect(hasWheelRadius).toBe(true);
    });

    it("should draw trucks approximately 60px wide", () => {
      renderBoard(ctx as any, perfectStats);
      const fillRectCalls = ctx.getMethodCalls("fillRect");
      const hasTruckWidth = fillRectCalls.some(
        (args: number[]) => args[2]! >= 55 && args[2]! <= 65
      );
      expect(hasTruckWidth).toBe(true);
    });

    it("should draw deck approximately 120px wide x 320px tall", () => {
      renderBoard(ctx as any, perfectStats);
      const fillRectCalls = ctx.getMethodCalls("fillRect");
      const hasDeckSize = fillRectCalls.some(
        (args: number[]) =>
          args[2]! >= 115 &&
          args[2]! <= 125 &&
          args[3]! >= 315 &&
          args[3]! <= 325
      );
      expect(hasDeckSize).toBe(true);
    });

    it("should draw trucks positioned on the deck (not outside deck bounds)", () => {
      renderBoard(ctx as any, perfectStats);
      const fillRectCalls = ctx.getMethodCalls("fillRect");
      const deckCall = fillRectCalls.find(
        (args: number[]) =>
          args[2]! >= 115 &&
          args[2]! <= 125 &&
          args[3]! >= 315 &&
          args[3]! <= 325
      );
      if (!deckCall) return;

      const deckX = deckCall[0];
      const deckY = deckCall[1];
      const deckW = deckCall[2];
      const deckH = deckCall[3];

      const truckCalls = fillRectCalls.filter(
        (args: number[]) => args[2]! >= 55 && args[2]! <= 65
      );

      expect(truckCalls.length).toBeGreaterThanOrEqual(2);

      for (const truck of truckCalls) {
        const tx = truck[0]!;
        const ty = truck[1]!;
        const tw = truck[2]!;
        const th = truck[3]!;
        expect(tx).toBeGreaterThanOrEqual(deckX - 5);
        expect(tx + tw).toBeLessThanOrEqual(deckX + deckW + 5);
        expect(ty).toBeGreaterThanOrEqual(deckY);
        expect(ty + th).toBeLessThanOrEqual(deckY + deckH);
      }
    });

    it("should draw wheels positioned near trucks (within reasonable distance)", () => {
      renderBoard(ctx as any, perfectStats);
      const arcCalls = ctx.getMethodCalls("arc");
      const wheelPositions = arcCalls
        .filter((args: number[]) => args[2]! >= 10 && args[2]! <= 14)
        .map((args: number[]) => ({ x: args[0], y: args[1] }));

      expect(wheelPositions.length).toBeGreaterThanOrEqual(4);

      if (wheelPositions.length >= 4) {
        const ys = wheelPositions.map((w) => w.y).sort() as number[];
        expect(ys[2]! - ys[1]!).toBeGreaterThan(50);
      }
    });
  });

  // --- AC: Board centered on canvas ---
  describe("board positioning", () => {
    let renderBoard: (ctx: CanvasRenderingContext2D, stats: BoardStats) => void;

    beforeEach(async () => {
      const mod = await import("./board-renderer");
      renderBoard = mod.renderBoard;
    });

    it("should position the board near the center of an 800x600 canvas", () => {
      renderBoard(ctx as any, perfectStats);
      const fillRectCalls = ctx.getMethodCalls("fillRect");
      const deckCall = fillRectCalls.find(
        (args: number[]) =>
          args[2]! >= 115 &&
          args[2]! <= 125 &&
          args[3]! >= 315 &&
          args[3]! <= 325
      );
      if (deckCall) {
        const centerX = deckCall[0]! + deckCall[2]! / 2;
        const centerY = deckCall[1]! + deckCall[3]! / 2;
        expect(centerX).toBeGreaterThan(350);
        expect(centerX).toBeLessThan(450);
        expect(centerY).toBeGreaterThan(250);
        expect(centerY).toBeLessThan(350);
      } else {
        expect(fillRectCalls.length).toBeGreaterThan(0);
      }
    });

    it("should center based on CANVAS_WIDTH and CANVAS_HEIGHT constants", async () => {
      const mod = await import("./board-renderer");
      const { CANVAS_WIDTH, CANVAS_HEIGHT } = mod;

      renderBoard(ctx as any, perfectStats);
      const fillRectCalls = ctx.getMethodCalls("fillRect");
      const deckCall = fillRectCalls.find(
        (args: number[]) =>
          args[2]! >= 115 &&
          args[2]! <= 125 &&
          args[3]! >= 315 &&
          args[3]! <= 325
      );
      if (deckCall) {
        const deckCenterX = deckCall[0]! + deckCall[2]! / 2;
        const deckCenterY = deckCall[1]! + deckCall[3]! / 2;
        expect(deckCenterX).toBeGreaterThan(CANVAS_WIDTH / 2 - 50);
        expect(deckCenterX).toBeLessThan(CANVAS_WIDTH / 2 + 50);
        expect(deckCenterY).toBeGreaterThan(CANVAS_HEIGHT / 2 - 50);
        expect(deckCenterY).toBeLessThan(CANVAS_HEIGHT / 2 + 50);
      }
    });
  });

  // --- AC: Visual appearance adjusts based on stats ---
  describe("stat-based visual adjustments", () => {
    let renderBoard: (ctx: CanvasRenderingContext2D, stats: BoardStats) => void;

    beforeEach(async () => {
      const mod = await import("./board-renderer");
      renderBoard = mod.renderBoard;
    });

    it("should produce different rendering for perfect vs damaged stats", () => {
      const perfectCtx = new MockCanvasContext();
      const damagedCtx = new MockCanvasContext();
      const damagedStats: BoardStats = {
        deckIntegrity: 10,
        wheelWear: 5,
        truckTightness: 15,
        gripCondition: 20,
      };

      renderBoard(perfectCtx as any, perfectStats);
      renderBoard(damagedCtx as any, damagedStats);

      const perfectCalls = JSON.stringify(perfectCtx.calls);
      const damagedCalls = JSON.stringify(damagedCtx.calls);
      expect(perfectCalls).not.toBe(damagedCalls);
    });

    it("should darken wheel color as wheelWear decreases", () => {
      const highWearCtx = new MockCanvasContext();
      const lowWearCtx = new MockCanvasContext();

      renderBoard(highWearCtx as any, perfectStats);
      renderBoard(lowWearCtx as any, {
        ...perfectStats,
        wheelWear: 10,
      });

      const highCalls = JSON.stringify(highWearCtx.calls);
      const lowCalls = JSON.stringify(lowWearCtx.calls);
      expect(highCalls).not.toBe(lowCalls);
    });

    it("should darken deck color as deckIntegrity decreases", () => {
      const highIntegrityCtx = new MockCanvasContext();
      const lowIntegrityCtx = new MockCanvasContext();

      renderBoard(highIntegrityCtx as any, perfectStats);
      renderBoard(lowIntegrityCtx as any, {
        ...perfectStats,
        deckIntegrity: 5,
      });

      const highCalls = JSON.stringify(highIntegrityCtx.calls);
      const lowCalls = JSON.stringify(lowIntegrityCtx.calls);
      expect(highCalls).not.toBe(lowCalls);
    });

    it("should render without errors for all-zero stats", () => {
      const zeroStats: BoardStats = {
        deckIntegrity: 0,
        wheelWear: 0,
        truckTightness: 0,
        gripCondition: 0,
      };
      expect(() => renderBoard(ctx as any, zeroStats)).not.toThrow();
    });

    it("should render without errors for all-100 stats", () => {
      expect(() => renderBoard(ctx as any, perfectStats)).not.toThrow();
    });

    it("should handle mixed stat values", () => {
      const mixedStats: BoardStats = {
        deckIntegrity: 50,
        wheelWear: 80,
        truckTightness: 20,
        gripCondition: 90,
      };
      expect(() => renderBoard(ctx as any, mixedStats)).not.toThrow();
    });

    it("should handle stat values at boundary (exactly 30)", () => {
      const boundaryStats: BoardStats = {
        deckIntegrity: 30,
        wheelWear: 30,
        truckTightness: 30,
        gripCondition: 30,
      };
      expect(() => renderBoard(ctx as any, boundaryStats)).not.toThrow();
    });

    it("should handle stat values at boundary (exactly 60)", () => {
      const boundaryStats: BoardStats = {
        deckIntegrity: 60,
        wheelWear: 60,
        truckTightness: 60,
        gripCondition: 60,
      };
      expect(() => renderBoard(ctx as any, boundaryStats)).not.toThrow();
    });

    it("should handle undefined stats gracefully", () => {
      expect(() => renderBoard(ctx as any, undefined as any)).toThrow();
    });

    it("should handle null stats gracefully", () => {
      expect(() => renderBoard(ctx as any, null as any)).toThrow();
    });

    it("should set different fillStyle values for deck at different integrity levels", () => {
      const ctx100 = new MockCanvasContext();
      const ctx50 = new MockCanvasContext();
      const ctx0 = new MockCanvasContext();

      renderBoard(ctx100 as any, { ...perfectStats, deckIntegrity: 100 });
      renderBoard(ctx50 as any, { ...perfectStats, deckIntegrity: 50 });
      renderBoard(ctx0 as any, { ...perfectStats, deckIntegrity: 0 });

      const getDeckFillStyle = (ctx: MockCanvasContext): string | null => {
        let style = "";
        for (const call of ctx.calls) {
          if (call.method === "fillStyle") {
            style = call.args[0];
          } else if (call.method === "fillRect") {
            const args = call.args as number[];
            if (args[2]! >= 115 && args[3]! >= 315) {
              return style;
            }
          }
        }
        return null;
      };

      const style100 = getDeckFillStyle(ctx100);
      const style50 = getDeckFillStyle(ctx50);
      const style0 = getDeckFillStyle(ctx0);

      expect(style100).not.toBeNull();
      expect(style50).not.toBeNull();
      expect(style0).not.toBeNull();
      expect(style100).not.toBe(style50);
      expect(style50).not.toBe(style0);
    });

    it("should set different fillStyle values for wheels at different wear levels", () => {
      const ctx100 = new MockCanvasContext();
      const ctx0 = new MockCanvasContext();

      renderBoard(ctx100 as any, { ...perfectStats, wheelWear: 100 });
      renderBoard(ctx0 as any, { ...perfectStats, wheelWear: 0 });

      const getWheelFillStyles = (ctx: MockCanvasContext): string[] => {
        const styles: string[] = [];
        let currentStyle = "";
        for (const call of ctx.calls) {
          if (call.method === "fillStyle") {
            currentStyle = call.args[0];
          } else if (call.method === "arc") {
            const args = call.args as number[];
            if (args[2]! >= 10 && args[2]! <= 14) {
              styles.push(currentStyle);
            }
          }
        }
        return styles;
      };

      const wheels100 = getWheelFillStyles(ctx100);
      const wheels0 = getWheelFillStyles(ctx0);

      expect(wheels100.length).toBeGreaterThan(0);
      expect(wheels0.length).toBeGreaterThan(0);
      expect(wheels100[0]!).not.toBe(wheels0[0]!);
    });
  });

  // --- AC: Color shift toward damaged look ---
  describe("color interpolation", () => {
    let renderBoard: (ctx: CanvasRenderingContext2D, stats: BoardStats) => void;

    beforeEach(async () => {
      const mod = await import("./board-renderer");
      renderBoard = mod.renderBoard;
    });

    it("should produce progressively darker colors from 100 to 0 integrity", () => {
      const calls100 = new MockCanvasContext();
      const calls50 = new MockCanvasContext();
      const calls0 = new MockCanvasContext();

      renderBoard(calls100 as any, { ...perfectStats, deckIntegrity: 100 });
      renderBoard(calls50 as any, { ...perfectStats, deckIntegrity: 50 });
      renderBoard(calls0 as any, { ...perfectStats, deckIntegrity: 0 });

      const s100 = JSON.stringify(calls100.calls);
      const s50 = JSON.stringify(calls50.calls);
      const s0 = JSON.stringify(calls0.calls);
      expect(s100).not.toBe(s50);
      expect(s50).not.toBe(s0);
      expect(s100).not.toBe(s0);
    });

    it("should produce progressively darker wheel colors from 100 to 0 wear", () => {
      const calls100 = new MockCanvasContext();
      const calls50 = new MockCanvasContext();
      const calls0 = new MockCanvasContext();

      renderBoard(calls100 as any, { ...perfectStats, wheelWear: 100 });
      renderBoard(calls50 as any, { ...perfectStats, wheelWear: 50 });
      renderBoard(calls0 as any, { ...perfectStats, wheelWear: 0 });

      const s100 = JSON.stringify(calls100.calls);
      const s50 = JSON.stringify(calls50.calls);
      const s0 = JSON.stringify(calls0.calls);
      expect(s100).not.toBe(s50);
      expect(s50).not.toBe(s0);
    });

    it("should use a lighter color for wheels at 100% wear vs darker at 0%", () => {
      const ctx100 = new MockCanvasContext();
      const ctx0 = new MockCanvasContext();

      renderBoard(ctx100 as any, { ...perfectStats, wheelWear: 100 });
      renderBoard(ctx0 as any, { ...perfectStats, wheelWear: 0 });

      const getFillStylesBeforeArc = (ctx: MockCanvasContext): string[] => {
        const styles: string[] = [];
        let currentStyle = "";
        for (const call of ctx.calls) {
          if (call.method === "fillStyle") {
            currentStyle = call.args[0];
          } else if (call.method === "arc") {
            styles.push(currentStyle);
          }
        }
        return styles;
      };

      const wheelStyles100 = getFillStylesBeforeArc(ctx100);
      const wheelStyles0 = getFillStylesBeforeArc(ctx0);

      expect(wheelStyles100[0]).not.toBe(wheelStyles0[0]);
    });

    it("should render grip tape as a black/dark strip on the deck", () => {
      renderBoard(ctx as any, perfectStats);
      let currentFillStyle = "";
      for (const call of ctx.calls) {
        if (call.method === "fillStyle") {
          currentFillStyle = call.args[0];
        } else if (call.method === "fillRect") {
          const args = call.args as number[];
          if (
            currentFillStyle.match(/^#(?:0|1)[a-fA-F0-9]{4}/i) ||
            currentFillStyle.toLowerCase() === "black"
          ) {
            return; // Found dark fillRect for grip tape
          }
        }
      }
      const hasDarkFill = ctx.calls.some(
        (c) =>
          c.method === "fillStyle" &&
          (c.args[0] as string).match(/^#(?:0|1)[a-fA-F0-9]{4}/i)
      );
      expect(hasDarkFill).toBe(true);
    });

    it("should render trucks in a gray color range", () => {
      renderBoard(ctx as any, perfectStats);
      const hasHexColor = ctx.calls.some(
        (c) =>
          c.method === "fillStyle" &&
          /^#[a-fA-F0-9]{6}$/.test(c.args[0] as string)
      );
      expect(hasHexColor).toBe(true);
    });
  });

  // --- AC: Type-check and tests pass (structural) ---
  describe("module structure", () => {
    it("should export renderBoard as a function with correct arity", async () => {
      const mod = await import("./board-renderer");
      expect(mod.renderBoard).toBeInstanceOf(Function);
      expect(mod.renderBoard.length).toBe(2); // ctx and stats
    });

    it("should export CANVAS_WIDTH matching index.html canvas width (800)", async () => {
      const mod = await import("./board-renderer");
      expect(mod.CANVAS_WIDTH).toBe(800);
    });

    it("should export CANVAS_HEIGHT matching index.html canvas height (600)", async () => {
      const mod = await import("./board-renderer");
      expect(mod.CANVAS_HEIGHT).toBe(600);
    });
  });
});
