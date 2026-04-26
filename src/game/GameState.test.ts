/// <reference types="bun" />

import { describe, it, expect } from "bun:test";
import { GameState } from "./GameState";
import type { BoardStats, GamePhase } from "../types/game-types";

/**
 * Tests for the GameState class.
 * Verifies initialization, update behavior, reset functionality, and state management.
 */

describe("GameState", () => {
  describe("constructor / initial state", () => {
    it("should create a new GameState instance", () => {
      const gs = new GameState();
      expect(gs).toBeInstanceOf(GameState);
    });

    it("should initialize all four stats to exactly 100", () => {
      const gs = new GameState();
      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.stats.wheelWear).toBe(100);
      expect(gs.stats.truckTightness).toBe(100);
      expect(gs.stats.gripCondition).toBe(100);
    });

    it("should initialize phase to 'new'", () => {
      const gs = new GameState();
      expect(gs.phase).toBe("new");
    });

    it("should initialize score to 0", () => {
      const gs = new GameState();
      expect(gs.score).toBe(0);
    });

    it("should initialize ticksAlive to 0", () => {
      const gs = new GameState();
      expect(gs.ticksAlive).toBe(0);
    });

    it("should initialize lastTick to current timestamp (not 0 or null)", () => {
      const before = Date.now();
      const gs = new GameState();
      const after = Date.now();
      expect(typeof gs.lastTick).toBe("number");
      expect(gs.lastTick).toBeGreaterThanOrEqual(before);
      expect(gs.lastTick).toBeLessThanOrEqual(after + 100);
    });

    it("should produce independent state for each instance", () => {
      const gs1 = new GameState();
      const gs2 = new GameState();
      gs1.stats.deckIntegrity = 50;
      gs1.score = 999;
      expect(gs2.stats.deckIntegrity).toBe(100); // unaffected
      expect(gs2.score).toBe(0); // unaffected
    });

    it("should not share stats objects between instances", () => {
      const gs1 = new GameState();
      const gs2 = new GameState();
      gs1.stats.wheelWear = 42;
      expect(gs2.stats.wheelWear).toBe(100); // different object
    });
  });

  describe("update(deltaTime)", () => {
    it("should advance ticksAlive by the given deltaTime in milliseconds", () => {
      const gs = new GameState();
      gs.update(16.67);
      expect(gs.ticksAlive).toBeCloseTo(16.67, 2);
    });

    it("should accumulate ticksAlive across multiple sequential updates", () => {
      const gs = new GameState();
      gs.update(100);
      gs.update(200);
      gs.update(50);
      expect(gs.ticksAlive).toBeCloseTo(350, 0);
    });

    it("should return the GameState instance for method chaining", () => {
      const gs = new GameState();
      const result = gs.update(16.67);
      expect(result).toBe(gs); // same reference
    });

    it("should update lastTick to approximately current time after each call", () => {
      const gs = new GameState();
      const before = Date.now();
      gs.update(16.67);
      const after = Date.now();
      expect(gs.lastTick).toBeGreaterThanOrEqual(before - 50);
      expect(gs.lastTick).toBeLessThanOrEqual(after + 100);
    });

    it("should not modify stats during update (degradation is a separate system)", () => {
      const gs = new GameState();
      gs.update(10_000); // even after 10 seconds, stats unchanged by update alone
      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.stats.wheelWear).toBe(100);
      expect(gs.stats.truckTightness).toBe(100);
      expect(gs.stats.gripCondition).toBe(100);
    });

    it("should handle zero deltaTime without error and not advance ticks", () => {
      const gs = new GameState();
      gs.update(0);
      expect(gs.ticksAlive).toBeCloseTo(0, 5);
    });

    it("should handle very large deltaTime (tab-away scenario) without crashing", () => {
      const gs = new GameState();
      expect(() => gs.update(300_000)).not.toThrow(); // 5 minutes
    });

    it("should handle negative deltaTime gracefully without error", () => {
      const gs = new GameState();
      expect(() => gs.update(-10)).not.toThrow();
    });

    it("should handle NaN deltaTime without crashing or corrupting state", () => {
      const gs = new GameState();
      expect(() => gs.update(NaN)).not.toThrow();
    });

    it("should handle Infinity deltaTime without crashing", () => {
      const gs = new GameState();
      expect(() => gs.update(Infinity)).not.toThrow();
    });

    it("should survive 10,000 rapid updates without performance issues or state corruption", () => {
      const gs = new GameState();
      for (let i = 0; i < 10_000; i++) {
        gs.update(16.67);
      }
      expect(gs.ticksAlive).toBeGreaterThan(150_000);
      // Stats should still be pristine since update doesn't degrade
      expect(gs.stats.deckIntegrity).toBe(100);
    });

    it("should correctly accumulate fractional deltaTime values", () => {
      const gs = new GameState();
      // Simulate 60fps: 1000 frames at ~16.67ms each ≈ 16670ms total
      for (let i = 0; i < 1000; i++) {
        gs.update(16.67);
      }
      expect(gs.ticksAlive).toBeCloseTo(16_670, 1);
    });

    it("should not change phase during update (phase changes are external)", () => {
      const gs = new GameState();
      const initialPhase = gs.phase;
      gs.update(5000);
      expect(gs.phase).toBe(initialPhase); // still initial phase
    });

    it("should not change score during update", () => {
      const gs = new GameState();
      gs.update(5000);
      expect(gs.score).toBe(0);
    });
  });

  describe("reset()", () => {
    it("should restore all four stats to exactly 100", () => {
      const gs = new GameState();
      gs.stats.deckIntegrity = 25;
      gs.stats.wheelWear = 10;
      gs.stats.truckTightness = 80;
      gs.stats.gripCondition = 0;
      gs.reset();
      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.stats.wheelWear).toBe(100);
      expect(gs.stats.truckTightness).toBe(100);
      expect(gs.stats.gripCondition).toBe(100);
    });

    it("should reset phase to 'new' regardless of current phase", () => {
      const phases: GamePhase[] = [
        "playing",
        "warning",
        "critical",
        "snapped",
        "paused",
      ];
      for (const phase of phases) {
        const gs = new GameState();
        gs.phase = phase;
        gs.reset();
        expect(gs.phase).toBe("new");
      }
    });

    it("should reset score to 0 regardless of current value", () => {
      const gs = new GameState();
      gs.score = 9999;
      gs.reset();
      expect(gs.score).toBe(0);
    });

    it("should reset ticksAlive to 0 regardless of elapsed time", () => {
      const gs = new GameState();
      gs.ticksAlive = 1_000_000; // ~16.7 minutes
      gs.reset();
      expect(gs.ticksAlive).toBe(0);
    });

    it("should update lastTick to current time on reset", () => {
      const gs = new GameState();
      gs.lastTick = 1; // artificially old timestamp
      gs.reset();
      expect(gs.lastTick).toBeGreaterThan(1_000_000_000); // should be ~now
    });

    it("should return the GameState instance for method chaining", () => {
      const gs = new GameState();
      const result = gs.reset();
      expect(result).toBe(gs);
    });

    it("should be idempotent — calling reset multiple times has same effect", () => {
      const gs = new GameState();
      gs.stats.deckIntegrity = 50;
      gs.reset();
      gs.reset();
      gs.reset();
      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.phase).toBe("new");
      expect(gs.score).toBe(0);
      expect(gs.ticksAlive).toBe(0);
    });

    it("should allow update to work correctly after reset", () => {
      const gs = new GameState();
      gs.update(500);
      gs.reset();
      gs.update(100);
      expect(gs.ticksAlive).toBeCloseTo(100, 0); // not cumulative with pre-reset
    });

    it("should restore a fully degraded board to pristine condition", () => {
      const gs = new GameState();
      // Simulate complete degradation
      gs.stats.deckIntegrity = 0;
      gs.stats.wheelWear = 0;
      gs.stats.truckTightness = 0;
      gs.stats.gripCondition = 0;
      gs.phase = "snapped";
      gs.score = 42;
      gs.ticksAlive = 60_000;

      gs.reset();

      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.stats.wheelWear).toBe(100);
      expect(gs.stats.truckTightness).toBe(100);
      expect(gs.stats.gripCondition).toBe(100);
      expect(gs.phase as string).toBe("new");
      expect(gs.score).toBe(0);
      expect(gs.ticksAlive).toBe(0);
    });

    it("should reset a partially degraded board", () => {
      const gs = new GameState();
      gs.stats.wheelWear = 75; // only one stat degraded
      gs.phase = "warning";
      gs.score = 30;
      gs.reset();
      expect(gs.stats.wheelWear).toBe(100);
      expect(gs.stats.deckIntegrity).toBe(100); // was already fine, still fine
    });
  });

  describe("state encapsulation and mutation", () => {
    it("should expose stats as a mutable BoardStats object", () => {
      const gs = new GameState();
      expect(typeof gs.stats).toBe("object");
      gs.stats.wheelWear = 85;
      expect(gs.stats.wheelWear).toBe(85);
    });

    it("should expose phase as a mutable GamePhase string", () => {
      const gs = new GameState();
      gs.phase = "playing";
      expect(gs.phase).toBe("playing");
      gs.phase = "warning";
      expect(gs.phase).toBe("warning");
    });

    it("should expose score as a mutable number", () => {
      const gs = new GameState();
      gs.score = 10;
      expect(gs.score).toBe(10);
      gs.score += 20;
      expect(gs.score).toBe(30);
    });

    it("should expose ticksAlive as a mutable number", () => {
      const gs = new GameState();
      gs.ticksAlive = 500;
      expect(gs.ticksAlive).toBe(500);
    });

    it("should expose lastTick as a mutable number", () => {
      const gs = new GameState();
      gs.lastTick = 1234567890;
      expect(gs.lastTick).toBe(1234567890);
    });

    it("should maintain correct state shape after multiple mutations", () => {
      const gs = new GameState();
      gs.phase = "playing";
      gs.score = 50;
      gs.ticksAlive = 30_000;
      gs.stats.deckIntegrity = 80;
      gs.stats.wheelWear = 60;

      expect(typeof gs.stats).toBe("object");
      expect(typeof gs.phase).toBe("string");
      expect(typeof gs.score).toBe("number");
      expect(typeof gs.ticksAlive).toBe("number");
      expect(typeof gs.lastTick).toBe("number");
    });
  });

  describe("integration scenarios", () => {
    it("should support a typical game session flow: init -> play -> degrade -> reset", () => {
      const gs = new GameState();
      // Initial state
      expect(gs.phase).toBe("new");
      expect(gs.stats.deckIntegrity).toBe(100);

      // Transition to playing
      gs.phase = "playing";

      // Simulate some gameplay ticks
      gs.update(1000);
      gs.update(2000);
      expect(gs.ticksAlive).toBeCloseTo(3000, 0);

      // Simulate degradation (external system modifies stats)
      gs.stats.deckIntegrity = 70;
      gs.stats.wheelWear = 55;
      gs.score += 10;

      // Transition to warning
      const warningPhase: import("../types/game-types").GamePhase = "warning";
      gs.phase = warningPhase;

      // Continue playing
      gs.update(1000);
      expect(gs.ticksAlive).toBeCloseTo(4000, 0);

      // Reset for new game
      gs.reset();
      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.phase as string).toBe("new");
      expect(gs.score).toBe(0);
      expect(gs.ticksAlive).toBe(0);
    });

    it("should handle rapid play-reset-play cycles", () => {
      const gs = new GameState();
      for (let i = 0; i < 100; i++) {
        gs.update(100);
        gs.score += 5;
        gs.reset();
      }
      expect(gs.stats.deckIntegrity).toBe(100);
      expect(gs.phase).toBe("new");
      expect(gs.score).toBe(0);
    });

    it("should maintain type safety — stats object always has all four fields", () => {
      const gs = new GameState();
      // After any number of updates, all four stat fields should exist
      for (let i = 0; i < 50; i++) {
        gs.update(16.67);
      }
      expect(gs.stats).toHaveProperty("deckIntegrity");
      expect(gs.stats).toHaveProperty("wheelWear");
      expect(gs.stats).toHaveProperty("truckTightness");
      expect(gs.stats).toHaveProperty("gripCondition");
    });
  });

  describe("edge cases", () => {
    it("should handle update immediately after construction", () => {
      const gs = new GameState();
      expect(() => gs.update(16.67)).not.toThrow();
    });

    it("should handle reset immediately after construction (no-op scenario)", () => {
      const gs = new GameState();
      expect(() => gs.reset()).not.toThrow();
      expect(gs.stats.deckIntegrity).toBe(100); // still 100
    });

    it("should handle update with floating-point deltaTime", () => {
      const gs = new GameState();
      gs.update(16.666666666666668);
      expect(typeof gs.ticksAlive).toBe("number");
      expect(gs.ticksAlive).toBeGreaterThan(0);
    });

    it("should not allow stats to become undefined after update", () => {
      const gs = new GameState();
      gs.update(1000);
      expect(gs.stats.deckIntegrity).toBeDefined();
      expect(gs.stats.wheelWear).toBeDefined();
      expect(gs.stats.truckTightness).toBeDefined();
      expect(gs.stats.gripCondition).toBeDefined();
    });

    it("should have all stats as finite numbers after any operation", () => {
      const gs = new GameState();
      gs.update(100);
      gs.reset();
      gs.update(50);
      expect(Number.isFinite(gs.stats.deckIntegrity)).toBe(true);
      expect(Number.isFinite(gs.stats.wheelWear)).toBe(true);
      expect(Number.isFinite(gs.stats.truckTightness)).toBe(true);
      expect(Number.isFinite(gs.stats.gripCondition)).toBe(true);
    });
  });
});
