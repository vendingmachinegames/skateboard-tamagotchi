import type { GamePhase } from "../types/game-types";

/**
 * Minimal interface for elements that can receive keyboard events.
 */
interface KeyboardTarget {
  addEventListener(type: string, handler: (event: KeyboardEvent) => void): void;
  removeEventListener(type: string, handler: (event: KeyboardEvent) => void): void;
  focus(): void;
}

/**
 * Maps keyboard keys to care action IDs.
 */
const ACTION_KEY_MAP: Record<string, string> = {
  "1": "tighten-trucks",
  "2": "replace-wheels",
  "3": "sand-grip-tape",
  "4": "apply-wax",
};

/**
 * Keys that toggle game pause/unpause.
 */
const PAUSE_KEYS = new Set(["p", "P", "Escape"]);

/**
 * Game phases in which care action keys are processed.
 * Per AC: "Input only processes when game phase is 'playing'"
 * Blocked during snapped, new, paused, warning, and critical phases.
 */
const ACTION_ALLOWED_PHASES: Set<GamePhase> = new Set(["playing"]);

/**
 * Sets up keyboard event handling on a canvas element.
 *
 * Binds number keys (1-4) to care actions, and 'p'/'Escape' to pause toggle.
 * Input is gated by game phase — action keys only work during active gameplay.
 * Pause keys always work regardless of phase.
 *
 * @param canvas - The canvas element to attach the keydown listener to
 * @param onAction - Callback invoked with actionId when a care action key is pressed
 * @param onPause - Callback invoked when pause/unpause key is pressed
 * @param getPhase - Function that returns the current game phase for gating
 * @returns A cleanup function to remove the event listener
 */
export function setupKeyboard(
  canvas: KeyboardTarget,
  onAction: (actionId: string) => void,
  onPause: () => void,
  getPhase: () => GamePhase,
): () => void {
  if (!canvas) {
    throw new Error("setupKeyboard requires a valid canvas element");
  }

  // Focus canvas so it receives keyboard events
  canvas.focus();

  const handleKeydown = (event: KeyboardEvent) => {
    const key = event.key;
    const phase = getPhase();

    // Check if this is a care action key
    const actionId = ACTION_KEY_MAP[key];
    if (actionId !== undefined && ACTION_ALLOWED_PHASES.has(phase)) {
      event.preventDefault();
      onAction(actionId);
      return;
    }

    // Check if this is a pause key (always allowed)
    if (PAUSE_KEYS.has(key)) {
      event.preventDefault();
      onPause();
      return;
    }
  };

  canvas.addEventListener("keydown", handleKeydown);

  // Return cleanup function
  return () => {
    canvas.removeEventListener("keydown", handleKeydown);
  };
}
