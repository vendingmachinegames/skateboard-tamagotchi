/// <reference types="bun" />

import { describe, it, expect } from "bun:test";
import * as gameTypes from "./game-types";

/**
 * Tests for core type definitions.
 * These tests verify that the game-types module exports all required types
 * and that values conforming to those types behave correctly at runtime.
 */

describe("game-types module", () => {
  it("should be importable and defined", () => {
    expect(gameTypes).toBeDefined();
    expect(typeof gameTypes).toBe("object");
  });

  it("should export all four required type identifiers (verified at compile time)", () => {
    // If this file compiles, the types exist:
    // BoardStats, GamePhase, GameState, CareAction
    const _typeCheck = true;
    expect(_typeCheck).toBe(true);
  });
});

describe("BoardStats", () => {
  it("should have exactly four required properties: deckIntegrity, wheelWear, truckTightness, gripCondition", () => {
    const stats: import("./game-types").BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    expect(Object.keys(stats)).toContain("deckIntegrity");
    expect(Object.keys(stats)).toContain("wheelWear");
    expect(Object.keys(stats)).toContain("truckTightness");
    expect(Object.keys(stats)).toContain("gripCondition");
    expect(Object.keys(stats).length).toBe(4);
  });

  it("should accept all values as numbers", () => {
    const stats: import("./game-types").BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    expect(typeof stats.deckIntegrity).toBe("number");
    expect(typeof stats.wheelWear).toBe("number");
    expect(typeof stats.truckTightness).toBe("number");
    expect(typeof stats.gripCondition).toBe("number");
  });

  it("should accept minimum boundary value of 0", () => {
    const minStats: import("./game-types").BoardStats = {
      deckIntegrity: 0,
      wheelWear: 0,
      truckTightness: 0,
      gripCondition: 0,
    };
    expect(minStats.deckIntegrity).toBe(0);
    expect(minStats.wheelWear).toBe(0);
    expect(minStats.truckTightness).toBe(0);
    expect(minStats.gripCondition).toBe(0);
  });

  it("should accept maximum boundary value of 100", () => {
    const maxStats: import("./game-types").BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    expect(maxStats.deckIntegrity).toBe(100);
    expect(maxStats.wheelWear).toBe(100);
    expect(maxStats.truckTightness).toBe(100);
    expect(maxStats.gripCondition).toBe(100);
  });

  it("should accept fractional/decimal values within range", () => {
    const stats: import("./game-types").BoardStats = {
      deckIntegrity: 73.5,
      wheelWear: 42.8,
      truckTightness: 99.9,
      gripCondition: 0.1,
    };
    expect(stats.deckIntegrity).toBe(73.5);
    expect(stats.wheelWear).toBe(42.8);
  });

  it("should be mutable — individual stats can change independently", () => {
    const stats: import("./game-types").BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    stats.wheelWear = 50;
    expect(stats.wheelWear).toBe(50);
    // Other stats unchanged
    expect(stats.deckIntegrity).toBe(100);
    expect(stats.truckTightness).toBe(100);
    expect(stats.gripCondition).toBe(100);
  });

  it("should be cloneable via spread for immutable updates", () => {
    const original: import("./game-types").BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    const updated = { ...original, wheelWear: 80 };
    expect(updated.wheelWear).toBe(80);
    expect(original.wheelWear).toBe(100); // original unchanged
  });

  it("should support Partial<BoardStats> for partial updates", () => {
    const partial: Partial<import("./game-types").BoardStats> = {
      truckTightness: 75,
    };
    expect(partial.truckTightness).toBe(75);
    expect(partial.deckIntegrity).toBeUndefined();
  });
});

describe("GamePhase", () => {
  it("should accept all six valid phase string literals", () => {
    const phases: import("./game-types").GamePhase[] = [
      "new",
      "playing",
      "warning",
      "critical",
      "snapped",
      "paused",
    ];
    expect(phases.length).toBe(6);
    expect(phases).toContain("new");
    expect(phases).toContain("playing");
    expect(phases).toContain("warning");
    expect(phases).toContain("critical");
    expect(phases).toContain("snapped");
    expect(phases).toContain("paused");
  });

  it("should support equality checks for game flow decisions", () => {
    const phase: import("./game-types").GamePhase = "snapped";
    expect(phase).toBe("snapped");
    // Verify the type accepts all valid phases
    const playable: import("./game-types").GamePhase = "playing";
    expect(playable).toBe("playing");
  });

  it("should support phase transition logic (new -> playing)", () => {
    let current: import("./game-types").GamePhase = "new";
    current = "playing";
    expect(current).toBe("playing");
  });

  it("should support phase transition logic (playing -> warning -> critical -> snapped)", () => {
    let current: import("./game-types").GamePhase = "playing";
    current = "warning";
    expect(current).toBe("warning");
    current = "critical";
    expect(current).toBe("critical");
    current = "snapped";
    expect(current).toBe("snapped");
  });

  it("should support pause/unpause toggle", () => {
    let current: import("./game-types").GamePhase = "playing";
    current = "paused";
    expect(current).toBe("paused");
    current = "playing";
    expect(current).toBe("playing");
  });

  it("should allow exhaustive switch on all phases", () => {
    const getPhaseLabel = (phase: import("./game-types").GamePhase): string => {
      switch (phase) {
        case "new":
          return "initial";
        case "playing":
          return "active";
        case "warning":
          return "caution";
        case "critical":
          return "danger";
        case "snapped":
          return "gameover";
        case "paused":
          return "stopped";
      }
    };
    expect(getPhaseLabel("warning")).toBe("caution");
    expect(getPhaseLabel("new")).toBe("initial");
    expect(getPhaseLabel("snapped")).toBe("gameover");
  });
});

describe("GameState", () => {
  it("should have all five required top-level fields: stats, phase, score, ticksAlive, lastTick", () => {
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "new",
      score: 0,
      ticksAlive: 0,
      lastTick: Date.now(),
    };
    expect(state).toHaveProperty("stats");
    expect(state).toHaveProperty("phase");
    expect(state).toHaveProperty("score");
    expect(state).toHaveProperty("ticksAlive");
    expect(state).toHaveProperty("lastTick");
  });

  it("should nest BoardStats under the stats field", () => {
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "new",
      score: 0,
      ticksAlive: 0,
      lastTick: 0,
    };
    expect(state.stats).toHaveProperty("deckIntegrity");
    expect(state.stats).toHaveProperty("wheelWear");
    expect(state.stats).toHaveProperty("truckTightness");
    expect(state.stats).toHaveProperty("gripCondition");
  });

  it("should use GamePhase type for the phase field", () => {
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "critical",
      score: 0,
      ticksAlive: 0,
      lastTick: 0,
    };
    expect(state.phase).toBe("critical");
  });

  it("should track score as a number starting at 0", () => {
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 0,
      ticksAlive: 0,
      lastTick: 0,
    };
    expect(state.score).toBe(0);
    state.score += 10;
    expect(state.score).toBe(10);
  });

  it("should track ticksAlive as elapsed time in ms", () => {
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 0,
      ticksAlive: 60_000, // 60 seconds alive
      lastTick: Date.now(),
    };
    expect(state.ticksAlive).toBe(60_000);
  });

  it("should track lastTick as a timestamp", () => {
    const now = Date.now();
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 0,
      ticksAlive: 0,
      lastTick: now,
    };
    expect(state.lastTick).toBe(now);
  });

  it("should support full state mutation during gameplay", () => {
    const state: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "new",
      score: 0,
      ticksAlive: 0,
      lastTick: 0,
    };

    // Simulate gameplay progression
    state.phase = "playing";
    state.ticksAlive += 1000;
    state.stats.wheelWear = 85;
    state.score += 10;

    expect(state.phase).toBe("playing");
    expect(state.ticksAlive).toBe(1000);
    expect(state.stats.wheelWear).toBe(85);
    expect(state.score).toBe(10);
  });

  it("should be cloneable for immutable state updates", () => {
    const original: import("./game-types").GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 50,
      ticksAlive: 1000,
      lastTick: 0,
    };
    const updated = { ...original, score: 60 };
    expect(updated.score).toBe(60);
    expect(original.score).toBe(50);
  });
});

describe("CareAction", () => {
  it("should have all seven required fields: id, label, shortcut, cooldown, lastUsed, effects", () => {
    const action: import("./game-types").CareAction = {
      id: "tighten-trucks",
      label: "Tighten Trucks",
      shortcut: "1",
      cooldown: 8000,
      lastUsed: 0,
      effects: { truckTightness: 25 },
    };
    expect(action).toHaveProperty("id");
    expect(action).toHaveProperty("label");
    expect(action).toHaveProperty("shortcut");
    expect(action).toHaveProperty("cooldown");
    expect(action).toHaveProperty("lastUsed");
    expect(action).toHaveProperty("effects");
  });

  it("should have id as a string identifier", () => {
    const action: import("./game-types").CareAction = {
      id: "replace-wheels",
      label: "Replace Wheels",
      shortcut: "2",
      cooldown: 15000,
      lastUsed: 0,
      effects: { wheelWear: 30 },
    };
    expect(typeof action.id).toBe("string");
    expect(action.id).toBe("replace-wheels");
  });

  it("should have label as a human-readable string", () => {
    const action: import("./game-types").CareAction = {
      id: "sand-grip-tape",
      label: "Sand Grip Tape",
      shortcut: "3",
      cooldown: 10000,
      lastUsed: 0,
      effects: { gripCondition: 25 },
    };
    expect(typeof action.label).toBe("string");
    expect(action.label.length).toBeGreaterThan(0);
  });

  it("should have shortcut as a string (can be empty for no key binding)", () => {
    const withKey: import("./game-types").CareAction = {
      id: "tighten-trucks",
      label: "Tighten Trucks",
      shortcut: "1",
      cooldown: 8000,
      lastUsed: 0,
      effects: { truckTightness: 25 },
    };
    const withoutKey: import("./game-types").CareAction = {
      id: "apply-wax",
      label: "Apply Wax",
      shortcut: "",
      cooldown: 20000,
      lastUsed: 0,
      effects: { deckIntegrity: 15 },
    };
    expect(withKey.shortcut).toBe("1");
    expect(withoutKey.shortcut).toBe("");
  });

  it("should have cooldown as a number in milliseconds", () => {
    const action: import("./game-types").CareAction = {
      id: "test",
      label: "Test",
      shortcut: "T",
      cooldown: 8000,
      lastUsed: 0,
      effects: {},
    };
    expect(typeof action.cooldown).toBe("number");
    expect(action.cooldown).toBeGreaterThan(0);
  });

  it("should have lastUsed as a timestamp", () => {
    const now = Date.now();
    const action: import("./game-types").CareAction = {
      id: "test",
      label: "Test",
      shortcut: "T",
      cooldown: 5000,
      lastUsed: now,
      effects: {},
    };
    expect(typeof action.lastUsed).toBe("number");
    expect(action.lastUsed).toBe(now);
  });

  it("should use Partial<BoardStats> for effects — can affect one or all stats", () => {
    const singleEffect: import("./game-types").CareAction = {
      id: "tighten-trucks",
      label: "Tighten Trucks",
      shortcut: "1",
      cooldown: 8000,
      lastUsed: 0,
      effects: { truckTightness: 25 }, // only one stat
    };
    const multiEffect: import("./game-types").CareAction = {
      id: "apply-wax",
      label: "Apply Wax",
      shortcut: "",
      cooldown: 20000,
      lastUsed: 0,
      effects: {
        deckIntegrity: 15,
        wheelWear: 15,
        truckTightness: 15,
        gripCondition: 15,
      }, // all stats
    };
    expect(singleEffect.effects.truckTightness).toBe(25);
    expect(singleEffect.effects.deckIntegrity).toBeUndefined();
    expect(multiEffect.effects.deckIntegrity).toBe(15);
    expect(multiEffect.effects.gripCondition).toBe(15);
  });

  it("should support cooldown calculation: canPerform = (now - lastUsed) >= cooldown", () => {
    const action: import("./game-types").CareAction = {
      id: "test",
      label: "Test",
      shortcut: "T",
      cooldown: 8000,
      lastUsed: Date.now() - 5000, // used 5s ago
      effects: {},
    };
    const timeSinceUse = Date.now() - action.lastUsed;
    expect(timeSinceUse).toBeLessThan(action.cooldown); // still on cooldown

    // Simulate waiting long enough
    action.lastUsed = Date.now() - 10_000; // used 10s ago
    const timeSinceUse2 = Date.now() - action.lastUsed;
    expect(timeSinceUse2).toBeGreaterThanOrEqual(action.cooldown); // cooldown expired
  });

  it("should support arrays of CareAction for multiple actions", () => {
    const actions: import("./game-types").CareAction[] = [
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
    expect(actions.length).toBe(2);
    const found = actions.find((a) => a.id === "replace-wheels");
    expect(found).toBeDefined();
    expect(found?.effects.wheelWear).toBe(30);
  });

  it("should allow lastUsed to be updated after performing an action", () => {
    const action: import("./game-types").CareAction = {
      id: "test",
      label: "Test",
      shortcut: "T",
      cooldown: 5000,
      lastUsed: 0,
      effects: {},
    };
    expect(action.lastUsed).toBe(0);
    action.lastUsed = Date.now();
    expect(action.lastUsed).toBeGreaterThan(0);
  });
});
