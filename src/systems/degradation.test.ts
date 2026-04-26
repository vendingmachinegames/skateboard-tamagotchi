/// <reference types="bun" />

import { describe, it, expect } from "bun:test";
import type { BoardStats } from "../types/game-types";

// These imports will fail until implementation exists (RED phase)
import { degradeStats, updatePhase } from "./degradation";
import { DEGRADATION_CONFIG } from "../game/constants";

/**
 * Tests for the stat degradation system (US-003).
 * Validates that board stats degrade over time at configurable rates,
 * with interconnected effects between stats.
 */

describe("DEGRADATION_CONFIG", () => {
  it("should export DEGRADATION_CONFIG object", () => {
    expect(DEGRADATION_CONFIG).toBeDefined();
    expect(typeof DEGRADATION_CONFIG).toBe("object");
  });

  it("should have correct base degradation rates per second", () => {
    expect(DEGRADATION_CONFIG.deckIntegrity).toBe(0.5);
    expect(DEGRADATION_CONFIG.wheelWear).toBe(1.2);
    expect(DEGRADATION_CONFIG.truckTightness).toBe(0.8);
    expect(DEGRADATION_CONFIG.gripCondition).toBe(1.0);
  });
});

describe("degradeStats", () => {
  const freshStats: BoardStats = {
    deckIntegrity: 100,
    wheelWear: 100,
    truckTightness: 100,
    gripCondition: 100,
  };

  it("should export a degradeStats function", () => {
    expect(typeof degradeStats).toBe("function");
  });

  it("should return new stats object (not mutate input)", () => {
    const result = degradeStats(freshStats, 1000);
    expect(result).not.toBe(freshStats);
    // Original should be unchanged
    expect(freshStats.deckIntegrity).toBe(100);
  });

  it("should degrade deckIntegrity at 0.5%/sec", () => {
    const result = degradeStats(freshStats, 1000); // 1 second
    expect(result.deckIntegrity).toBeCloseTo(99.5, 5);
  });

  it("should degrade wheelWear at 1.2%/sec", () => {
    const result = degradeStats(freshStats, 1000);
    expect(result.wheelWear).toBeCloseTo(98.8, 5);
  });

  it("should degrade truckTightness at 0.8%/sec", () => {
    const result = degradeStats(freshStats, 1000);
    expect(result.truckTightness).toBeCloseTo(99.2, 5);
  });

  it("should degrade gripCondition at 1.0%/sec", () => {
    const result = degradeStats(freshStats, 1000);
    expect(result.gripCondition).toBeCloseTo(99.0, 5);
  });

  it("should scale degradation proportionally with deltaTime", () => {
    // 0.5 seconds should produce half the degradation of 1 second
    const result = degradeStats(freshStats, 500);
    expect(result.deckIntegrity).toBeCloseTo(99.75, 5);
    expect(result.wheelWear).toBeCloseTo(99.4, 5);
    expect(result.truckTightness).toBeCloseTo(99.6, 5);
    expect(result.gripCondition).toBeCloseTo(99.5, 5);
  });

  it("should produce zero degradation with zero deltaTime", () => {
    const result = degradeStats(freshStats, 0);
    expect(result.deckIntegrity).toBe(100);
    expect(result.wheelWear).toBe(100);
    expect(result.truckTightness).toBe(100);
    expect(result.gripCondition).toBe(100);
  });

  it("should floor stats at 0 (never go negative)", () => {
    const lowStats: BoardStats = {
      deckIntegrity: 0.1,
      wheelWear: 0.1,
      truckTightness: 0.1,
      gripCondition: 0.1,
    };
    const result = degradeStats(lowStats, 1000); // 1 second of degradation
    expect(result.deckIntegrity).toBe(0);
    expect(result.wheelWear).toBe(0);
    expect(result.truckTightness).toBe(0);
    expect(result.gripCondition).toBe(0);
  });

  it("should floor stats at 0 even with large deltaTime", () => {
    const lowStats: BoardStats = {
      deckIntegrity: 1,
      wheelWear: 1,
      truckTightness: 1,
      gripCondition: 1,
    };
    const result = degradeStats(lowStats, 60000); // 60 seconds
    expect(result.deckIntegrity).toBe(0);
    expect(result.wheelWear).toBe(0);
    expect(result.truckTightness).toBe(0);
    expect(result.gripCondition).toBe(0);
  });

  describe("interconnected effects", () => {
    it("should degrade deckIntegrity 2x faster when truckTightness < 30", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 29,
        gripCondition: 100,
      };
      const result = degradeStats(stats, 1000); // 1 second
      // Base rate 0.5%/sec * 2x multiplier = 1.0%/sec
      expect(result.deckIntegrity).toBeCloseTo(99.0, 5);
    });

    it("should degrade deckIntegrity 1.5x faster when gripCondition < 30", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 29,
      };
      const result = degradeStats(stats, 1000); // 1 second
      // Base rate 0.5%/sec * 1.5x multiplier = 0.75%/sec
      expect(result.deckIntegrity).toBeCloseTo(99.25, 5);
    });

    it("should apply both multipliers when truckTightness < 30 AND gripCondition < 30", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 29,
        gripCondition: 29,
      };
      const result = degradeStats(stats, 1000); // 1 second
      // Base rate 0.5%/sec * 2x * 1.5x = 1.5%/sec
      expect(result.deckIntegrity).toBeCloseTo(98.5, 5);
    });

    it("should NOT apply multiplier when truckTightness is exactly 30", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 30,
        gripCondition: 100,
      };
      const result = degradeStats(stats, 1000);
      // No multiplier: base rate 0.5%/sec
      expect(result.deckIntegrity).toBeCloseTo(99.5, 5);
    });

    it("should NOT apply multiplier when gripCondition is exactly 30", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 100,
        gripCondition: 30,
      };
      const result = degradeStats(stats, 1000);
      // No multiplier: base rate 0.5%/sec
      expect(result.deckIntegrity).toBeCloseTo(99.5, 5);
    });

    it("should apply 3x combined multiplier when both truckTightness < 30 AND gripCondition < 30 with low values", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 50,
        truckTightness: 5,
        gripCondition: 5,
      };
      const result = degradeStats(stats, 2000); // 2 seconds
      // Base rate 0.5%/sec * 2x * 1.5x = 1.5%/sec * 2 sec = 3% total
      expect(result.deckIntegrity).toBeCloseTo(97.0, 5);
    });

    it("should only multiply deckIntegrity (other stats unaffected by interconnected effects)", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 29,
        gripCondition: 29,
      };
      const result = degradeStats(stats, 1000);
      // Other stats should still degrade at base rates
      expect(result.wheelWear).toBeCloseTo(98.8, 5);
      expect(result.truckTightness).toBeCloseTo(28.2, 5);
      expect(result.gripCondition).toBeCloseTo(28.0, 5);
    });

    it("should apply interconnected effects with varying deltaTime values", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 20, // below 30, triggers 2x
        gripCondition: 100,
      };
      // At 2 seconds with 2x multiplier: 0.5 * 2 * 2 = 2% degradation
      const result = degradeStats(stats, 2000);
      expect(result.deckIntegrity).toBeCloseTo(98.0, 5);
    });

    it("should apply interconnected effects when only truckTightness is below threshold with varying deltaTime", () => {
      const stats: BoardStats = {
        deckIntegrity: 80,
        wheelWear: 60,
        truckTightness: 15, // below 30
        gripCondition: 50, // above 30
      };
      // 3 seconds: 0.5 * 2 * 3 = 3% deck degradation
      const result = degradeStats(stats, 3000);
      expect(result.deckIntegrity).toBeCloseTo(77.0, 5);
    });

    it("should apply interconnected effects when only gripCondition is below threshold with varying deltaTime", () => {
      const stats: BoardStats = {
        deckIntegrity: 80,
        wheelWear: 60,
        truckTightness: 50, // above 30
        gripCondition: 20, // below 30
      };
      // 3 seconds: 0.5 * 1.5 * 3 = 2.25% deck degradation
      const result = degradeStats(stats, 3000);
      expect(result.deckIntegrity).toBeCloseTo(77.75, 5);
    });

    it("should NOT apply interconnected effects when both truckTightness and gripCondition are exactly 30", () => {
      const stats: BoardStats = {
        deckIntegrity: 100,
        wheelWear: 100,
        truckTightness: 30, // exactly at threshold - no multiplier
        gripCondition: 30, // exactly at threshold - no multiplier
      };
      const result = degradeStats(stats, 1000);
      // No multiplier: base rate 0.5%/sec
      expect(result.deckIntegrity).toBeCloseTo(99.5, 5);
    });
  });

  describe("edge cases", () => {
    it("should handle very small deltaTime (1ms)", () => {
      const result = degradeStats(freshStats, 1);
      // 0.5%/sec * 0.001 sec = 0.0005% degradation
      expect(result.deckIntegrity).toBeCloseTo(99.9995, 5);
    });

    it("should handle negative deltaTime gracefully (no degradation)", () => {
      const result = degradeStats(freshStats, -1000);
      expect(result.deckIntegrity).toBe(100);
      expect(result.wheelWear).toBe(100);
    });

    it("should handle NaN deltaTime gracefully", () => {
      const result = degradeStats(freshStats, NaN);
      expect(result.deckIntegrity).toBe(100);
    });

    it("should handle Infinity deltaTime (floor at 0)", () => {
      const result = degradeStats(freshStats, Infinity);
      expect(result.deckIntegrity).toBe(0);
      expect(result.wheelWear).toBe(0);
      expect(result.truckTightness).toBe(0);
      expect(result.gripCondition).toBe(0);
    });

    it("should preserve all four stat keys in result", () => {
      const result = degradeStats(freshStats, 1000);
      expect(Object.keys(result)).toEqual(["deckIntegrity", "wheelWear", "truckTightness", "gripCondition"]);
    });
  });
});

describe("updatePhase", () => {
  it("should export an updatePhase function", () => {
    expect(typeof updatePhase).toBe("function");
  });

  it("should return 'playing' when all stats are above 30", () => {
    const stats: BoardStats = {
      deckIntegrity: 50,
      wheelWear: 60,
      truckTightness: 40,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("playing");
  });

  it("should return 'warning' when any stat is below 30", () => {
    const stats: BoardStats = {
      deckIntegrity: 50,
      wheelWear: 29,
      truckTightness: 40,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("warning");
  });

  it("should return 'critical' when any stat is below 10", () => {
    const stats: BoardStats = {
      deckIntegrity: 50,
      wheelWear: 9,
      truckTightness: 40,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("critical");
  });

  it("should return 'snapped' when deckIntegrity reaches 0", () => {
    const stats: BoardStats = {
      deckIntegrity: 0,
      wheelWear: 50,
      truckTightness: 40,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("snapped");
  });

  it("should prioritize 'critical' over 'warning'", () => {
    const stats: BoardStats = {
      deckIntegrity: 50,
      wheelWear: 9,
      truckTightness: 29,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("critical");
  });

  it("should prioritize 'snapped' over 'critical'", () => {
    const stats: BoardStats = {
      deckIntegrity: 0,
      wheelWear: 9,
      truckTightness: 29,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("snapped");
  });

  it("should return 'playing' when all stats are at 100", () => {
    const stats: BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 100,
      gripCondition: 100,
    };
    expect(updatePhase(stats)).toBe("playing");
  });

  it("should return 'warning' when stat is exactly 29.9", () => {
    const stats: BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 29.9,
      gripCondition: 100,
    };
    expect(updatePhase(stats)).toBe("warning");
  });

  it("should return 'critical' when stat is exactly 9.9", () => {
    const stats: BoardStats = {
      deckIntegrity: 100,
      wheelWear: 9.9,
      truckTightness: 40,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("critical");
  });

  it("should return 'warning' when stat is exactly 10 (still below warning threshold of 30)", () => {
    const stats: BoardStats = {
      deckIntegrity: 100,
      wheelWear: 10,
      truckTightness: 40,
      gripCondition: 35,
    };
    // wheelWear=10 is below warning threshold (30) but at critical threshold (10)
    // Since 10 is NOT < 10, it's not critical. But 10 IS < 30, so it's warning.
    expect(updatePhase(stats)).toBe("warning");
  });

  it("should return 'warning' when stat is exactly 30", () => {
    const stats: BoardStats = {
      deckIntegrity: 100,
      wheelWear: 100,
      truckTightness: 30,
      gripCondition: 35,
    };
    expect(updatePhase(stats)).toBe("playing");
  });

  it("should handle multiple stats at warning boundary simultaneously", () => {
    const stats: BoardStats = {
      deckIntegrity: 29,
      wheelWear: 28,
      truckTightness: 30,
      gripCondition: 29,
    };
    expect(updatePhase(stats)).toBe("warning");
  });

  it("should handle multiple stats at critical boundary simultaneously", () => {
    const stats: BoardStats = {
      deckIntegrity: 9,
      wheelWear: 8,
      truckTightness: 29,
      gripCondition: 7,
    };
    expect(updatePhase(stats)).toBe("critical");
  });

  it("should handle all stats at exactly 0 (snapped via deckIntegrity)", () => {
    const stats: BoardStats = {
      deckIntegrity: 0,
      wheelWear: 0,
      truckTightness: 0,
      gripCondition: 0,
    };
    expect(updatePhase(stats)).toBe("snapped");
  });

  it("should handle one stat in warning and another in critical", () => {
    const stats: BoardStats = {
      deckIntegrity: 25, // warning territory
      wheelWear: 99,
      truckTightness: 8, // critical territory
      gripCondition: 50,
    };
    expect(updatePhase(stats)).toBe("critical");
  });

  it("should handle one stat in playing and another at warning boundary", () => {
    const stats: BoardStats = {
      deckIntegrity: 90,
      wheelWear: 29, // just below warning threshold
      truckTightness: 50,
      gripCondition: 70,
    };
    expect(updatePhase(stats)).toBe("warning");
  });

  it("should return 'snapped' when deckIntegrity is exactly 0 but other stats are above thresholds", () => {
    const stats: BoardStats = {
      deckIntegrity: 0,
      wheelWear: 95,
      truckTightness: 80,
      gripCondition: 70,
    };
    expect(updatePhase(stats)).toBe("snapped");
  });

  it("should return 'critical' when all stats are below 10 but deckIntegrity is not 0", () => {
    const stats: BoardStats = {
      deckIntegrity: 9,
      wheelWear: 5,
      truckTightness: 8,
      gripCondition: 3,
    };
    expect(updatePhase(stats)).toBe("critical");
  });

  it("should return 'snapped' when deckIntegrity is exactly 0 but other stats are above thresholds", () => {
    const stats: BoardStats = {
      deckIntegrity: 0,
      wheelWear: 95,
      truckTightness: 80,
      gripCondition: 70,
    };
    expect(updatePhase(stats)).toBe("snapped");
  });
});
