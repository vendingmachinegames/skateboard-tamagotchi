/// <reference types="bun" />

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { GameState } from "../types/game-types";

// These imports will fail until implementation exists (RED phase)
import { saveGame, loadGame, SAVE_KEY, AUTO_SAVE_INTERVAL_MS, createSerializableState, restoreFromSave } from "./save-load";

/**
 * Mock localStorage with an in-memory Map for testing.
 * Follows the project's pattern of mocking browser APIs for pure unit tests.
 */
function createMockLocalStorage(): typeof globalThis.localStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
  };
}

/**
 * Tests for the localStorage persistence system (US-010).
 * Validates save/load, serialization/deserialization, and error handling.
 */

describe("SAVE_KEY constant", () => {
  it("should export SAVE_KEY as 'skateboard-tamagotchi-save'", () => {
    expect(SAVE_KEY).toBe("skateboard-tamagotchi-save");
  });
});

describe("createSerializableState", () => {
  let mockStorage: typeof globalThis.localStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    // Clean up after each test
    delete (globalThis as any).localStorage;
  });

  it("should export createSerializableState function", () => {
    expect(typeof createSerializableState).toBe("function");
  });

  it("should serialize a GameState into a plain object", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 85,
        wheelWear: 70,
        truckTightness: 60,
        gripCondition: 90,
      },
      phase: "playing",
      score: 150,
      ticksAlive: 30000,
      lastTick: Date.now(),
    };

    const serialized = createSerializableState(state);

    expect(typeof serialized).toBe("object");
    expect(serialized).not.toBe(state); // Should be a copy, not the same reference
  });

  it("should include stats in serialized state", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 50,
        wheelWear: 40,
        truckTightness: 30,
        gripCondition: 20,
      },
      phase: "warning",
      score: 100,
      ticksAlive: 60000,
      lastTick: 1234567890,
    };

    const serialized = createSerializableState(state);

    expect(serialized.stats).toBeDefined();
    expect(serialized.stats.deckIntegrity).toBe(50);
    expect(serialized.stats.wheelWear).toBe(40);
    expect(serialized.stats.truckTightness).toBe(30);
    expect(serialized.stats.gripCondition).toBe(20);
  });

  it("should include score in serialized state", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 250,
      ticksAlive: 45000,
      lastTick: Date.now(),
    };

    const serialized = createSerializableState(state);

    expect(serialized.score).toBe(250);
  });

  it("should include ticksAlive in serialized state", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 0,
      ticksAlive: 123456,
      lastTick: Date.now(),
    };

    const serialized = createSerializableState(state);

    expect(serialized.ticksAlive).toBe(123456);
  });

  it("should include cracksSeed in serialized state when provided", () => {
    const stateWithSeed: GameState & { cracksSeed?: number } = {
      stats: {
        deckIntegrity: 50,
        wheelWear: 40,
        truckTightness: 30,
        gripCondition: 20,
      },
      phase: "playing",
      score: 100,
      ticksAlive: 60000,
      lastTick: Date.now(),
      cracksSeed: 42,
    };

    const serialized = createSerializableState(stateWithSeed);

    expect(serialized.cracksSeed).toBe(42);
  });

  it("should exclude lastTick from serialized state", () => {
    const state: GameState & { cracksSeed?: number } = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 0,
      ticksAlive: 50000,
      lastTick: 9999999999,
    };

    const serialized = createSerializableState(state);

    // SerializableState should not have lastTick property
    expect("lastTick" in serialized).toBe(false);
  });

  it("should not mutate the original state", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 50,
      ticksAlive: 30000,
      lastTick: Date.now(),
    };

    const originalLastTick = state.lastTick;

    createSerializableState(state);

    expect(state.lastTick).toBe(originalLastTick); // Original should be unchanged
  });

  it("should serialize stats as a deep copy (not same reference)", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 80,
        wheelWear: 70,
        truckTightness: 60,
        gripCondition: 50,
      },
      phase: "playing",
      score: 100,
      ticksAlive: 30000,
      lastTick: Date.now(),
    };

    const serialized = createSerializableState(state);

    // Mutating the original state should not affect serialized copy
    state.stats.deckIntegrity = 0;
    expect(serialized.stats.deckIntegrity).toBe(80);
  });
});

describe("AUTO_SAVE_INTERVAL_MS constant", () => {
  it("should export AUTO_SAVE_INTERVAL_MS as 10000 (10 seconds)", () => {
    expect(AUTO_SAVE_INTERVAL_MS).toBe(10000);
  });
});

describe("restoreFromSave", () => {
  it("should export restoreFromSave function", () => {
    expect(typeof restoreFromSave).toBe("function");
  });

  it("should return null for invalid input (not an object)", () => {
    expect(restoreFromSave("not-an-object" as any)).toBeNull();
    expect(restoreFromSave(42 as any)).toBeNull();
    expect(restoreFromSave(null as any)).toBeNull();
    expect(restoreFromSave(undefined as any)).toBeNull();
  });

  it("should return null for missing required fields", () => {
    expect(restoreFromSave({} as any)).toBeNull();
    expect(restoreFromSave({ stats: {} } as any)).toBeNull();
    expect(restoreFromSave({ score: 0 } as any)).toBeNull();
  });

  it("should return null for missing stats sub-fields", () => {
    const invalid = {
      stats: { deckIntegrity: 100 }, // missing other stats
      score: 0,
      ticksAlive: 0,
    };
    expect(restoreFromSave(invalid as any)).toBeNull();
  });

  it("should restore a valid save with all required fields", () => {
    const saveData = {
      stats: {
        deckIntegrity: 75,
        wheelWear: 60,
        truckTightness: 50,
        gripCondition: 80,
      },
      score: 200,
      ticksAlive: 45000,
    };

    const restored = restoreFromSave(saveData as any);

    expect(restored).not.toBeNull();
    expect(restored!.stats.deckIntegrity).toBe(75);
    expect(restored!.stats.wheelWear).toBe(60);
    expect(restored!.stats.truckTightness).toBe(50);
    expect(restored!.stats.gripCondition).toBe(80);
    expect(restored!.score).toBe(200);
    expect(restored!.ticksAlive).toBe(45000);
  });

  it("should reset lastTick on restore", () => {
    const saveData = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      score: 0,
      ticksAlive: 0,
    };

    const restored = restoreFromSave(saveData as any);

    expect(restored).not.toBeNull();
    // lastTick should be set to current time (or a valid timestamp)
    if (restored) {
      expect(typeof restored.lastTick).toBe("number");
      expect(restored.lastTick).toBeGreaterThan(0);
    }
  });

  it("should restore phase from save data when present", () => {
    const saveData = {
      stats: {
        deckIntegrity: 25,
        wheelWear: 60,
        truckTightness: 50,
        gripCondition: 80,
      },
      phase: "warning",
      score: 100,
      ticksAlive: 30000,
    };

    const restored = restoreFromSave(saveData as any);

    expect(restored).not.toBeNull();
    if (restored) {
      expect(restored.phase).toBe("warning");
    }
  });

  it("should default phase to 'playing' when not in save data", () => {
    const saveData = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      score: 0,
      ticksAlive: 0,
    };

    const restored = restoreFromSave(saveData as any);

    expect(restored).not.toBeNull();
    if (restored) {
      // Phase should default to something valid when not in save
      expect(["new", "playing"]).toContain(restored.phase);
    }
  });

  it("should return null for non-numeric stat values", () => {
    const invalid = {
      stats: {
        deckIntegrity: "not-a-number",
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      score: 0,
      ticksAlive: 0,
    };
    expect(restoreFromSave(invalid as any)).toBeNull();
  });

  it("should return null for non-numeric score", () => {
    const invalid = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      score: "not-a-number",
      ticksAlive: 0,
    };
    expect(restoreFromSave(invalid as any)).toBeNull();
  });

  it("should return null for non-numeric ticksAlive", () => {
    const invalid = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      score: 0,
      ticksAlive: "not-a-number",
    };
    expect(restoreFromSave(invalid as any)).toBeNull();
  });

  it("should return null for out-of-range stat values", () => {
    const invalid = {
      stats: {
        deckIntegrity: 150, // above max
        wheelWear: -10,     // below min
        truckTightness: 100,
        gripCondition: 100,
      },
      score: 0,
      ticksAlive: 0,
    };
    expect(restoreFromSave(invalid as any)).toBeNull();
  });

  it("should restore cracksSeed when present in save data", () => {
    const saveData = {
      stats: {
        deckIntegrity: 75,
        wheelWear: 60,
        truckTightness: 50,
        gripCondition: 80,
      },
      score: 200,
      ticksAlive: 45000,
      cracksSeed: 12345,
    };

    const restored = restoreFromSave(saveData as any);

    expect(restored).not.toBeNull();
    if (restored) {
      // The restored object should carry cracksSeed for the Game class to use
      const fullState = restored as GameState & { cracksSeed?: number };
      expect(fullState.cracksSeed).toBe(12345);
    }
  });
});

describe("saveGame", () => {
  let mockStorage: typeof globalThis.localStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("should export saveGame function", () => {
    expect(typeof saveGame).toBe("function");
  });

  it("should serialize GameState to JSON and store in localStorage", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 85,
        wheelWear: 70,
        truckTightness: 60,
        gripCondition: 90,
      },
      phase: "playing",
      score: 150,
      ticksAlive: 30000,
      lastTick: Date.now(),
    };

    saveGame(state);

    const stored = mockStorage.getItem(SAVE_KEY);
    expect(stored).not.toBeNull();
    expect(typeof stored).toBe("string");
  });

  it("should store under the correct key 'skateboard-tamagotchi-save'", () => {
    const state: GameState = {
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

    saveGame(state);

    const stored = mockStorage.getItem("skateboard-tamagotchi-save");
    expect(stored).not.toBeNull();
  });

  it("should store valid JSON that can be parsed", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 50,
        wheelWear: 40,
        truckTightness: 30,
        gripCondition: 20,
      },
      phase: "critical",
      score: 100,
      ticksAlive: 60000,
      lastTick: Date.now(),
    };

    saveGame(state);

    const stored = mockStorage.getItem(SAVE_KEY)!;
    const parsed = JSON.parse(stored);

    expect(parsed.stats).toBeDefined();
    expect(parsed.score).toBe(100);
    expect(parsed.ticksAlive).toBe(60000);
  });

  it("should exclude lastTick from saved data", () => {
    const state: GameState = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      phase: "playing",
      score: 50,
      ticksAlive: 30000,
      lastTick: 9999999999,
    };

    saveGame(state);

    const stored = mockStorage.getItem(SAVE_KEY)!;
    const parsed = JSON.parse(stored);

    expect(parsed.lastTick).toBeUndefined();
  });

  it("should not throw when localStorage is unavailable", () => {
    // Simulate localStorage throwing (e.g., disabled in browser)
    const brokenStorage: typeof globalThis.localStorage = {
      getItem: () => null,
      setItem: () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); },
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };
    (globalThis as any).localStorage = brokenStorage;

    const state: GameState = {
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

    // Should not throw — errors are caught and logged
    expect(() => saveGame(state)).not.toThrow();
  });

  it("should not throw when localStorage is undefined", () => {
    delete (globalThis as any).localStorage;

    const state: GameState = {
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

    expect(() => saveGame(state)).not.toThrow();
  });

  it("should not throw when localStorage throws generic Error", () => {
    const brokenStorage: typeof globalThis.localStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("Unexpected storage error"); },
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };
    (globalThis as any).localStorage = brokenStorage;

    const state: GameState = {
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

    expect(() => saveGame(state)).not.toThrow();
  });

  it("should not throw when localStorage throws SecurityError", () => {
    const brokenStorage: typeof globalThis.localStorage = {
      getItem: () => null,
      setItem: () => { throw new DOMException("Security error", "SecurityError"); },
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };
    (globalThis as any).localStorage = brokenStorage;

    const state: GameState = {
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

    expect(() => saveGame(state)).not.toThrow();
  });
});

describe("loadGame", () => {
  let mockStorage: typeof globalThis.localStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("should export loadGame function", () => {
    expect(typeof loadGame).toBe("function");
  });

  it("should return null when no save exists in localStorage", () => {
    const result = loadGame();
    expect(result).toBeNull();
  });

  it("should return null for invalid JSON in localStorage", () => {
    mockStorage.setItem(SAVE_KEY, "not-valid-json{{{");
    const result = loadGame();
    expect(result).toBeNull();
  });

  it("should return null when save data is missing required fields", () => {
    mockStorage.setItem(SAVE_KEY, JSON.stringify({ score: 0 }));
    const result = loadGame();
    expect(result).toBeNull();
  });

  it("should return a valid GameState when save data is complete", () => {
    const saveData = {
      stats: {
        deckIntegrity: 75,
        wheelWear: 60,
        truckTightness: 50,
        gripCondition: 80,
      },
      phase: "playing",
      score: 200,
      ticksAlive: 45000,
    };

    mockStorage.setItem(SAVE_KEY, JSON.stringify(saveData));

    const result = loadGame();

    expect(result).not.toBeNull();
    if (result) {
      expect(result.stats.deckIntegrity).toBe(75);
      expect(result.stats.wheelWear).toBe(60);
      expect(result.stats.truckTightness).toBe(50);
      expect(result.stats.gripCondition).toBe(80);
      expect(result.score).toBe(200);
      expect(result.ticksAlive).toBe(45000);
      expect(result.phase).toBe("playing");
    }
  });

  it("should reset lastTick when loading a save", () => {
    const saveData = {
      stats: {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 100,
      },
      score: 0,
      ticksAlive: 0,
    };

    mockStorage.setItem(SAVE_KEY, JSON.stringify(saveData));

    const result = loadGame();

    expect(result).not.toBeNull();
    if (result) {
      // lastTick should be a fresh timestamp, not from the save
      expect(typeof result.lastTick).toBe("number");
      expect(result.lastTick).toBeGreaterThan(0);
    }
  });

  it("should not throw when localStorage is unavailable", () => {
    delete (globalThis as any).localStorage;

    expect(() => loadGame()).not.toThrow();
  });

  it("should not throw when localStorage throws an error", () => {
    const brokenStorage: typeof globalThis.localStorage = {
      getItem: () => { throw new DOMException("Security error"); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    };
    (globalThis as any).localStorage = brokenStorage;

    expect(() => loadGame()).not.toThrow();
  });

  it("should return null for empty string in localStorage", () => {
    mockStorage.setItem(SAVE_KEY, "");
    const result = loadGame();
    expect(result).toBeNull();
  });
});

describe("auto-save interval configuration", () => {
  it("AUTO_SAVE_INTERVAL_MS should be exactly 10 seconds (10000ms)", () => {
    expect(AUTO_SAVE_INTERVAL_MS).toBe(10 * 1000);
  });

  it("AUTO_SAVE_INTERVAL_MS should be a positive finite number", () => {
    expect(Number.isFinite(AUTO_SAVE_INTERVAL_MS)).toBe(true);
    expect(AUTO_SAVE_INTERVAL_MS).toBeGreaterThan(0);
  });
});

describe("save/load round-trip", () => {
  let mockStorage: typeof globalThis.localStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("should preserve all data through a save/load cycle", () => {
    const originalState: GameState = {
      stats: {
        deckIntegrity: 42,
        wheelWear: 67,
        truckTightness: 89,
        gripCondition: 15,
      },
      phase: "warning",
      score: 350,
      ticksAlive: 120000,
      lastTick: Date.now(),
    };

    saveGame(originalState);
    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    if (loaded) {
      expect(loaded.stats.deckIntegrity).toBe(42);
      expect(loaded.stats.wheelWear).toBe(67);
      expect(loaded.stats.truckTightness).toBe(89);
      expect(loaded.stats.gripCondition).toBe(15);
      expect(loaded.score).toBe(350);
      expect(loaded.ticksAlive).toBe(120000);
      expect(loaded.phase).toBe("warning");
      // lastTick should be a fresh timestamp (set to Date.now() on load)
      // We can't compare against original because they might match if test runs fast
      // Instead verify it's a valid recent timestamp
      const now = Date.now();
      expect(loaded.lastTick).toBeGreaterThan(now - 1000);
      expect(loaded.lastTick).toBeLessThanOrEqual(now + 1000);
    }
  });

  it("should handle save/load with snapped phase", () => {
    const snappedState: GameState = {
      stats: {
        deckIntegrity: 0,
        wheelWear: 10,
        truckTightness: 5,
        gripCondition: 3,
      },
      phase: "snapped",
      score: 50,
      ticksAlive: 60000,
      lastTick: Date.now(),
    };

    saveGame(snappedState);
    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    if (loaded) {
      expect(loaded.stats.deckIntegrity).toBe(0);
      expect(loaded.phase).toBe("snapped");
      expect(loaded.score).toBe(50);
    }
  });

  it("should handle save/load with cracksSeed through round-trip", () => {
    const stateWithSeed: GameState & { cracksSeed?: number } = {
      stats: {
        deckIntegrity: 60,
        wheelWear: 50,
        truckTightness: 40,
        gripCondition: 30,
      },
      phase: "playing",
      score: 100,
      ticksAlive: 90000,
      lastTick: Date.now(),
      cracksSeed: 77777,
    };

    saveGame(stateWithSeed);
    const loaded = loadGame() as (GameState & { cracksSeed?: number }) | null;

    expect(loaded).not.toBeNull();
    if (loaded) {
      expect(loaded.cracksSeed).toBe(77777);
    }
  });
});
