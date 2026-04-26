/// <reference types="bun" />

import { describe, it, expect } from "bun:test";
import type { BoardStats, GameState, CareAction } from "../types/game-types";

// These imports will fail until implementation exists (RED phase)
import { CARE_ACTIONS, canPerformAction, performAction } from "./care-actions";

/**
 * Tests for the care action system (US-005).
 * Validates that care actions restore stats with cooldowns,
 * and that performAction is a pure function returning new state.
 */

describe("CARE_ACTIONS", () => {
  it("should export CARE_ACTIONS as an array", () => {
    expect(Array.isArray(CARE_ACTIONS)).toBe(true);
  });

  it("should have exactly 4 care actions", () => {
    expect(CARE_ACTIONS).toHaveLength(4);
  });

  it("should contain 'tighten-trucks' action", () => {
    const action = CARE_ACTIONS.find((a) => a.id === "tighten-trucks");
    expect(action).toBeDefined();
  });

  it("should contain 'replace-wheels' action", () => {
    const action = CARE_ACTIONS.find((a) => a.id === "replace-wheels");
    expect(action).toBeDefined();
  });

  it("should contain 'sand-grip-tape' action", () => {
    const action = CARE_ACTIONS.find((a) => a.id === "sand-grip-tape");
    expect(action).toBeDefined();
  });

  it("should contain 'apply-wax' action", () => {
    const action = CARE_ACTIONS.find((a) => a.id === "apply-wax");
    expect(action).toBeDefined();
  });

  describe("action properties", () => {
    it("tighten-trucks should have correct effects (+25 truckTightness)", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "tighten-trucks")!;
      expect(action.effects.truckTightness).toBe(25);
      // Should not affect other stats
      expect(action.effects.deckIntegrity).toBeUndefined();
      expect(action.effects.wheelWear).toBeUndefined();
      expect(action.effects.gripCondition).toBeUndefined();
    });

    it("replace-wheels should have correct effects (+30 wheelWear)", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "replace-wheels")!;
      expect(action.effects.wheelWear).toBe(30);
      // Should not affect other stats
      expect(action.effects.deckIntegrity).toBeUndefined();
      expect(action.effects.truckTightness).toBeUndefined();
      expect(action.effects.gripCondition).toBeUndefined();
    });

    it("sand-grip-tape should have correct effects (+25 gripCondition)", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "sand-grip-tape")!;
      expect(action.effects.gripCondition).toBe(25);
      // Should not affect other stats
      expect(action.effects.deckIntegrity).toBeUndefined();
      expect(action.effects.wheelWear).toBeUndefined();
      expect(action.effects.truckTightness).toBeUndefined();
    });

    it("apply-wax should have correct effects (+15 all stats)", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "apply-wax")!;
      expect(action.effects.deckIntegrity).toBe(15);
      expect(action.effects.wheelWear).toBe(15);
      expect(action.effects.truckTightness).toBe(15);
      expect(action.effects.gripCondition).toBe(15);
    });

    it("tighten-trucks should have 8s cooldown", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "tighten-trucks")!;
      expect(action.cooldown).toBe(8000);
    });

    it("replace-wheels should have 15s cooldown", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "replace-wheels")!;
      expect(action.cooldown).toBe(15000);
    });

    it("sand-grip-tape should have 10s cooldown", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "sand-grip-tape")!;
      expect(action.cooldown).toBe(10000);
    });

    it("apply-wax should have 20s cooldown", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "apply-wax")!;
      expect(action.cooldown).toBe(20000);
    });

    it("tighten-trucks should have shortcut key '1'", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "tighten-trucks")!;
      expect(action.shortcut).toBe("1");
    });

    it("replace-wheels should have shortcut key '2'", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "replace-wheels")!;
      expect(action.shortcut).toBe("2");
    });

    it("sand-grip-tape should have shortcut key '3'", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "sand-grip-tape")!;
      expect(action.shortcut).toBe("3");
    });

    it("apply-wax should have no shortcut key (empty string)", () => {
      const action = CARE_ACTIONS.find((a) => a.id === "apply-wax")!;
      expect(action.shortcut).toBe("");
    });

    it("all actions should have human-readable labels", () => {
      for (const action of CARE_ACTIONS) {
        expect(action.label).toBeDefined();
        expect(typeof action.label).toBe("string");
        expect(action.label.length).toBeGreaterThan(0);
      }
    });

    it("all actions should have lastUsed initialized to 0", () => {
      for (const action of CARE_ACTIONS) {
        expect(action.lastUsed).toBe(0);
      }
    });
  });
});

describe("canPerformAction", () => {
  it("should export a canPerformAction function", () => {
    expect(typeof canPerformAction).toBe("function");
  });

  it("should return true for an action that has never been used (lastUsed = 0)", () => {
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
    expect(canPerformAction("tighten-trucks", actions, Date.now())).toBe(true);
  });

  it("should return false when action is on cooldown", () => {
    const now = Date.now();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 5000, // Used 5 seconds ago, cooldown is 8s
        effects: { truckTightness: 25 },
      },
    ];
    expect(canPerformAction("tighten-trucks", actions, now)).toBe(false);
  });

  it("should return true when cooldown has expired", () => {
    const now = Date.now();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 9000, // Used 9 seconds ago, cooldown is 8s
        effects: { truckTightness: 25 },
      },
    ];
    expect(canPerformAction("tighten-trucks", actions, now)).toBe(true);
  });

  it("should return true when cooldown has just expired (exactly at boundary)", () => {
    const now = Date.now();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 8000, // Used exactly 8 seconds ago
        effects: { truckTightness: 25 },
      },
    ];
    expect(canPerformAction("tighten-trucks", actions, now)).toBe(true);
  });

  it("should return false when cooldown has not quite expired (1ms short)", () => {
    const now = Date.now();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 7999, // Used 7999ms ago, cooldown is 8000ms
        effects: { truckTightness: 25 },
      },
    ];
    expect(canPerformAction("tighten-trucks", actions, now)).toBe(false);
  });

  it("should return false for unknown action ID", () => {
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
    expect(canPerformAction("unknown-action", actions, Date.now())).toBe(false);
  });

  it("should return false for empty actions array", () => {
    expect(canPerformAction("tighten-trucks", [], Date.now())).toBe(false);
  });

  it("should handle different cooldowns for different actions", () => {
    const now = Date.now();
    const actions: CareAction[] = [
      {
        id: "tighten-trucks",
        label: "Tighten Trucks",
        shortcut: "1",
        cooldown: 8000,
        lastUsed: now - 5000, // On cooldown (8s)
        effects: { truckTightness: 25 },
      },
      {
        id: "replace-wheels",
        label: "Replace Wheels",
        shortcut: "2",
        cooldown: 15000,
        lastUsed: now - 20000, // Cooldown expired (15s)
        effects: { wheelWear: 30 },
      },
    ];
    expect(canPerformAction("tighten-trucks", actions, now)).toBe(false);
    expect(canPerformAction("replace-wheels", actions, now)).toBe(true);
  });
});

describe("performAction", () => {
  const createFreshState = (): GameState => ({
    stats: {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    },
    phase: "playing",
    score: 0,
    ticksAlive: 0,
    lastTick: Date.now(),
  });

  it("should export a performAction function", () => {
    expect(typeof performAction).toBe("function");
  });

  it("should return a new state object (not mutate input)", () => {
    const state = createFreshState();
    const result = performAction("tighten-trucks", state, Date.now());
    expect(result).not.toBe(state);
    // Original state should be unchanged
    expect(state.score).toBe(0);
  });

  it("should apply tighten-trucks effects (+25 truckTightness)", () => {
    const state: GameState = {
      ...createFreshState(),
      stats: { ...createFreshState().stats, truckTightness: 50 },
    };
    const result = performAction("tighten-trucks", state, Date.now());
    expect(result.stats.truckTightness).toBe(75);
    // Other stats should be unchanged
    expect(result.stats.deckIntegrity).toBe(100);
    expect(result.stats.wheelWear).toBe(100);
    expect(result.stats.gripCondition).toBe(100);
  });

  it("should apply replace-wheels effects (+30 wheelWear)", () => {
    const state: GameState = {
      ...createFreshState(),
      stats: { ...createFreshState().stats, wheelWear: 50 },
    };
    const result = performAction("replace-wheels", state, Date.now());
    expect(result.stats.wheelWear).toBe(80);
    // Other stats should be unchanged
    expect(result.stats.deckIntegrity).toBe(100);
    expect(result.stats.truckTightness).toBe(100);
    expect(result.stats.gripCondition).toBe(100);
  });

  it("should apply sand-grip-tape effects (+25 gripCondition)", () => {
    const state: GameState = {
      ...createFreshState(),
      stats: { ...createFreshState().stats, gripCondition: 50 },
    };
    const result = performAction("sand-grip-tape", state, Date.now());
    expect(result.stats.gripCondition).toBe(75);
    // Other stats should be unchanged
    expect(result.stats.deckIntegrity).toBe(100);
    expect(result.stats.wheelWear).toBe(100);
    expect(result.stats.truckTightness).toBe(100);
  });

  it("should apply apply-wax effects (+15 all stats)", () => {
    const state: GameState = {
      ...createFreshState(),
      stats: {
        deckIntegrity: 80,
        wheelWear: 70,
        truckTightness: 60,
        gripCondition: 50,
      },
    };
    const result = performAction("apply-wax", state, Date.now());
    expect(result.stats.deckIntegrity).toBe(95);
    expect(result.stats.wheelWear).toBe(85);
    expect(result.stats.truckTightness).toBe(75);
    expect(result.stats.gripCondition).toBe(65);
  });

  it("should cap stats at 100 (never exceed)", () => {
    const state: GameState = {
      ...createFreshState(),
      stats: {
        deckIntegrity: 90,
        wheelWear: 80,
        truckTightness: 95,
        gripCondition: 90,
      },
    };
    const result = performAction("apply-wax", state, Date.now());
    expect(result.stats.deckIntegrity).toBe(100); // 90 + 15 = 105 → capped at 100
    expect(result.stats.wheelWear).toBe(95); // 80 + 15 = 95 (not capped)
    expect(result.stats.truckTightness).toBe(100); // 95 + 15 = 110 → capped at 100
    expect(result.stats.gripCondition).toBe(100); // 90 + 15 = 105 → capped at 100
  });

  it("should increment score by 10", () => {
    const state = createFreshState();
    const result = performAction("tighten-trucks", state, Date.now());
    expect(result.score).toBe(10);
  });

  it("should accumulate score across multiple actions", () => {
    let state = createFreshState();
    state = performAction("tighten-trucks", state, Date.now());
    expect(state.score).toBe(10);
    state = performAction("replace-wheels", state, Date.now() + 1);
    expect(state.score).toBe(20);
    state = performAction("sand-grip-tape", state, Date.now() + 2);
    expect(state.score).toBe(30);
  });

  it("should preserve non-affected fields (phase, ticksAlive, lastTick)", () => {
    const state: GameState = {
      ...createFreshState(),
      phase: "warning",
      ticksAlive: 50000,
      lastTick: 1234567890,
    };
    const result = performAction("tighten-trucks", state, Date.now());
    expect(result.phase).toBe("warning");
    expect(result.ticksAlive).toBe(50000);
    expect(result.lastTick).toBe(1234567890);
  });

  it("should handle unknown action ID gracefully (return unchanged state)", () => {
    const state = createFreshState();
    const result = performAction("unknown-action", state, Date.now());
    expect(result.stats).toEqual(state.stats);
    expect(result.score).toBe(0); // Score should not increment for unknown actions
  });

  it("should return new stats object (not reference original)", () => {
    const state = createFreshState();
    const result = performAction("tighten-trucks", state, Date.now());
    expect(result.stats).not.toBe(state.stats);
  });

  describe("edge cases", () => {
    it("should handle stats at 0 (restore from zero)", () => {
      const state: GameState = {
        ...createFreshState(),
        stats: {
          deckIntegrity: 50,
          wheelWear: 0,
          truckTightness: 0,
          gripCondition: 0,
        },
      };
      const result = performAction("replace-wheels", state, Date.now());
      expect(result.stats.wheelWear).toBe(30); // 0 + 30 = 30
    });

    it("should handle multiple actions on same stat (capped at 100)", () => {
      let state: GameState = {
        ...createFreshState(),
        stats: {
          deckIntegrity: 90,
          wheelWear: 50,
          truckTightness: 90,
          gripCondition: 90,
        },
      };
      // apply-wax adds 15 to all, then tighten-trucks adds 25 to truckTightness
      state = performAction("apply-wax", state, Date.now());
      expect(state.stats.truckTightness).toBe(100); // 90 + 15 = 105 → 100
      state = performAction("tighten-trucks", state, Date.now() + 1);
      expect(state.stats.truckTightness).toBe(100); // 100 + 25 = 125 → 100
    });

    it("should not modify original state's stats object", () => {
      const state = createFreshState();
      const originalTruckTightness = state.stats.truckTightness;
      performAction("tighten-trucks", state, Date.now());
      expect(state.stats.truckTightness).toBe(originalTruckTightness);
    });
  });
});

describe("integration: canPerformAction + performAction workflow", () => {
  it("should allow action when not on cooldown and update lastUsed", () => {
    const now = Date.now();
    // Create fresh mutable copy with lastUsed reset to 0 (previous tests may have mutated global)
    const actions: CareAction[] = CARE_ACTIONS.map((a) => ({ ...a, lastUsed: 0 }));
    const state = createFreshStateForIntegration();

    // Action should be performable (never used, lastUsed = 0)
    expect(canPerformAction("tighten-trucks", actions, now)).toBe(true);

    // Perform the action — pass the same actions array so lastUsed gets updated
    const newState = performAction("tighten-trucks", state, now, actions as CareAction[]);
    expect(newState.score).toBe(10);

    // Verify lastUsed was updated on the actions array
    const tightenedAction = actions.find((a) => a.id === "tighten-trucks")!;
    expect(tightenedAction.lastUsed).toBe(now);

    // Immediately after, action should be on cooldown
    expect(canPerformAction("tighten-trucks", actions, now + 1)).toBe(false);

    // After cooldown expires, action should be performable again
    expect(canPerformAction("tighten-trucks", actions, now + 8000)).toBe(true);
  });

  it("should handle rapid successive calls to different actions", () => {
    const now = Date.now();
    let state = createFreshStateForIntegration();

    // Perform all four actions in sequence (different cooldowns)
    state = performAction("tighten-trucks", state, now);
    expect(state.score).toBe(10);
    state = performAction("replace-wheels", state, now + 1);
    expect(state.score).toBe(20);
    state = performAction("sand-grip-tape", state, now + 2);
    expect(state.score).toBe(30);
    state = performAction("apply-wax", state, now + 3);
    expect(state.score).toBe(40);

    // All stats should reflect the combined effects (capped at 100)
    expect(state.stats.deckIntegrity).toBe(100); // 100 + 15 = 115 → 100
    expect(state.stats.wheelWear).toBe(100); // 100 + 30 + 15 = 145 → 100
    expect(state.stats.truckTightness).toBe(100); // 100 + 25 + 15 = 140 → 100
    expect(state.stats.gripCondition).toBe(100); // 100 + 25 + 15 = 140 → 100
  });
});

// Helper for integration tests
function createFreshStateForIntegration(): GameState {
  return {
    stats: {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    },
    phase: "playing",
    score: 0,
    ticksAlive: 0,
    lastTick: Date.now(),
  };
}
