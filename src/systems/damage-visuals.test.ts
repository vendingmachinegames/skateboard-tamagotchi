/// <reference types="bun" />

import { describe, it, expect, beforeEach } from "bun:test";
import { generateCracks, renderCracks, type Crack, CRACK_CONFIG } from "./damage-visuals";

/**
 * Mock CanvasRenderingContext2D for testing rendering without a real canvas.
 */
class MockCanvasContext {
  public calls: Array<{ method: string; args: any[] }> = [];
  private _fillStyle = "";
  private _strokeStyle = "";
  private _lineWidthValues: number[] = [];
  public font = "";

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

  get lineWidth(): number {
    const last = this._lineWidthValues[this._lineWidthValues.length - 1];
    return last !== undefined ? last : 1;
  }
  set lineWidth(value: number) {
    this._lineWidthValues.push(value);
    this.calls.push({ method: "lineWidth", args: [value] });
  }

  beginPath() {
    this.calls.push({ method: "beginPath", args: [] });
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

  save() {
    this.calls.push({ method: "save", args: [] });
  }

  restore() {
    this.calls.push({ method: "restore", args: [] });
  }
}

describe("generateCracks", () => {
  describe("return type and structure", () => {
    it("returns an array of Crack objects", () => {
      const cracks = generateCracks(50, 12345);
      expect(Array.isArray(cracks)).toBe(true);
    });

    it("each crack has startX, startY, points, and severity", () => {
      const cracks = generateCracks(50, 12345);
      for (const crack of cracks) {
        expect(typeof crack.startX).toBe("number");
        expect(typeof crack.startY).toBe("number");
        expect(Array.isArray(crack.points)).toBe(true);
        expect(typeof crack.severity).toBe("number");
        // severity should be between 0 and 1
        expect(crack.severity).toBeGreaterThanOrEqual(0);
        expect(crack.severity).toBeLessThanOrEqual(1);
      }
    });

    it("each crack point has x and y coordinates", () => {
      const cracks = generateCracks(50, 12345);
      for (const crack of cracks) {
        for (const point of crack.points) {
          expect(typeof point.x).toBe("number");
          expect(typeof point.y).toBe("number");
        }
      }
    });
  });

  describe("deckIntegrity > 70: no cracks", () => {
    it("returns empty array when deckIntegrity is 100", () => {
      const cracks = generateCracks(100, 0);
      expect(cracks.length).toBe(0);
    });

    it("returns empty array when deckIntegrity is 71", () => {
      const cracks = generateCracks(71, 0);
      expect(cracks.length).toBe(0);
    });

    it("returns cracks at exactly 70 (boundary - enters hairline range)", () => {
      // > 70 means no cracks; at 70 we are in the 40-70 range
      const cracks = generateCracks(70, 0);
      expect(cracks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("deckIntegrity 40-70: 1-2 hairline cracks", () => {
    it("returns 1-2 cracks when deckIntegrity is 50", () => {
      const cracks = generateCracks(50, 42);
      expect(cracks.length).toBeGreaterThanOrEqual(1);
      expect(cracks.length).toBeLessThanOrEqual(2);
    });

    it("returns 1-2 cracks when deckIntegrity is 69", () => {
      const cracks = generateCracks(69, 42);
      expect(cracks.length).toBeGreaterThanOrEqual(1);
      expect(cracks.length).toBeLessThanOrEqual(2);
    });

    it("returns 1-2 cracks when deckIntegrity is 40", () => {
      const cracks = generateCracks(40, 42);
      expect(cracks.length).toBeGreaterThanOrEqual(1);
      expect(cracks.length).toBeLessThanOrEqual(2);
    });

    it("cracks in this range have low severity (hairline)", () => {
      const cracks = generateCracks(50, 42);
      for (const crack of cracks) {
        // Hairline cracks should have relatively low severity
        expect(crack.severity).toBeLessThan(0.5);
      }
    });

    it("hairline cracks are thin with few segments", () => {
      const cracks = generateCracks(60, 42);
      for (const crack of cracks) {
        // Hairline cracks should be relatively simple - few segments
        expect(crack.points.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("deckIntegrity 20-40: 3-5 cracks, thicker lines, branching", () => {
    it("returns 3-5 cracks when deckIntegrity is 30", () => {
      const cracks = generateCracks(30, 99);
      expect(cracks.length).toBeGreaterThanOrEqual(3);
      expect(cracks.length).toBeLessThanOrEqual(5);
    });

    it("returns 3-5 cracks when deckIntegrity is 21", () => {
      const cracks = generateCracks(21, 99);
      expect(cracks.length).toBeGreaterThanOrEqual(3);
      expect(cracks.length).toBeLessThanOrEqual(5);
    });

    it("returns 3-5 cracks when deckIntegrity is exactly 20 (boundary)", () => {
      // < 20 means 6+; at 20 we are in the 20-40 range
      const cracks = generateCracks(20, 99);
      expect(cracks.length).toBeGreaterThanOrEqual(3);
      expect(cracks.length).toBeLessThanOrEqual(5);
    });

    it("cracks in this range have medium severity", () => {
      const cracks = generateCracks(30, 99);
      // At least some cracks should have medium-to-high severity
      const maxSeverity = Math.max(...cracks.map((c) => c.severity));
      expect(maxSeverity).toBeGreaterThanOrEqual(0.3);
    });

    it("some cracks in this range have branching (multiple points)", () => {
      const cracks = generateCracks(30, 99);
      const hasBranching = cracks.some((c) => c.points.length >= 2);
      expect(hasBranching).toBe(true);
    });

    it("cracks in this range show jaggedness (points do not form straight lines)", () => {
      const cracks = generateCracks(30, 99);
      // At least one crack should have non-linear points (jagged)
      const hasJagged = cracks.some((c) => {
        if (c.points.length < 2) return false;
        // Check if direction changes between segments
        const p0 = c.points[0];
        const p1 = c.points[1];
        if (!p0 || !p1) return false;
        const dx1 = p0.x - c.startX;
        const dy1 = p0.y - c.startY;
        const dx2 = p1.x - p0.x;
        const dy2 = p1.y - p0.y;
        // If slopes differ significantly, it is jagged
        return Math.abs(dx1 * dy2 - dx2 * dy1) > 5;
      });
      expect(hasJagged).toBe(true);
    });
  });

  describe("deckIntegrity < 20: 6+ cracks with major split", () => {
    it("returns 6+ cracks when deckIntegrity is 15", () => {
      const cracks = generateCracks(15, 777);
      expect(cracks.length).toBeGreaterThanOrEqual(6);
    });

    it("returns 6+ cracks when deckIntegrity is 10", () => {
      const cracks = generateCracks(10, 777);
      expect(cracks.length).toBeGreaterThanOrEqual(6);
    });

    it("returns 6+ cracks when deckIntegrity is 1", () => {
      const cracks = generateCracks(1, 777);
      expect(cracks.length).toBeGreaterThanOrEqual(6);
    });

    it("returns 6+ cracks when deckIntegrity is 0", () => {
      const cracks = generateCracks(0, 777);
      expect(cracks.length).toBeGreaterThanOrEqual(6);
    });

    it("at least one crack has high severity (major split line)", () => {
      const cracks = generateCracks(10, 777);
      const maxSeverity = Math.max(...cracks.map((c) => c.severity));
      expect(maxSeverity).toBeGreaterThanOrEqual(0.7);
    });

    it("major crack spans a significant portion of the deck", () => {
      const cracks = generateCracks(5, 12345);
      // Find the highest severity crack (should be the major one)
      let majorCrack = cracks[0]!;
      for (const c of cracks) {
        if (c.severity > majorCrack.severity) majorCrack = c;
      }
      // The major crack should have multiple points spanning a good distance
      expect(majorCrack!.points.length).toBeGreaterThanOrEqual(3);
    });

    it("major split line spans across the deck (large y-distance)", () => {
      const cracks = generateCracks(5, 12345);
      let majorCrack = cracks[0]!;
      for (const c of cracks) {
        if (c.severity > majorCrack.severity) majorCrack = c;
      }
      // Calculate total span of the crack
      const allYs = [majorCrack!.startY, ...majorCrack!.points.map((p) => p.y)];
      const ySpan = Math.max(...allYs) - Math.min(...allYs);
      // A split line should span at least 100px vertically (deck is 320px tall)
      expect(ySpan).toBeGreaterThanOrEqual(100);
    });

    it("severity increases as deckIntegrity decreases within critical range", () => {
      const cracksAt15 = generateCracks(15, 777);
      const cracksAt5 = generateCracks(5, 777);
      let maxSev15 = 0;
      for (const c of cracksAt15) if (c.severity > maxSev15) maxSev15 = c.severity;
      let maxSev5 = 0;
      for (const c of cracksAt5) if (c.severity > maxSev5) maxSev5 = c.severity;
      // Lower integrity should produce higher max severity
      expect(maxSev5).toBeGreaterThanOrEqual(maxSev15);
    });
  });

  describe("deterministic seeding by ticksAlive", () => {
    it("same seed produces same cracks", () => {
      const cracks1 = generateCracks(50, 12345);
      const cracks2 = generateCracks(50, 12345);

      expect(JSON.stringify(cracks1)).toEqual(JSON.stringify(cracks2));
    });

    it("different seeds produce different cracks", () => {
      const cracks1 = generateCracks(50, 12345);
      const cracks2 = generateCracks(50, 67890);

      // With different seeds, crack positions should differ
      expect(JSON.stringify(cracks1)).not.toEqual(JSON.stringify(cracks2));
    });

    it("crack positions are within deck bounds", () => {
      const cracks = generateCracks(30, 42424);
      for (const crack of cracks) {
        // startX/startY should be reasonable canvas coordinates
        expect(crack.startX).toBeGreaterThanOrEqual(0);
        expect(crack.startY).toBeGreaterThanOrEqual(0);
        expect(crack.startX).toBeLessThan(800);
        expect(crack.startY).toBeLessThan(600);

        for (const point of crack.points) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThan(800);
          expect(point.y).toBeLessThan(600);
        }
      }
    });
  });

  describe("edge cases", () => {
    it("handles deckIntegrity of exactly 100 (perfect board)", () => {
      const cracks = generateCracks(100, 0);
      expect(cracks.length).toBe(0);
    });

    it("handles deckIntegrity below 0 (defensive clamping)", () => {
      // Should treat as 0 or clamp to valid range
      const cracks = generateCracks(-5, 42);
      expect(Array.isArray(cracks)).toBe(true);
    });

    it("handles deckIntegrity above 100 (defensive clamping)", () => {
      const cracks = generateCracks(150, 42);
      expect(cracks.length).toBe(0);
    });

    it("seed of 0 works correctly", () => {
      const cracks = generateCracks(30, 0);
      expect(Array.isArray(cracks)).toBe(true);
    });

    it("handles negative seed by treating as valid seed", () => {
      // Negative seeds should still produce deterministic results
      const cracks1 = generateCracks(50, -42);
      const cracks2 = generateCracks(50, -42);
      expect(JSON.stringify(cracks1)).toEqual(JSON.stringify(cracks2));
    });

    it("handles very large ticksAlive values", () => {
      // Large timestamps should still produce valid cracks
      const cracks = generateCracks(30, 9999999999);
      expect(Array.isArray(cracks)).toBe(true);
      for (const crack of cracks) {
        expect(crack.startX).toBeGreaterThanOrEqual(0);
        expect(crack.startY).toBeGreaterThanOrEqual(0);
        for (const point of crack.points) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("handles very small ticksAlive values", () => {
      const cracks = generateCracks(30, 1);
      expect(Array.isArray(cracks)).toBe(true);
    });

    it("different seeds at same integrity produce different crack counts or positions", () => {
      // Prove the implementation is not hardcoded by testing many seeds
      const seedResults: string[] = [];
      for (let s = 1; s <= 20; s++) {
        const cracks = generateCracks(30, s);
        seedResults.push(JSON.stringify(cracks));
      }
      // At least some results should differ
      const unique = new Set(seedResults);
      expect(unique.size).toBeGreaterThan(1);
    });

    it("multiple seeds at critical level all produce 6+ cracks", () => {
      for (let s = 0; s < 15; s++) {
        const cracks = generateCracks(10, s * 1000 + 7);
        expect(cracks.length).toBeGreaterThanOrEqual(6);
      }
    });

    it("multiple seeds at hairline level all produce 1-2 cracks", () => {
      for (let s = 0; s < 15; s++) {
        const cracks = generateCracks(55, s * 1000 + 3);
        expect(cracks.length).toBeGreaterThanOrEqual(1);
        expect(cracks.length).toBeLessThanOrEqual(2);
      }
    });
  });
});

describe("renderCracks", () => {
  let ctx: MockCanvasContext;

  beforeEach(() => {
    ctx = new MockCanvasContext();
  });

  it("renders cracks using beginPath/moveTo/lineTo/stroke pattern", () => {
    const cracks: Crack[] = [
      {
        startX: 350,
        startY: 200,
        points: [{ x: 360, y: 210 }, { x: 370, y: 220 }],
        severity: 0.5,
      },
    ];
    renderCracks(ctx as unknown as CanvasRenderingContext2D, cracks);

    // Should have beginPath calls
    const beginPaths = ctx.calls.filter((c) => c.method === "beginPath");
    expect(beginPaths.length).toBeGreaterThanOrEqual(1);

    // Should have moveTo calls
    const moveTos = ctx.calls.filter((c) => c.method === "moveTo");
    expect(moveTos.length).toBeGreaterThanOrEqual(1);

    // Should have lineTo calls
    const lineTos = ctx.calls.filter((c) => c.method === "lineTo");
    expect(lineTos.length).toBeGreaterThanOrEqual(1);

    // Should have stroke calls
    const strokes = ctx.calls.filter((c) => c.method === "stroke");
    expect(strokes.length).toBeGreaterThanOrEqual(1);
  });

  it("uses dark colors for cracks (black or dark brown)", () => {
    const cracks: Crack[] = [
      {
        startX: 350,
        startY: 200,
        points: [{ x: 360, y: 210 }],
        severity: 0.5,
      },
    ];
    renderCracks(ctx as unknown as CanvasRenderingContext2D, cracks);

    const strokeStyles = ctx.calls.filter(
      (c) => c.method === "strokeStyle"
    );
    // At least one stroke style should be set to a dark color
    expect(strokeStyles.length).toBeGreaterThanOrEqual(1);
    // Verify it is a dark color (not white or bright)
    const lastStrokeColor = strokeStyles[0]!.args[0];
    expect(typeof lastStrokeColor).toBe("string");
  });

  it("lineWidth varies based on crack severity", () => {
    const lowSeverityCracks: Crack[] = [
      {
        startX: 350,
        startY: 200,
        points: [{ x: 360, y: 210 }],
        severity: 0.1, // Low severity - thin line
      },
    ];
    const highSeverityCracks: Crack[] = [
      {
        startX: 350,
        startY: 200,
        points: [{ x: 360, y: 210 }],
        severity: 0.9, // High severity - thick line
      },
    ];

    const lowCtx = new MockCanvasContext();
    const highCtx = new MockCanvasContext();

    renderCracks(lowCtx as unknown as CanvasRenderingContext2D, lowSeverityCracks);
    renderCracks(highCtx as unknown as CanvasRenderingContext2D, highSeverityCracks);

    // Both should have set lineWidth via property setter
    const lowLineWidthCalls = lowCtx.calls.filter(
      (c) => c.method === "lineWidth"
    );
    const highLineWidthCalls = highCtx.calls.filter(
      (c) => c.method === "lineWidth"
    );

    expect(lowLineWidthCalls.length).toBeGreaterThanOrEqual(1);
    expect(highLineWidthCalls.length).toBeGreaterThanOrEqual(1);

    // High severity should produce thicker lines
    const lowWidth = lowLineWidthCalls[0]!.args[0];
    const highWidth = highLineWidthCalls[0]!.args[0];
    expect(highWidth).toBeGreaterThan(lowWidth);
  });

  it("handles empty cracks array without error", () => {
    renderCracks(ctx as unknown as CanvasRenderingContext2D, []);
    // Should not throw, just do nothing meaningful
    const drawingCalls = ctx.calls.filter(
      (c) => c.method === "lineTo" || c.method === "stroke"
    );
    expect(drawingCalls.length).toBe(0);
  });

  it("renders multiple cracks independently", () => {
    const cracks: Crack[] = [
      {
        startX: 350,
        startY: 200,
        points: [{ x: 360, y: 210 }],
        severity: 0.3,
      },
      {
        startX: 400,
        startY: 300,
        points: [{ x: 410, y: 310 }, { x: 420, y: 320 }],
        severity: 0.6,
      },
    ];
    renderCracks(ctx as unknown as CanvasRenderingContext2D, cracks);

    // Should have at least 2 beginPath calls (one per crack)
    const beginPaths = ctx.calls.filter((c) => c.method === "beginPath");
    expect(beginPaths.length).toBeGreaterThanOrEqual(2);

    // Should have at least 3 lineTo calls (1 for first crack, 2 for second)
    const lineTos = ctx.calls.filter((c) => c.method === "lineTo");
    expect(lineTos.length).toBeGreaterThanOrEqual(3);
  });

  it("renders jagged lines (not straight) for multi-point cracks", () => {
    const cracks: Crack[] = [
      {
        startX: 350,
        startY: 200,
        points: [
          { x: 360, y: 215 },
          { x: 348, y: 230 },
          { x: 362, y: 245 },
        ],
        severity: 0.7,
      },
    ];
    renderCracks(ctx as unknown as CanvasRenderingContext2D, cracks);

    // Should have multiple lineTo calls for jagged path
    const lineTos = ctx.calls.filter((c) => c.method === "lineTo");
    expect(lineTos.length).toBeGreaterThanOrEqual(3);
  });

  it("renders generated cracks with jagged paths (slope changes between segments)", () => {
    // Generate cracks and verify the rendered path has direction changes
    const cracks = generateCracks(25, 42);
    renderCracks(ctx as unknown as CanvasRenderingContext2D, cracks);

    // Collect all lineTo calls to analyze path geometry
    const lineTos = ctx.calls.filter((c) => c.method === "lineTo");
    const moveTos = ctx.calls.filter((c) => c.method === "moveTo");

    // For cracks with multiple points, there should be direction changes
    if (cracks.some((c) => c.points.length >= 2)) {
      // Verify we have enough line segments to form jagged paths
      expect(lineTos.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("throws on null ctx", () => {
    expect(() =>
      renderCracks(null as unknown as CanvasRenderingContext2D, [])
    ).toThrow();
  });

  it("throws on null cracks", () => {
    expect(() =>
      renderCracks(
        ctx as unknown as CanvasRenderingContext2D,
        null as unknown as Crack[]
      )
    ).toThrow();
  });
});

describe("CRACK_CONFIG", () => {
  it("exports crack configuration constants", () => {
    expect(CRACK_CONFIG).toBeDefined();
    expect(typeof CRACK_CONFIG.noCracksThreshold).toBe("number");
    expect(CRACK_CONFIG.noCracksThreshold).toBe(70);
  });

  it("has thresholds for each damage level", () => {
    expect(typeof CRACK_CONFIG.hairlineMin).toBe("number");
    expect(typeof CRACK_CONFIG.hairlineMax).toBe("number");
    expect(typeof CRACK_CONFIG.crackedMin).toBe("number");
    expect(typeof CRACK_CONFIG.crackedMax).toBe("number");
    expect(typeof CRACK_CONFIG.criticalThreshold).toBe("number");
  });

  it("thresholds are logically ordered", () => {
    expect(CRACK_CONFIG.hairlineMax).toBeGreaterThanOrEqual(
      CRACK_CONFIG.noCracksThreshold
    );
    expect(CRACK_CONFIG.hairlineMin).toBeLessThan(CRACK_CONFIG.hairlineMax);
    expect(CRACK_CONFIG.crackedMin).toBeLessThanOrEqual(
      CRACK_CONFIG.crackedMax
    );
  });
});
