/**
 * Game constants for the Skateboard Tamagotchi.
 * All magic numbers are centralized here for easy tuning and testing.
 */

/**
 * Interface for the degradation configuration object.
 * Used by degradeStats() to determine rates and interconnected effect multipliers.
 */
export interface DegradationConfig {
  deckIntegrity: number;
  wheelWear: number;
  truckTightness: number;
  gripCondition: number;
  multipliers: {
    truckTightness: number;
    gripCondition: number;
  };
  threshold: number;
}

/**
 * DegradationConfig — the single source of truth for all degradation rates.
 * This is the object referenced in the acceptance criteria as "DegradationConfig".
 */
export const DegradationConfig: Readonly<DegradationConfig> = {
  // Base degradation rates (% per second)
  deckIntegrity: 0.5,
  wheelWear: 1.2,
  truckTightness: 0.8,
  gripCondition: 1.0,

  // Interconnected effect multipliers applied to deckIntegrity
  multipliers: {
    truckTightness: 2,   // 2x faster when truckTightness < threshold
    gripCondition: 1.5,  // 1.5x faster when gripCondition < threshold
  },

  // Threshold below which interconnected effects trigger
  threshold: 30,
};

// Also exported as DEGRADATION_CONFIG for backwards compatibility
export const DEGRADATION_CONFIG = DegradationConfig;

/**
 * Phase thresholds for game state warnings.
 */
export const PHASE_THRESHOLDS = {
  warning: 30,   // Any stat below this triggers 'warning' phase
  critical: 10,  // Any stat below this triggers 'critical' phase
} as const;

/**
 * Stat boundaries for clamping.
 */
export const STAT_BOUNDS = {
  min: 0,
  max: 100,
} as const;
