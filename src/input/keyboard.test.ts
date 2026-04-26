/// <reference types="bun" />

import { describe, it, expect, mock } from "bun:test";
import type { GamePhase } from "../types/game-types";

// These imports will fail until implementation exists (RED phase)
import { setupKeyboard } from "./keyboard";

/**
 * Tests for keyboard input handling (US-009).
 * Validates key bindings, pause toggle, phase gating, and event prevention.
 */

describe("setupKeyboard", () => {
  it("should export a setupKeyboard function", () => {
    expect(typeof setupKeyboard).toBe("function");
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
      focus: mock(() => {}),
      getListeners(type: string): Function[] {
        return listeners[type] || [];
      },
    };
  }

  interface MockCanvas {
    addEventListener(type: string, handler: Function): void;
    removeEventListener(type: string, handler: Function): void;
    focus: ReturnType<typeof mock>;
    getListeners(type: string): Function[];
  }

  /**
   * Helper to create a mock KeyboardEvent.
   */
  function createKeydownEvent(key: string): MockKeyboardEvent {
    return {
      key,
      code: `Key${key.toUpperCase()}`,
      preventDefault: mock(() => {}),
      stopPropagation: mock(() => {}),
    };
  }

  interface MockKeyboardEvent {
    key: string;
    code: string;
    preventDefault: ReturnType<typeof mock>;
    stopPropagation: ReturnType<typeof mock>;
  }

  // ── Key bindings for care actions ──────────────────────────────

  describe("key bindings for care actions", () => {
    it("should map '1' to 'tighten-trucks'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      expect(listeners.length).toBeGreaterThan(0);
      listeners[0]!(createKeydownEvent("1"));

      expect(onAction).toHaveBeenCalledWith("tighten-trucks");
    });

    it("should map '2' to 'replace-wheels'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("2"));

      expect(onAction).toHaveBeenCalledWith("replace-wheels");
    });

    it("should map '3' to 'sand-grip-tape'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("3"));

      expect(onAction).toHaveBeenCalledWith("sand-grip-tape");
    });

    it("should map '4' to 'apply-wax'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("4"));

      expect(onAction).toHaveBeenCalledWith("apply-wax");
    });

    it("should NOT map '5' or higher digits to any action", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("5"));
      listeners[0]!(createKeydownEvent("9"));
      listeners[0]!(createKeydownEvent("0"));

      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT map letter keys to actions", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("a"));
      listeners[0]!(createKeydownEvent("z"));

      expect(onAction).not.toHaveBeenCalled();
    });
  });

  // ── Pause toggle ───────────────────────────────────────────────

  describe("pause toggle", () => {
    it("should call onPause when 'p' is pressed", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("p"));

      expect(onPause).toHaveBeenCalledTimes(1);
      expect(onAction).not.toHaveBeenCalled();
    });

    it("should call onPause when 'P' (uppercase) is pressed", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("P"));

      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it("should call onPause when 'Escape' is pressed", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("Escape"));

      expect(onPause).toHaveBeenCalledTimes(1);
      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT call onPause for other letter keys", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("q"));
      listeners[0]!(createKeydownEvent("o"));

      expect(onPause).not.toHaveBeenCalled();
    });
  });

  // ── Phase gating: actions blocked in non-playing phases ────────

  describe("phase gating — actions blocked in non-playing phases", () => {
    it("should NOT process action keys when phase is 'snapped'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "snapped" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("1"));

      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT process action keys when phase is 'new'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "new" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("1"));

      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT process action keys when phase is 'paused'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "paused" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("1"));

      expect(onAction).not.toHaveBeenCalled();
    });

    it("should process action keys when phase is 'playing'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("1"));

      expect(onAction).toHaveBeenCalledWith("tighten-trucks");
    });

    it("should NOT process action keys when phase is 'warning'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "warning" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("2"));

      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT process action keys when phase is 'critical'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "critical" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("3"));

      expect(onAction).not.toHaveBeenCalled();
    });
  });

  // ── Phase gating: pause always allowed ─────────────────────────

  describe("phase gating — pause always allowed", () => {
    it("should allow pause toggle when phase is 'playing'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("p"));

      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it("should allow pause toggle when phase is 'paused' (to unpause)", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "paused" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("p"));

      expect(onPause).toHaveBeenCalledTimes(1);
    });
  });

  // ── Event prevention ───────────────────────────────────────────

  describe("event prevention", () => {
    it("should call preventDefault on all four action keys (1-4)", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["1", "2", "3", "4"]) {
        const event = createKeydownEvent(key);
        listeners[0]!(event);
        expect(event.preventDefault).toHaveBeenCalled();
      }
    });

    it("should call preventDefault on all pause keys (p, P, Escape)", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["p", "P", "Escape"]) {
        const event = createKeydownEvent(key);
        listeners[0]!(event);
        expect(event.preventDefault).toHaveBeenCalled();
      }
    });
  });

  // ── Unbound keys — no side effects ─────────────────────────────

  describe("unbound keys — no side effects", () => {
    it("should NOT trigger onAction for unbound letter keys", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["x", "a", "z", "Enter", "Tab"]) {
        listeners[0]!(createKeydownEvent(key));
      }

      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT trigger onPause for non-pause keys", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["a", "q", "Enter", " ", "ArrowUp"]) {
        listeners[0]!(createKeydownEvent(key));
      }

      expect(onPause).not.toHaveBeenCalled();
    });
  });

  // ── Non-standard and special keys ──────────────────────────────

  describe("non-standard and special keys", () => {
    it("should NOT trigger actions for arrow keys", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
        listeners[0]!(createKeydownEvent(key));
      }
      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT trigger actions for function keys (F1-F12)", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["F1", "F2", "F5", "F12"]) {
        listeners[0]!(createKeydownEvent(key));
      }
      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT trigger actions for modifier keys", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (const key of ["Control", "Shift", "Alt", "Meta", "CapsLock"]) {
        listeners[0]!(createKeydownEvent(key));
      }
      expect(onAction).not.toHaveBeenCalled();
    });

    it("should NOT trigger actions for space or backspace", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent(" "));
      listeners[0]!(createKeydownEvent("Backspace"));
      expect(onAction).not.toHaveBeenCalled();
    });
  });

  // ── Rapid successive key presses ───────────────────────────────

  describe("rapid successive key presses", () => {
    it("should handle all four action keys pressed in sequence", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("1"));
      listeners[0]!(createKeydownEvent("2"));
      listeners[0]!(createKeydownEvent("3"));
      listeners[0]!(createKeydownEvent("4"));

      expect(onAction).toHaveBeenCalledTimes(4);
      expect(onAction).toHaveBeenNthCalledWith(1, "tighten-trucks");
      expect(onAction).toHaveBeenNthCalledWith(2, "replace-wheels");
      expect(onAction).toHaveBeenNthCalledWith(3, "sand-grip-tape");
      expect(onAction).toHaveBeenNthCalledWith(4, "apply-wax");
    });

    it("should handle interleaved action and pause presses", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      listeners[0]!(createKeydownEvent("1"));
      listeners[0]!(createKeydownEvent("p"));
      listeners[0]!(createKeydownEvent("2"));

      expect(onAction).toHaveBeenCalledTimes(2);
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it("should handle same key pressed multiple times", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      for (let i = 0; i < 5; i++) {
        listeners[0]!(createKeydownEvent("1"));
      }

      expect(onAction).toHaveBeenCalledTimes(5);
    });

    it("should handle rapid mixed valid and invalid keys", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      // Mix of valid actions, pause, and invalid keys
      listeners[0]!(createKeydownEvent("1"));     // action
      listeners[0]!(createKeydownEvent("x"));     // ignored
      listeners[0]!(createKeydownEvent("2"));     // action
      listeners[0]!(createKeydownEvent("p"));     // pause
      listeners[0]!(createKeydownEvent("3"));     // action
      listeners[0]!(createKeydownEvent("ArrowUp"));// ignored

      expect(onAction).toHaveBeenCalledTimes(3);
      expect(onPause).toHaveBeenCalledTimes(1);
    });
  });

  // ── Canvas focus ───────────────────────────────────────────────

  describe("canvas focus", () => {
    it("should call canvas.focus() to ensure keyboard events are captured", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      expect(canvas.focus).toHaveBeenCalled();
    });
  });

  // ── Listener registration ──────────────────────────────────────

  describe("keydown listener registration", () => {
    it("should register exactly one keydown event listener on the canvas", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");
      expect(listeners.length).toBe(1);
    });

    it("should NOT register a click listener (only keydown)", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      const getPhase = mock(() => "playing" as GamePhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const clickListeners = canvas.getListeners("click");
      expect(clickListeners.length).toBe(0);
    });
  });

  // ── Dynamic phase changes ──────────────────────────────────────

  describe("dynamic phase changes", () => {
    it("should respect phase changes between key presses via getPhase callback", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      let currentPhase: GamePhase = "playing";
      const getPhase = mock(() => currentPhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");

      // Phase is 'playing' — action should fire
      listeners[0]!(createKeydownEvent("1"));
      expect(onAction).toHaveBeenCalledTimes(1);

      // Change phase to 'paused' — next action should NOT fire
      currentPhase = "paused";
      listeners[0]!(createKeydownEvent("2"));
      expect(onAction).toHaveBeenCalledTimes(1); // still 1, not incremented

      // Change phase back to 'playing' — action should fire again
      currentPhase = "playing";
      listeners[0]!(createKeydownEvent("3"));
      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it("should block all four action keys when phase changes to 'snapped'", () => {
      const canvas = createMockCanvas();
      const onAction = mock(() => {});
      const onPause = mock(() => {});
      let currentPhase: GamePhase = "playing";
      const getPhase = mock(() => currentPhase);

      setupKeyboard(canvas, onAction, onPause, getPhase);

      const listeners = canvas.getListeners("keydown");

      // All actions work in 'playing'
      listeners[0]!(createKeydownEvent("1"));
      listeners[0]!(createKeydownEvent("2"));
      expect(onAction).toHaveBeenCalledTimes(2);

      // Phase changes to 'snapped' — all blocked
      currentPhase = "snapped";
      listeners[0]!(createKeydownEvent("1"));
      listeners[0]!(createKeydownEvent("2"));
      listeners[0]!(createKeydownEvent("3"));
      listeners[0]!(createKeydownEvent("4"));
      expect(onAction).toHaveBeenCalledTimes(2); // no new calls
    });
  });
});
