import type { GameState, BoardStats, GamePhase } from "../types/game-types";

/**
 * localStorage key for saving game state.
 */
export const SAVE_KEY = "skateboard-tamagotchi-save";

/**
 * Auto-save interval in milliseconds (10 seconds).
 * The game auto-saves at this frequency during the 'playing' phase.
 */
export const AUTO_SAVE_INTERVAL_MS = 10_000;

/**
 * Represents the serializable portion of GameState that gets persisted.
 * Excludes lastTick (reset on load) to avoid stale timing references.
 */
export interface SerializableState {
  stats: BoardStats;
  phase?: GamePhase;
  score: number;
  ticksAlive: number;
  cracksSeed?: number;
}

/**
 * Validates that save data has all required fields with correct types.
 * @param data - Raw parsed JSON data to validate
 * @returns true if the data is a valid save, false otherwise
 */
function isValidSaveData(data: unknown): data is Record<string, unknown> {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  // Check required top-level fields
  if (!("stats" in obj) || !("score" in obj) || !("ticksAlive" in obj)) return false;

  // Validate stats structure
  const stats = obj.stats;
  if (typeof stats !== "object" || stats === null) return false;
  const statsObj = stats as Record<string, unknown>;
  const requiredStats = ["deckIntegrity", "wheelWear", "truckTightness", "gripCondition"];
  for (const key of requiredStats) {
    if (!(key in statsObj) || typeof statsObj[key] !== "number") return false;
  }

  // Validate stat values are in range [0, 100]
  for (const key of requiredStats) {
    const val = statsObj[key] as number;
    if (val < 0 || val > 100) return false;
  }

  // Validate score and ticksAlive are non-negative numbers
  if (typeof obj.score !== "number" || obj.score < 0) return false;
  if (typeof obj.ticksAlive !== "number" || obj.ticksAlive < 0) return false;

  // Validate phase if present
  if ("phase" in obj) {
    const validPhases: GamePhase[] = ["new", "playing", "warning", "critical", "snapped", "paused"];
    if (!validPhases.includes(obj.phase as GamePhase)) return false;
  }

  return true;
}

/**
 * Creates a serializable copy of GameState suitable for localStorage storage.
 * Excludes lastTick (which should be reset on load) and creates deep copies
 * to avoid mutating the original state.
 *
 * @param state - The current game state to serialize
 * @returns A plain object containing only persistable fields
 */
export function createSerializableState(
  state: GameState & { cracksSeed?: number },
): SerializableState {
  return {
    stats: {
      deckIntegrity: state.stats.deckIntegrity,
      wheelWear: state.stats.wheelWear,
      truckTightness: state.stats.truckTightness,
      gripCondition: state.stats.gripCondition,
    },
    phase: state.phase,
    score: state.score,
    ticksAlive: state.ticksAlive,
    // Include cracksSeed if present (for deterministic crack generation on reload)
    ...(state.cracksSeed !== undefined && { cracksSeed: state.cracksSeed }),
  };
}

/**
 * Restores a GameState from serialized save data.
 * Validates the data structure before restoring. Resets lastTick to current time.
 *
 * @param data - Parsed JSON data from localStorage
 * @returns A valid GameState or null if data is invalid
 */
export function restoreFromSave(data: unknown): (GameState & { cracksSeed?: number }) | null {
  if (!isValidSaveData(data)) return null;

  const obj = data as Record<string, unknown>;
  const statsObj = obj.stats as Record<string, number>;

  const result: GameState & { cracksSeed?: number } = {
    stats: {
      deckIntegrity: Number(statsObj.deckIntegrity),
      wheelWear: Number(statsObj.wheelWear),
      truckTightness: Number(statsObj.truckTightness),
      gripCondition: Number(statsObj.gripCondition),
    },
    phase: (obj.phase as GamePhase) ?? "playing",
    score: Number(obj.score),
    ticksAlive: Number(obj.ticksAlive),
    lastTick: Date.now(), // Reset on load
  };

  // Restore cracksSeed if present in save data
  if ("cracksSeed" in obj && typeof obj.cracksSeed === "number") {
    result.cracksSeed = obj.cracksSeed;
  }

  return result;
}

/**
 * Saves the current game state to localStorage.
 * Serializes a copy of the state (not the live object) and stores as JSON.
 * Errors from localStorage (quota exceeded, disabled, etc.) are caught and logged
 * without crashing the game.
 *
 * @param state - The game state to save
 */
export function saveGame(state: GameState & { cracksSeed?: number }): void {
  try {
    if (typeof localStorage === "undefined") {
      console.warn("localStorage not available — skipping save");
      return;
    }

    const serializable = createSerializableState(state);
    const json = JSON.stringify(serializable);
    localStorage.setItem(SAVE_KEY, json);
  } catch (error) {
    // Catch all localStorage errors: QuotaExceededError, SecurityError, etc.
    console.warn("Failed to save game:", error instanceof Error ? error.message : error);
  }
}

/**
 * Loads a saved game state from localStorage.
 * Returns null if no save exists or if the saved data is invalid/corrupted.
 * Errors from localStorage are caught and logged without crashing.
 *
 * @returns A restored GameState or null if no valid save exists
 */
export function loadGame(): (GameState & { cracksSeed?: number }) | null {
  try {
    if (typeof localStorage === "undefined") {
      console.warn("localStorage not available — cannot load save");
      return null;
    }

    const stored = localStorage.getItem(SAVE_KEY);
    if (stored === null || stored === "") return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      console.warn("Corrupted save data — cannot parse JSON");
      return null;
    }

    const restored = restoreFromSave(parsed);
    if (restored === null) {
      console.warn("Invalid save data — missing required fields");
      return null;
    }

    return restored;
  } catch (error) {
    // Catch all localStorage errors: SecurityError, etc.
    console.warn("Failed to load game:", error instanceof Error ? error.message : error);
    return null;
  }
}
