import type { BoardStats, GamePhase } from "../types/game-types";
import { DegradationConfig, PHASE_THRESHOLDS, STAT_BOUNDS } from "../game/constants";

/**
 * Degrades board stats based on elapsed time.
 * Pure function — does not mutate input stats, returns a new BoardStats object.
 *
 * Degradation is proportional to deltaTime (in milliseconds).
 * Stats are clamped between STAT_BOUNDS.min and STAT_BOUNDS.max.
 * Interconnected effects accelerate deckIntegrity degradation when
 * truckTightness or gripCondition fall below the configured threshold.
 *
 * @param stats - Current board stats
 * @param deltaTime - Time elapsed since last call in milliseconds
 * @returns New BoardStats with degraded values
 */
export function degradeStats(stats: BoardStats, deltaTime: number): BoardStats {
  // Guard against invalid deltaTime — no degradation for non-positive, NaN, or other invalid values
  // Infinity is treated as a valid extreme value (results in full degradation to floor)
  if (deltaTime <= 0 || isNaN(deltaTime)) {
    return { ...stats };
  }

  const seconds = deltaTime / 1000;
  const config = DegradationConfig;

  // Calculate base degradation for each stat
  let deckLoss = config.deckIntegrity * seconds;
  const wheelLoss = config.wheelWear * seconds;
  const truckLoss = config.truckTightness * seconds;
  const gripLoss = config.gripCondition * seconds;

  // Apply interconnected effects to deckIntegrity
  if (stats.truckTightness < config.threshold) {
    deckLoss *= config.multipliers.truckTightness;
  }
  if (stats.gripCondition < config.threshold) {
    deckLoss *= config.multipliers.gripCondition;
  }

  // Apply degradation and clamp within bounds
  const { min, max } = STAT_BOUNDS;
  return {
    deckIntegrity: Math.max(min, Math.min(max, stats.deckIntegrity - deckLoss)),
    wheelWear: Math.max(min, Math.min(max, stats.wheelWear - wheelLoss)),
    truckTightness: Math.max(min, Math.min(max, stats.truckTightness - truckLoss)),
    gripCondition: Math.max(min, Math.min(max, stats.gripCondition - gripLoss)),
  };
}

/**
 * Applies degradation and updates game phase in one call.
 * This is the integration point used by GameState's onTick callback.
 *
 * First degrades stats based on deltaTime, then determines the
 * appropriate game phase from the resulting stats.
 *
 * @param stats - Current board stats (will be updated in place for phase)
 * @param deltaTime - Time elapsed since last call in milliseconds
 * @returns Object with new degraded stats and updated phase
 */
export function applyDegradation(stats: BoardStats, deltaTime: number): { stats: BoardStats; phase: GamePhase } {
  const newStats = degradeStats(stats, deltaTime);
  const phase = updatePhase(newStats);
  return { stats: newStats, phase };
}

/**
 * Determines the appropriate game phase based on current stat values.
 * Priority order: snapped > critical > warning > playing
 *
 * @param stats - Current board stats
 * @returns The appropriate GamePhase string
 */
export function updatePhase(stats: BoardStats): GamePhase {
  // Check for snapped state first (highest priority)
  if (stats.deckIntegrity <= 0) {
    return "snapped";
  }

  // Check for critical state — any stat below critical threshold
  const minStat = Math.min(
    stats.deckIntegrity,
    stats.wheelWear,
    stats.truckTightness,
    stats.gripCondition
  );

  if (minStat < PHASE_THRESHOLDS.critical) {
    return "critical";
  }

  // Check for warning state — any stat below warning threshold
  if (minStat < PHASE_THRESHOLDS.warning) {
    return "warning";
  }

  // Default: playing
  return "playing";
}
