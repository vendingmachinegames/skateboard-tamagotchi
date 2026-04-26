/// <reference types="bun" />

import { describe, it, expect } from "bun:test";
import type { BoardStats, CareAction } from "../types/game-types";

// These imports will fail until implementation exists (RED phase)
import {
  renderStatusBar,
  renderButtons,
  getBarColor,
} from "./ui-renderer";

/**
 * Mock CanvasRenderingContext2D for testing UI rendering without a real canvas.
 */
class MockCanvasContext {
  public calls: Array<{ method: string; args: any[] }> = [];
  private _fillStyle = "";
  private _strokeStyle = "";
  public lineWidth = 1;
  public font = "";
  public textAlign = "start";
  public textBaseline = "alphabetic";

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

  fillText(text: string, x: number, y: number) {
    this.calls.push({ method: "fillText", args: [text, x, y] });
  }

  measureText(text: string): { width: number } {
    return { width: text.length * 7 };
  }

  save() {
    this.calls.push({ method: "save", args: [] });
  }

  restore() {
    this.calls.push({ method: "restore", args: [] });
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

  fill() {
    this.calls.push({ method: "fill", args: [] });
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ) {
    this.calls.push({ method: "arc", args: [x, y, radius, startAngle, endAngle, counterclockwise] });
  }

  closePath() {
    this.calls.push({ method: "closePath", args: [] });
  }

  translate(x: number, y: number) {
    this.calls.push({ method: "translate", args: [x, y] });
  }

  rotate(angle: number) {
    this.calls.push({ method: "rotate", args: [angle] });
  }

  resetCalls() {
    this.calls = [];
  }

  findCall(method: string): any[] | undefined {
    return this.calls.find((c) => c.method === method)?.args;
  }

  findCalls(method: string): any[][] {
    return this.calls.filter((c) => c.method === method).map((c) => c.args);
  }
}

// Helper type for typed mock access
type MockCtx = MockCanvasContext & CanvasRenderingContext2D;

function createMockCtx(): MockCtx {
  return new MockCanvasContext() as unknown as MockCtx;
}

/**
 * Tests for the status bar UI overlay (US-006).
 */

describe("getBarColor", () => {
  it("should export a getBarColor function", () => {
    expect(typeof getBarColor).toBe("function");
  });

  it("should return green when stat > 60%", () => {
    const green = getBarColor(100);
    expect(green).toBeDefined();
    expect(getBarColor(61)).toBe(green); // Both in green range
  });

  it("should return orange when stat is between 30-60%", () => {
    const orange = getBarColor(45);
    expect(orange).toBeDefined();
    expect(orange).not.toBe(getBarColor(100)); // Different from green
    expect(getBarColor(30)).toBe(orange); // Boundary: 30 is orange
  });

  it("should return red when stat < 30%", () => {
    const red = getBarColor(10);
    expect(red).toBeDefined();
    expect(red).not.toBe(getBarColor(45)); // Different from orange
    expect(red).not.toBe(getBarColor(100)); // Different from green
  });

  it("should return orange at exactly 60% (boundary: > 60 is green, 60 is orange)", () => {
    const color = getBarColor(60);
    expect(color).toBe(getBarColor(45)); // Same as mid value (orange)
    expect(color).not.toBe(getBarColor(100)); // Different from green
  });

  it("should return orange at exactly 30% (boundary: >= 30 is orange, < 30 is red)", () => {
    const color = getBarColor(30);
    expect(color).not.toBe(getBarColor(100)); // Not green
    expect(color).toBe(getBarColor(45)); // Same as mid value (orange)
  });

  it("should return red at 0%", () => {
    const color = getBarColor(0);
    expect(color).toBe(getBarColor(10)); // Same as low value (red)
  });

  it("should return red at exactly 29.9%", () => {
    const color = getBarColor(29.9);
    expect(color).toBe(getBarColor(0)); // Same as zero (red)
  });

  it("should handle values above 100 without throwing", () => {
    expect(() => getBarColor(150)).not.toThrow();
    const color = getBarColor(150);
    expect(color).toBe(getBarColor(100)); // Treated as max (green)
  });

  it("should handle negative values without throwing", () => {
    expect(() => getBarColor(-10)).not.toThrow();
    const color = getBarColor(-10);
    expect(color).toBe(getBarColor(0)); // Treated as min (red)
  });

  it("should handle NaN without throwing", () => {
    expect(() => getBarColor(NaN)).not.toThrow();
  });
});

describe("renderStatusBar", () => {
  const freshStats: BoardStats = {
    deckIntegrity: 100,
    wheelWear: 80,
    truckTightness: 50,
    gripCondition: 20,
  };

  it("should export a renderStatusBar function", () => {
    expect(typeof renderStatusBar).toBe("function");
  });

  it("should accept ctx and BoardStats parameters", () => {
    const ctx = createMockCtx();
    expect(() => renderStatusBar(ctx, freshStats)).not.toThrow();
  });

  it("should render four stat bars (Deck Integrity, Wheel Wear, Truck Tightness, Grip Condition)", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats);

    // Should have fillText calls for the labels
    const labelCalls = ctx.findCalls("fillText");
    const labels = labelCalls.map((args: any[]) => args[0] as string);

    expect(labels.some((l) => l.includes("Deck") || l.includes("Integrity"))).toBe(true);
    expect(labels.some((l) => l.includes("Wheel") || l.includes("Wear"))).toBe(true);
    expect(labels.some((l) => l.includes("Truck") || l.includes("Tightness"))).toBe(true);
    expect(labels.some((l) => l.includes("Grip") || l.includes("Condition"))).toBe(true);
  });

  it("should render filled rectangles proportional to stat values", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats);

    // Should have fillRect calls for the bar fills
    const rectCalls = ctx.findCalls("fillRect");
    expect(rectCalls.length).toBeGreaterThan(0);
  });

  it("should use green color for stats > 60%", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats);

    // deckIntegrity=100 and wheelWear=80 should be green
    const fillStyles = ctx.findCalls("fillStyle");
    const hasGreenishColor = fillStyles.some((args: any[]) => {
      const color = args[0] as string;
      return (
        color.includes("0,180") ||
        color === "#00b400" ||
        color.includes("green") ||
        color.includes("00cc00") ||
        color.includes("00bb00") ||
        color.includes("00b400")
      );
    });
    expect(hasGreenishColor).toBe(true);
  });

  it("should use orange color for stats between 30-60%", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats);

    // truckTightness=50 should be orange
    const fillStyles = ctx.findCalls("fillStyle");
    const hasOrangeColor = fillStyles.some((args: any[]) => {
      const color = args[0] as string;
      return (
        color.includes("255,165") ||
        color === "#ffa500" ||
        color.includes("orange") ||
        color.includes("ffaa00") ||
        color.includes("ffa500")
      );
    });
    expect(hasOrangeColor).toBe(true);
  });

  it("should use red color for stats < 30%", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats);

    // gripCondition=20 should be red
    const fillStyles = ctx.findCalls("fillStyle");
    const hasRedColor = fillStyles.some((args: any[]) => {
      const color = args[0] as string;
      return (
        color.includes("220,40") ||
        color === "#dc2828" ||
        color.includes("red") ||
        color.includes("dc2828") ||
        color.includes("ff0000") ||
        color.includes("cc0000")
      );
    });
    expect(hasRedColor).toBe(true);
  });

  it("should display score as text in top-right area", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats, 150); // score = 150

    const textCalls = ctx.findCalls("fillText");
    const hasScoreText = textCalls.some((args: any[]) => {
      const text = args[0] as string;
      return text.includes("150") || text.includes("Score");
    });
    expect(hasScoreText).toBe(true);
  });

  it("should display score 0 when no score provided", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats, 0);

    const textCalls = ctx.findCalls("fillText");
    const hasScoreText = textCalls.some((args: any[]) => {
      const text = args[0] as string;
      return text.includes("0") || text.includes("Score");
    });
    expect(hasScoreText).toBe(true);
  });

  it("should handle all-zero stats without error", () => {
    const ctx = createMockCtx();
    const zeroStats: BoardStats = {
      deckIntegrity: 0,
      wheelWear: 0,
      truckTightness: 0,
      gripCondition: 0,
    };
    expect(() => renderStatusBar(ctx, zeroStats)).not.toThrow();
  });

  it("should handle all-100 stats without error", () => {
    const ctx = createMockCtx();
    const perfectStats: BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    expect(() => renderStatusBar(ctx, perfectStats)).not.toThrow();
  });

  it("should produce different rendering for different stat values", () => {
    const ctx1 = createMockCtx();
    const ctx2 = createMockCtx();

    renderStatusBar(ctx1, { ...freshStats, deckIntegrity: 100 });
    renderStatusBar(ctx2, { ...freshStats, deckIntegrity: 5 });

    // Different stat values should produce different fillStyle sequences
    const styles1 = JSON.stringify(ctx1.findCalls("fillStyle"));
    const styles2 = JSON.stringify(ctx2.findCalls("fillStyle"));
    expect(styles1).not.toBe(styles2);
  });

  it("should render bar widths proportional to stat values", () => {
    const ctx = createMockCtx();
    // Use stats with very different values to verify proportional rendering
    const extremeStats: BoardStats = {
      deckIntegrity: 100, // Full width
      wheelWear: 50, // Half width
      truckTightness: 25, // Quarter width
      gripCondition: 0, // Zero width
    };
    renderStatusBar(ctx, extremeStats);

    // Should have fillRect calls with varying widths (background + filled bars)
    const rectCalls = ctx.findCalls("fillRect");
    expect(rectCalls.length).toBeGreaterThanOrEqual(4); // At least 4 stat bars
  });

  it("should render all four stat labels", () => {
    const ctx = createMockCtx();
    renderStatusBar(ctx, freshStats);

    const textCalls = ctx.findCalls("fillText");
    const allLabels = textCalls.map((args: any[]) => args[0] as string);

    // Should have at least 4 label texts (one per stat)
    const labelCount = allLabels.filter(
      (l: string) => l.includes("Deck") || l.includes("Wheel") || l.includes("Truck") || l.includes("Grip"),
    ).length;
    expect(labelCount).toBeGreaterThanOrEqual(4);
  });

  it("should handle null/undefined ctx gracefully", () => {
    expect(() => renderStatusBar(null as unknown as CanvasRenderingContext2D, freshStats)).toThrow();
  });

  it("should handle null/undefined stats gracefully", () => {
    const ctx = createMockCtx();
    expect(() => renderStatusBar(ctx, null as unknown as BoardStats)).toThrow();
  });
});

describe("renderButtons", () => {
  it("should export a renderButtons function", () => {
    expect(typeof renderButtons).toBe("function");
  });

  it("should accept ctx, actions, and currentTime parameters", () => {
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: 0,
        effects: { truckTightness: 25 },
      },
    ];
    expect(() => renderButtons(ctx, actions, Date.now())).not.toThrow();
  });

  it("should return button hit regions as array of objects with id, x, y, w, h", () => {
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: 0,
        effects: { truckTightness: 25 },
      },
      {
        id: "replace-wheels",
        label: "Replace Wheels",
        shortcut: "2",
        cooldown: 15000,
        lastUsed: 0,
        effects: { wheelWear: 30 },
      },
    ];
    const buttons = renderButtons(ctx, actions, Date.now());

    expect(Array.isArray(buttons)).toBe(true);
    expect(buttons.length).toBe(2);

    for (const btn of buttons) {
      expect(btn).toHaveProperty("id");
      expect(btn).toHaveProperty("x");
      expect(btn).toHaveProperty("y");
      expect(btn).toHaveProperty("w");
      expect(btn).toHaveProperty("h");
    }
  });

  it("should render buttons as labeled rectangles", () => {
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: 0,
        effects: { truckTightness: 25 },
      },
    ];
    renderButtons(ctx, actions, Date.now());

    // Should have fillRect calls for button backgrounds
    const rectCalls = ctx.findCalls("fillRect");
    expect(rectCalls.length).toBeGreaterThan(0);

    // Should have fillText calls for button labels
    const textCalls = ctx.findCalls("fillText");
    expect(textCalls.some((args: any[]) => args[0].includes("Tighten"))).toBe(true);
  });

  it("should show cooldown timer when action is on cooldown", () => {
    const now = Date.now();
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 3000, // Used 3 seconds ago, 5s remaining
        effects: { truckTightness: 25 },
      },
    ];
    renderButtons(ctx, actions, now);

    const textCalls = ctx.findCalls("fillText");
    // Should have some cooldown indicator (e.g., "5s" or similar)
    const hasCooldownText = textCalls.some((args: any[]) => {
      const text = args[0] as string;
      return text.includes("5") || text.includes("s");
    });
    expect(hasCooldownText).toBe(true);
  });

  it("should show dimmed appearance for on-cooldown buttons", () => {
    const now = Date.now();
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 3000, // On cooldown
        effects: { truckTightness: 25 },
      },
    ];

    renderButtons(ctx, actions, now);

    // Dimmed buttons should use a darker/gray fillStyle
    const fillStyles = ctx.findCalls("fillStyle");
    expect(fillStyles.length).toBeGreaterThan(0);
  });

  it("should not show cooldown for available actions", () => {
    const now = Date.now();
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: 0, // Never used
        effects: { truckTightness: 25 },
      },
    ];

    renderButtons(ctx, actions, now);

    const textCalls = ctx.findCalls("fillText");
    // Should not have cooldown seconds text for available action
    const hasOnlyLabels = textCalls.every((args: any[]) => {
      const text = args[0] as string;
      return !text.match(/^\d+s$/); // No "Xs" format cooldown text
    });
    expect(hasOnlyLabels).toBe(true);
  });

  it("should handle empty actions array", () => {
    const ctx = createMockCtx();
    const buttons = renderButtons(ctx, [], Date.now());
    expect(buttons).toEqual([]);
  });

  it("should return correct number of buttons matching actions count", () => {
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      { id: "tighten-trucks", label: "Tighten Trucks", shortcut: "1", cooldown: 8000, lastUsed: 0, effects: { truckTightness: 25 } },
      { id: "replace-wheels", label: "Replace Wheels", shortcut: "2", cooldown: 15000, lastUsed: 0, effects: { wheelWear: 30 } },
      { id: "sand-grip-tape", label: "Sand Grip Tape", shortcut: "3", cooldown: 10000, lastUsed: 0, effects: { gripCondition: 25 } },
      { id: "apply-wax", label: "Apply Wax", shortcut: "", cooldown: 20000, lastUsed: 0, effects: { deckIntegrity: 15, wheelWear: 15, truckTightness: 15, gripCondition: 15 } },
    ];
    const buttons = renderButtons(ctx, actions, Date.now());
    expect(buttons.length).toBe(4);
  });

  it("should include action IDs in button hit regions", () => {
    const ctx = createMockCtx();
    const actions: CareAction[] = [
      { id: "tighten-trucks", label: "Tighten Trucks", shortcut: "1", cooldown: 8000, lastUsed: 0, effects: { truckTightness: 25 } },
      { id: "replace-wheels", label: "Replace Wheels", shortcut: "2", cooldown: 15000, lastUsed: 0, effects: { wheelWear: 30 } },
    ];
    const buttons = renderButtons(ctx, actions, Date.now());
    const ids = buttons.map((b) => b.id);
    expect(ids).toContain("tighten-trucks");
    expect(ids).toContain("replace-wheels");
  });

  it("should show different cooldown values for different elapsed times", () => {
    const now = Date.now();
    const ctx1 = createMockCtx();
    const ctx2 = createMockCtx();

    const actions1: CareAction[] = [
      { id: "tighten-trucks", label: "Tighten Trucks", shortcut: "1", cooldown: 8000, lastUsed: now - 3000, effects: { truckTightness: 25 } },
    ];
    const actions2: CareAction[] = [
      { id: "tighten-trucks", label: "Tighten Trucks", shortcut: "1", cooldown: 8000, lastUsed: now - 6000, effects: { truckTightness: 25 } },
    ];

    renderButtons(ctx1, actions1, now); // 5s remaining
    renderButtons(ctx2, actions2, now); // 2s remaining

    const text1 = JSON.stringify(ctx1.findCalls("fillText"));
    const text2 = JSON.stringify(ctx2.findCalls("fillText"));
    expect(text1).not.toBe(text2); // Different cooldown values should produce different text
  });
});
