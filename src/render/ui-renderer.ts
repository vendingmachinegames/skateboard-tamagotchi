import type { BoardStats, CareAction } from "../types/game-types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./board-renderer";

/**
 * UI color constants for status bars.
 */
const BAR_COLOR_GREEN = "#00b400"; // Green when stat > 60%
const BAR_COLOR_ORANGE = "#ffa500"; // Orange when stat 30-60%
const BAR_COLOR_RED = "#dc2828"; // Red when stat < 30%

/**
 * UI layout constants.
 */
const STATUS_BAR_X = 10;
const STATUS_BAR_Y = 10;
const STATUS_BAR_WIDTH = 200;
const STATUS_BAR_HEIGHT = 16;
const STATUS_BAR_GAP = 4; // Gap between bars
const LABEL_PADDING = 8; // Padding between label and bar

/**
 * Button layout constants.
 */
const BUTTON_X = STATUS_BAR_X;
const BUTTON_Y = STATUS_BAR_Y + 4 * (STATUS_BAR_HEIGHT + STATUS_BAR_GAP) + 10;
const BUTTON_WIDTH = 160;
const BUTTON_HEIGHT = 28;
const BUTTON_GAP = 6;

/**
 * Score display position.
 */
const SCORE_X = CANVAS_WIDTH - 10;
const SCORE_Y = STATUS_BAR_Y + 14;

/**
 * Button hit region for click detection.
 */
export interface ButtonRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Get the appropriate color for a stat bar based on its value.
 * Green (>60%), Orange (30-60%), Red (<30%).
 *
 * @param value - Stat value (0-100)
 * @returns Color string for the bar fill
 */
export function getBarColor(value: number): string {
  // Clamp value to valid range
  const clamped = Math.max(0, Math.min(100, value));

  if (clamped > 60) return BAR_COLOR_GREEN;
  if (clamped >= 30) return BAR_COLOR_ORANGE;
  return BAR_COLOR_RED;
}

/**
 * Render status bars for all four board stats at the top of the canvas.
 * Each bar shows a label and a filled rectangle proportional to the stat value.
 * Bar color changes based on stat level: green >60%, orange 30-60%, red <30%.
 *
 * @param ctx - Canvas rendering context
 * @param stats - Current board stats
 * @param score - Current player score (default 0)
 */
export function renderStatusBar(
  ctx: CanvasRenderingContext2D,
  stats: BoardStats,
  score: number = 0,
): void {
  if (!ctx || !stats) {
    throw new Error("renderStatusBar requires valid ctx and stats parameters");
  }

  const statLabels: Array<{ key: keyof BoardStats; label: string }> = [
    { key: "deckIntegrity", label: "Deck Integrity" },
    { key: "wheelWear", label: "Wheel Wear" },
    { key: "truckTightness", label: "Truck Tightness" },
    { key: "gripCondition", label: "Grip Condition" },
  ];

  // Render each stat bar
  for (let i = 0; i < statLabels.length; i++) {
    const entry = statLabels[i]!;
    const key = entry.key;
    const label = entry.label;
    const value = stats[key];
    const y = STATUS_BAR_Y + i * (STATUS_BAR_HEIGHT + STATUS_BAR_GAP);

    // Draw background bar (empty track)
    ctx.fillStyle = "#333";
    ctx.fillRect(STATUS_BAR_X + LABEL_PADDING, y, STATUS_BAR_WIDTH, STATUS_BAR_HEIGHT);

    // Draw filled portion proportional to stat value
    const fillWidth = (Math.max(0, Math.min(100, value)) / 100) * STATUS_BAR_WIDTH;
    if (fillWidth > 0) {
      ctx.fillStyle = getBarColor(value);
      ctx.fillRect(STATUS_BAR_X + LABEL_PADDING, y, fillWidth, STATUS_BAR_HEIGHT);
    }

    // Draw label text
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, STATUS_BAR_X, y - 2);
  }

  // Render score in top-right corner
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`Score: ${score}`, SCORE_X, SCORE_Y);
}

/**
 * Render care action buttons below the status bars.
 * Buttons show the action label and a cooldown timer when on cooldown.
 * On-cooldown buttons have a dimmed appearance.
 *
 * @param ctx - Canvas rendering context
 * @param actions - Array of CareAction objects with current lastUsed timestamps
 * @param currentTime - Current timestamp in milliseconds (for cooldown calculation)
 * @returns Array of ButtonRegion objects for click detection
 */
export function renderButtons(
  ctx: CanvasRenderingContext2D,
  actions: readonly CareAction[],
  currentTime: number,
): ButtonRegion[] {
  if (!actions || actions.length === 0) {
    return [];
  }

  const regions: ButtonRegion[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]!;
    const x = BUTTON_X + (i % 2) * (BUTTON_WIDTH + BUTTON_GAP);
    const y = BUTTON_Y + Math.floor(i / 2) * (BUTTON_HEIGHT + BUTTON_GAP);

    // Calculate cooldown remaining
    const elapsed = currentTime - action.lastUsed;
    const isOnCooldown = action.lastUsed > 0 && elapsed < action.cooldown;
    const remainingMs = isOnCooldown ? action.cooldown - elapsed : 0;
    const remainingSec = Math.ceil(remainingMs / 1000);

    // Draw button background
    if (isOnCooldown) {
      ctx.fillStyle = "#555"; // Dimmed when on cooldown
    } else {
      ctx.fillStyle = "#4a90d9"; // Active blue
    }
    ctx.fillRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT);

    // Draw button border
    ctx.strokeStyle = isOnCooldown ? "#666" : "#7ab8ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT);

    // Draw button label
    ctx.fillStyle = isOnCooldown ? "#999" : "#fff";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isOnCooldown) {
      // Show cooldown timer
      ctx.fillText(`${action.label} (${remainingSec}s)`, x + BUTTON_WIDTH / 2, y + BUTTON_HEIGHT / 2);
    } else {
      // Show label with shortcut key
      const shortcutText = action.shortcut ? ` [${action.shortcut}]` : "";
      ctx.fillText(`${action.label}${shortcutText}`, x + BUTTON_WIDTH / 2, y + BUTTON_HEIGHT / 2);
    }

    // Record hit region for click detection
    regions.push({ id: action.id, x, y, w: BUTTON_WIDTH, h: BUTTON_HEIGHT });
  }

  return regions;
}
