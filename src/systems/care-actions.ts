import type { BoardStats, GameState, CareAction } from "../types/game-types";

/**
 * Default care actions for the skateboard tamagotchi.
 * Each action restores specific stats and has a cooldown period.
 */
export const CARE_ACTIONS: ReadonlyArray<CareAction> = [
  {
    id: "tighten-trucks",
    label: "Tighten Trucks",
    shortcut: "1",
    cooldown: 8000, // 8 seconds
    lastUsed: 0,
    effects: { truckTightness: 25 },
  },
  {
    id: "replace-wheels",
    label: "Replace Wheels",
    shortcut: "2",
    cooldown: 15000, // 15 seconds
    lastUsed: 0,
    effects: { wheelWear: 30 },
  },
  {
    id: "sand-grip-tape",
    label: "Sand Grip Tape",
    shortcut: "3",
    cooldown: 10000, // 10 seconds
    lastUsed: 0,
    effects: { gripCondition: 25 },
  },
  {
    id: "apply-wax",
    label: "Apply Wax",
    shortcut: "", // No shortcut key — reserved for future expansion
    cooldown: 20000, // 20 seconds
    lastUsed: 0,
    // +15 to ALL stats (deck, wheels, trucks, grip)
    effects: {
      deckIntegrity: 15,
      wheelWear: 15,
      truckTightness: 15,
      gripCondition: 15,
    },
  },
];

/**
 * Check if a care action can be performed based on its cooldown.
 *
 * @param actionId - The ID of the action to check
 * @param actions - Array of CareAction objects (mutable for lastUsed tracking)
 * @param currentTime - Current timestamp in milliseconds
 * @returns true if the action is not on cooldown, false otherwise
 */
export function canPerformAction(
  actionId: string,
  actions: readonly CareAction[],
  currentTime: number,
): boolean {
  const action = actions.find((a) => a.id === actionId);
  if (!action) return false;

  // Never used (lastUsed = 0) means always performable
  if (action.lastUsed === 0) return true;

  // Check if cooldown has expired
  const elapsed = currentTime - action.lastUsed;
  return elapsed >= action.cooldown;
}

/**
 * Perform a care action on the game state.
 * Pure with respect to GameState — returns a new GameState without mutating the input.
 *
 * Applies stat effects (capped at 100), increments score by 10,
 * and updates the lastUsed timestamp on the matching action for cooldown tracking.
 *
 * @param actionId - The ID of the action to perform
 * @param state - Current game state
 * @param currentTime - Current timestamp in milliseconds (used for lastUsed)
 * @param actions - Mutable array of CareAction objects. Defaults to CARE_ACTIONS.
 *                  The matching action's lastUsed is updated in-place.
 * @returns New GameState with applied effects and incremented score
 */
export function performAction(
  actionId: string,
  state: GameState,
  currentTime: number,
  actions: CareAction[] = CARE_ACTIONS as unknown as CareAction[],
): GameState {
  const actionIndex = actions.findIndex((a) => a.id === actionId);
  if (actionIndex === -1) {
    // Unknown action — return unchanged state
    return { ...state };
  }

  const action = actions[actionIndex]!;
  const effects = action.effects;

  // Apply stat effects, capped at 100
  const newStats: BoardStats = { ...state.stats };
  for (const [statName, value] of Object.entries(effects)) {
    if (value !== undefined) {
      const key = statName as keyof BoardStats;
      newStats[key] = Math.min(100, (newStats[key] as number) + value);
    }
  }

  // Update lastUsed on the action for cooldown tracking
  actions[actionIndex] = { ...action, lastUsed: currentTime } as CareAction;

  return {
    ...state,
    stats: newStats,
    score: state.score + 10,
  };
}
