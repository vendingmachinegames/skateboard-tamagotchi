/// <reference types="bun" />

import { describe, it, expect, mock } from "bun:test";

// These imports will fail until implementation exists (RED phase)
import { setupClick } from "./click";

/**
 * Tests for mouse click detection on UI buttons (US-009).
 * Validates button hit region detection and callback invocation.
 */

describe("setupClick", () => {
  it("should export a setupClick function", () => {
    expect(typeof setupClick).toBe("function");
  });

  /**
   * Helper to create a mock canvas with event listener tracking.
   */
  function createMockCanvas(): MockCanvas {
    const listeners: Record<string, Function[]> = {};
    return {
      addEventListener(type: string, handler: Function) {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(handler);
      },
      removeEventListener(type: string, handler: Function) {
        if (listeners[type]) {
          const idx = listeners[type].indexOf(handler);
          if (idx !== -1) listeners[type].splice(idx, 1);
        }
      },
      getListeners(type: string): Function[] {
        return listeners[type] || [];
      },
    };
  }

  interface MockCanvas {
    addEventListener(type: string, handler: Function): void;
    removeEventListener(type: string, handler: Function): void;
    getListeners(type: string): Function[];
  }

  /**
   * Helper to create a mock MouseEvent with given coordinates.
   */
  function createClickEvent(clientX: number, clientY: number): MockMouseEvent {
    return {
      clientX,
      clientY,
      preventDefault: mock(() => {}),
      stopPropagation: mock(() => {}),
    };
  }

  interface MockMouseEvent {
    clientX: number;
    clientY: number;
    preventDefault: ReturnType<typeof mock>;
    stopPropagation: ReturnType<typeof mock>;
  }

  /**
   * Button region definition matching what renderButtons() returns.
   */
  interface ButtonRegion {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  // ── Click detection on single button ───────────────────────────

  describe("click detection on single button", () => {
    it("should call onClick with button id when clicking at center of button", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "tighten-trucks", x: 10, y: 100, w: 200, h: 40 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      expect(listeners.length).toBeGreaterThan(0);

      // Click at center of button (x=110, y=120)
      listeners[0]!(createClickEvent(110, 120));

      expect(onClick).toHaveBeenCalledWith("tighten-trucks");
    });

    it("should call onClick when clicking on top-left corner (inclusive)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      listeners[0]!(createClickEvent(50, 80));

      expect(onClick).toHaveBeenCalledWith("test-btn");
    });

    it("should call onClick when clicking on bottom-right edge (inclusive)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Bottom-right edge: x=50+100=150, y=80+30=110
      listeners[0]!(createClickEvent(150, 110));

      expect(onClick).toHaveBeenCalledWith("test-btn");
    });

    it("should NOT call onClick when clicking just outside right edge", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Just past right edge: x=151 > 50+100=150
      listeners[0]!(createClickEvent(151, 95));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should NOT call onClick when clicking just outside bottom edge", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Just past bottom edge: y=111 > 80+30=110
      listeners[0]!(createClickEvent(100, 111));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should NOT call onClick when clicking far from button", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      listeners[0]!(createClickEvent(500, 500));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  // ── Multiple buttons ───────────────────────────────────────────

  describe("multiple buttons", () => {
    it("should detect clicks on the correct button in a 2x2 grid", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "btn-1", x: 10, y: 100, w: 200, h: 40 },
        { id: "btn-2", x: 230, y: 100, w: 200, h: 40 },
        { id: "btn-3", x: 10, y: 160, w: 200, h: 40 },
        { id: "btn-4", x: 230, y: 160, w: 200, h: 40 },
      ];
      const clickIds: string[] = [];

      setupClick(canvas, buttons, (id: string) => clickIds.push(id));

      const listeners = canvas.getListeners("click");

      // Click on each button center
      listeners[0]!(createClickEvent(110, 120));  // btn-1
      listeners[0]!(createClickEvent(330, 120));  // btn-2
      listeners[0]!(createClickEvent(110, 180));  // btn-3
      listeners[0]!(createClickEvent(330, 180));  // btn-4

      expect(clickIds).toEqual(["btn-1", "btn-2", "btn-3", "btn-4"]);
    });

    it("should NOT call onClick when clicking in gap between buttons", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "btn-left", x: 0, y: 0, w: 100, h: 30 },
        { id: "btn-right", x: 120, y: 0, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Click in gap between buttons (x=110 is between btn-left right edge 100 and btn-right left edge 120)
      listeners[0]!(createClickEvent(110, 15));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should handle empty button array without errors", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      expect(() => listeners[0]!(createClickEvent(100, 100))).not.toThrow();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  // ── Different button sizes and positions ───────────────────────

  describe("different button sizes and positions", () => {
    it("should handle a very small button (1x1 pixel)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "tiny-btn", x: 50, y: 50, w: 1, h: 1 },
      ];
      const clickIds: string[] = [];

      setupClick(canvas, buttons, (id: string) => clickIds.push(id));

      const listeners = canvas.getListeners("click");
      // Click exactly on the pixel — should hit (range [50, 51] inclusive)
      listeners[0]!(createClickEvent(50, 50));
      expect(clickIds).toContain("tiny-btn");

      // Click two pixels over — should miss (x=52 > 50+1=51)
      listeners[0]!(createClickEvent(52, 50));
      expect(clickIds.filter((id) => id === "tiny-btn").length).toBe(1);
    });

    it("should handle a very large button spanning most of canvas", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "huge-btn", x: 0, y: 0, w: 800, h: 600 },
      ];
      const clickIds: string[] = [];

      setupClick(canvas, buttons, (id: string) => clickIds.push(id));

      const listeners = canvas.getListeners("click");
      // Click at center of canvas (400, 300)
      listeners[0]!(createClickEvent(400, 300));
      expect(clickIds).toContain("huge-btn");

      // Click at corner (799, 599) — still within bounds
      listeners[0]!(createClickEvent(799, 599));
      expect(clickIds.filter((id) => id === "huge-btn").length).toBe(2);

      // Click just outside (801, 601) — should miss
      listeners[0]!(createClickEvent(801, 601));
      expect(clickIds.filter((id) => id === "huge-btn").length).toBe(2);
    });

    it("should handle buttons at origin (0,0)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "origin-btn", x: 0, y: 0, w: 50, h: 50 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      listeners[0]!(createClickEvent(25, 25));
      expect(onClick).toHaveBeenCalledWith("origin-btn");
    });

    it("should handle buttons at far right/bottom of canvas", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "far-btn", x: 750, y: 550, w: 50, h: 50 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      listeners[0]!(createClickEvent(775, 575));
      expect(onClick).toHaveBeenCalledWith("far-btn");
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle clicks at negative coordinates without errors", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      expect(() => listeners[0]!(createClickEvent(-10, -10))).not.toThrow();
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should handle clicks at very large coordinates without errors", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      expect(() => listeners[0]!(createClickEvent(9999, 9999))).not.toThrow();
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should handle zero-width button (no click should register)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "zero-w-btn", x: 50, y: 80, w: 0, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Click at the button's x position — should not register (zero width)
      listeners[0]!(createClickEvent(50, 95));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should handle zero-height button (no click should register)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "zero-h-btn", x: 50, y: 80, w: 100, h: 0 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Click at the button's y position — should not register (zero height)
      listeners[0]!(createClickEvent(100, 80));
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should handle multiple clicks on the same button", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "test-btn", x: 50, y: 80, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      for (let i = 0; i < 5; i++) {
        listeners[0]!(createClickEvent(100, 95));
      }

      expect(onClick).toHaveBeenCalledTimes(5);
    });

    it("should handle rapid alternating clicks between two buttons", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "btn-a", x: 0, y: 0, w: 100, h: 30 },
        { id: "btn-b", x: 200, y: 0, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      listeners[0]!(createClickEvent(50, 15)); // btn-a
      listeners[0]!(createClickEvent(250, 15)); // btn-b
      listeners[0]!(createClickEvent(50, 15)); // btn-a
      listeners[0]!(createClickEvent(250, 15)); // btn-b

      expect(onClick).toHaveBeenCalledTimes(4);
      expect(onClick).toHaveBeenNthCalledWith(1, "btn-a");
      expect(onClick).toHaveBeenNthCalledWith(2, "btn-b");
      expect(onClick).toHaveBeenNthCalledWith(3, "btn-a");
      expect(onClick).toHaveBeenNthCalledWith(4, "btn-b");
    });

    it("should handle overlapping buttons by returning the first matching button", () => {
      const canvas = createMockCanvas();
      // Two buttons that overlap in region (100-200, 10-30)
      const buttons: ButtonRegion[] = [
        { id: "btn-first", x: 50, y: 10, w: 150, h: 30 },
        { id: "btn-second", x: 100, y: 10, w: 150, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Click in overlapping region — should hit first button (first match wins)
      listeners[0]!(createClickEvent(150, 20));
      expect(onClick).toHaveBeenCalledWith("btn-first");
    });

    it("should handle click exactly on left edge of button (inclusive)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "edge-btn", x: 100, y: 50, w: 80, h: 40 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Left edge at x=100
      listeners[0]!(createClickEvent(100, 70));
      expect(onClick).toHaveBeenCalledWith("edge-btn");
    });

    it("should handle click exactly on top edge of button (inclusive)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "edge-btn", x: 100, y: 50, w: 80, h: 40 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Top edge at y=50
      listeners[0]!(createClickEvent(140, 50));
      expect(onClick).toHaveBeenCalledWith("edge-btn");
    });

    it("should handle buttons with negative width or height gracefully", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "neg-w-btn", x: 50, y: 80, w: -10, h: 30 },
        { id: "neg-h-btn", x: 200, y: 80, w: 100, h: -20 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      // Click at positions that would be "inside" if dimensions were positive
      expect(() => listeners[0]!(createClickEvent(60, 95))).not.toThrow();
      expect(() => listeners[0]!(createClickEvent(250, 70))).not.toThrow();
      // Negative dimensions should not register clicks
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  // ── Listener registration ──────────────────────────────────────

  describe("click listener registration", () => {
    it("should register exactly one click event listener on the canvas", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "btn-1", x: 0, y: 0, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const listeners = canvas.getListeners("click");
      expect(listeners.length).toBe(1);
    });

    it("should NOT register a keydown listener (only click)", () => {
      const canvas = createMockCanvas();
      const buttons: ButtonRegion[] = [
        { id: "btn-1", x: 0, y: 0, w: 100, h: 30 },
      ];
      const onClick = mock(() => {});

      setupClick(canvas, buttons, onClick);

      const keydownListeners = canvas.getListeners("keydown");
      expect(keydownListeners.length).toBe(0);
    });
  });
});
