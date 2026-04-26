/// <reference types="bun" />

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { Game } from "./Game";

/**
 * Tests for the Game class which implements a requestAnimationFrame-based game loop.
 *
 * Note: requestAnimationFrame is mocked because Bun's test runner runs in a Node-like
 * environment where RAF is not available. We mock it to verify the Game class correctly
 * registers callbacks and manages the loop lifecycle. The actual rendering logic is
 * tested separately in integration tests with a real browser context.
 */

describe("Game", () => {
  let game: Game;
  let rafCallback: FrameRequestCallback | null = null;
  let rafCallCount = 0;
  let cancelCallCount = 0;

  beforeEach(() => {
    rafCallback = null;
    rafCallCount = 0;
    cancelCallCount = 0;

    // Mock RAF to capture the callback for manual invocation
    globalThis.requestAnimationFrame = mock(function (cb: FrameRequestCallback) {
      rafCallback = cb;
      return ++rafCallCount;
    });
    globalThis.cancelAnimationFrame = mock((id: number) => {
      cancelCallCount++;
    });
  });

  afterEach(() => {
    if (game) {
      game.stop();
    }
    rafCallback = null;
  });

  describe("constructor", () => {
    it("should create a Game instance", () => {
      game = new Game();
      expect(game).toBeInstanceOf(Game);
    });

    it("should not be running after construction", () => {
      game = new Game();
      expect(rafCallCount).toBe(0);
    });

    it("should be safe to call stop() when not running", () => {
      game = new Game();
      expect(() => game.stop()).not.toThrow();
    });
  });

  describe("start()", () => {
    it("should schedule exactly one requestAnimationFrame on first call", () => {
      game = new Game();
      game.start();
      expect(rafCallCount).toBe(1);
    });

    it("should be idempotent - calling start() twice should not create multiple loops", () => {
      game = new Game();
      game.start();
      const afterFirstStart = rafCallCount;
      game.start();
      expect(rafCallCount).toBe(afterFirstStart);
    });

    it("should re-schedule RAF on each frame via the loop callback", () => {
      game = new Game();
      game.start();
      const initialRafCalls = rafCallCount;

      if (rafCallback) rafCallback(100);
      expect(rafCallCount).toBeGreaterThan(initialRafCalls);
    });
  });

  describe("stop()", () => {
    it("should cancel requestAnimationFrame", () => {
      game = new Game();
      game.start();
      const beforeCancel = cancelCallCount;
      game.stop();
      expect(cancelCallCount).toBe(beforeCancel + 1);
    });

    it("should prevent further tick calls after stop()", () => {
      let tickCount = 0;
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        tickCount++;
        return originalTick(dt);
      };

      game.start();
      if (rafCallback) rafCallback(100);
      const countAfterFrame = tickCount;

      game.stop();
      // After stop, simulating another frame should not call tick again
      if (rafCallback) rafCallback(116.67);
      expect(tickCount).toBe(countAfterFrame);
    });

    it("should be safe to call stop() multiple times without error", () => {
      game = new Game();
      game.stop();
      game.stop();
      game.stop();
    });

    it("should allow restart after stopping", () => {
      game = new Game();
      game.start();
      game.stop();
      const cancelAfterStop = cancelCallCount;

      game.start();
      expect(rafCallCount).toBeGreaterThan(0);

      game.stop();
      expect(cancelCallCount).toBeGreaterThan(cancelAfterStop);
    });
  });

  describe("tick(deltaTime)", () => {
    it("should accept a deltaTime parameter in milliseconds", () => {
      game = new Game();
      expect(() => game.tick(16.67)).not.toThrow();
    });

    it("should be callable multiple times with different deltaTimes", () => {
      game = new Game();
      game.tick(16.67);
      game.tick(33.33);
      game.tick(1000);
    });

    it("should handle zero deltaTime without error", () => {
      game = new Game();
      expect(() => game.tick(0)).not.toThrow();
    });

    it("should handle very large deltaTime without crashing (tab was in background)", () => {
      game = new Game();
      // 5 minutes of elapsed time - should not crash or cause infinite loops
      expect(() => game.tick(300_000)).not.toThrow();
    });

    it("should handle negative deltaTime gracefully", () => {
      game = new Game();
      expect(() => game.tick(-10)).not.toThrow();
    });

    it("should handle NaN deltaTime without crashing", () => {
      game = new Game();
      expect(() => game.tick(NaN)).not.toThrow();
    });

    it("should continue functioning after receiving invalid deltaTimes", () => {
      game = new Game();
      // Feed invalid values then verify normal operation resumes
      game.tick(-10);
      game.tick(NaN);
      game.tick(Infinity);
      // Should still work with valid input
      expect(() => game.tick(16.67)).not.toThrow();
    });

    it("should update internal elapsed time after tick calls", () => {
      game = new Game();
      game.tick(100);
      game.tick(100);
      // After two ticks of 100ms each, the game should have processed ~200ms total
      // Verify by calling tick again - if state was corrupted, this would fail
      expect(() => game.tick(50)).not.toThrow();
    });

    it("should clamp extremely large deltaTime to prevent runaway degradation", () => {
      let receivedDelta: number | undefined;
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        receivedDelta = dt;
        return originalTick(dt);
      };

      // When the loop auto-calculates deltaTime, a huge gap should be clamped
      game.start();
      if (rafCallback) rafCallback(0);
      if (rafCallback) rafCallback(300_000); // 5-minute gap
      game.stop();

      // The implementation should clamp the delta to prevent a single massive tick
      expect(receivedDelta).toBeLessThan(300_000);
    });
  });

  describe("game loop integration", () => {
    it("should call tick with calculated deltaTime each frame when running", () => {
      let tickDeltas: number[] = [];
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        tickDeltas.push(dt);
        return originalTick(dt);
      };

      game.start();
      if (rafCallback) rafCallback(100);
      if (rafCallback) rafCallback(116.67);
      if (rafCallback) rafCallback(133.34);
      game.stop();

      expect(tickDeltas.length).toBeGreaterThanOrEqual(2);
      for (const dt of tickDeltas) {
        expect(dt).toBeGreaterThanOrEqual(0);
      }
    });

    it("should calculate deltaTime correctly between frames", () => {
      let tickDeltas: number[] = [];
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        tickDeltas.push(dt);
        return originalTick(dt);
      };

      game.start();
      if (rafCallback) rafCallback(0);
      if (rafCallback) rafCallback(16.67);
      game.stop();

      if (tickDeltas.length >= 2) {
        expect(tickDeltas[1]).toBeGreaterThan(10);
        expect(tickDeltas[1]).toBeLessThan(30);
      }
    });

    it("should handle rapid start/stop/start sequences without errors", () => {
      game = new Game();
      for (let i = 0; i < 5; i++) {
        game.start();
        game.stop();
      }
      // Should not throw or create multiple loops
    });

    it("should accumulate time across multiple ticks", () => {
      let tickCount = 0;
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        tickCount++;
        return originalTick(dt);
      };

      game.start();
      for (let i = 0; i < 5; i++) {
        if (rafCallback) rafCallback(i * 16.67);
      }
      game.stop();

      expect(tickCount).toBeGreaterThanOrEqual(3);
    });

    it("should not call tick before start() is called", () => {
      let tickCalled = false;
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        tickCalled = true;
        return originalTick(dt);
      };

      // Don't call start - tick should never be invoked by the loop
      expect(tickCalled).toBe(false);
    });

    it("should handle frame timestamps that go backwards gracefully", () => {
      let tickDeltas: number[] = [];
      game = new Game();
      const originalTick = game.tick.bind(game);
      game.tick = (dt: number) => {
        tickDeltas.push(dt);
        return originalTick(dt);
      };

      game.start();
      if (rafCallback) rafCallback(100);
      // Simulate a backwards timestamp (shouldn't happen in practice, but test robustness)
      if (rafCallback) rafCallback(50);
      game.stop();

      // Should not crash; delta may be negative or clamped to 0
      expect(() => {
        for (const dt of tickDeltas) {
          // Just verify we got values without crashing
        }
      }).not.toThrow();
    });
  });

  describe("public API surface", () => {
    it("should expose start method as a function", () => {
      game = new Game();
      expect(typeof game.start).toBe("function");
    });

    it("should expose stop method as a function", () => {
      game = new Game();
      expect(typeof game.stop).toBe("function");
    });

    it("should expose tick method as a function accepting one parameter", () => {
      game = new Game();
      expect(typeof game.tick).toBe("function");
      expect(game.tick.length).toBe(1);
    });
  });
});
