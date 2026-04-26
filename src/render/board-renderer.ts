/**
 * Skateboard canvas rendering module.
 * Draws a top-down view of the skateboard with visual feedback based on stats.
 */

import type { BoardStats } from "../types/game-types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Board dimensions (in pixels)
const DECK_WIDTH = 120;
const DECK_HEIGHT = 320;
const WHEEL_RADIUS = 12; // 24px diameter
const TRUCK_WIDTH = 60;
const TRUCK_HEIGHT = 20;
const GRIP_TAPE_HEIGHT = 180;

// Color constants
const DECK_COLOR_PERFECT = "#c4956a"; // Warm wood brown at 100%
const DECK_COLOR_DAMAGED = "#3d2b1f"; // Dark burnt brown at 0%
const GRIP_TAPE_COLOR = "#1a1a1a";    // Near-black grip tape
const TRUCK_COLOR_PERFECT = "#888888"; // Silver-gray trucks
const TRUCK_COLOR_DAMAGED = "#555555"; // Darker gray when worn
const WHEEL_COLOR_PERFECT = "#f0f0f0"; // White wheels at 100%
const WHEEL_COLOR_DAMAGED = "#2a2a2a"; // Black wheels at 0%

/**
 * Interpolate between two hex colors based on a ratio (0-1).
 * @param color1 - Starting color (hex string)
 * @param color2 - Ending color (hex string)
 * @param ratio - 0 = color1, 1 = color2
 */
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Calculate the center position for the board on the canvas.
 */
function getBoardCenter(): { x: number; y: number } {
  return {
    x: CANVAS_WIDTH / 2 - DECK_WIDTH / 2,
    y: CANVAS_HEIGHT / 2 - DECK_HEIGHT / 2,
  };
}

/**
 * Draw the skateboard on the canvas.
 * Renders a top-down view with deck, grip tape, trucks, and wheels.
 * Visual appearance adjusts based on BoardStats — colors shift toward damaged look as stats drop.
 *
 * @param ctx - Canvas rendering context
 * @param stats - Current board statistics (0-100 for each stat)
 */
export function renderBoard(ctx: CanvasRenderingContext2D, stats: BoardStats): void {
  if (!ctx || !stats) {
    throw new Error("renderBoard requires valid ctx and BoardStats");
  }

  // Validate all required stat properties exist and are numbers
  const { deckIntegrity, wheelWear, truckTightness } = stats;
  if (
    typeof deckIntegrity !== "number" ||
    typeof wheelWear !== "number" ||
    typeof truckTightness !== "number"
  ) {
    throw new Error("renderBoard requires valid numeric stat properties");
  }

  // Clamp stats to valid range [0, 100] for defensive rendering
  const clampedDeckIntegrity = Math.max(0, Math.min(100, deckIntegrity));
  const clampedWheelWear = Math.max(0, Math.min(100, wheelWear));
  const clampedTruckTightness = Math.max(0, Math.min(100, truckTightness));

  const center = getBoardCenter();
  const deckX = center.x;
  const deckY = center.y;

  // Calculate color ratios (0 = perfect, 1 = damaged)
  // Deck color adjusts based on deckIntegrity
  const deckDamageRatio = 1 - clampedDeckIntegrity / 100;
  // Wheel color darkens as wheelWear decreases
  const wheelWearRatio = 1 - clampedWheelWear / 100;
  // Truck color adjusts based on truckTightness (loose trucks look darker)
  const truckWearRatio = 1 - clampedTruckTightness / 100;

  // Compute interpolated colors based on stats
  const deckColor = interpolateColor(
    DECK_COLOR_PERFECT,
    DECK_COLOR_DAMAGED,
    deckDamageRatio
  );
  const wheelColor = interpolateColor(
    WHEEL_COLOR_PERFECT,
    WHEEL_COLOR_DAMAGED,
    wheelWearRatio
  );
  const truckColor = interpolateColor(
    TRUCK_COLOR_PERFECT,
    TRUCK_COLOR_DAMAGED,
    truckWearRatio
  );

  // Draw the deck (main board body)
  ctx.fillStyle = deckColor;
  ctx.fillRect(deckX, deckY, DECK_WIDTH, DECK_HEIGHT);

  // Draw grip tape strip (top portion of deck)
  ctx.fillStyle = GRIP_TAPE_COLOR;
  const gripTapeY = deckY + (DECK_HEIGHT - GRIP_TAPE_HEIGHT) / 2;
  ctx.fillRect(deckX + 5, gripTapeY, DECK_WIDTH - 10, GRIP_TAPE_HEIGHT);

  // Draw trucks (front and rear) - color adjusts based on truckTightness stat
  const truckSpacing = DECK_HEIGHT * 0.3; // Position trucks at ~30% from each end
  const frontTruckY = deckY + truckSpacing;
  const rearTruckY = deckY + DECK_HEIGHT - truckSpacing - TRUCK_HEIGHT;
  const truckX = deckX + (DECK_WIDTH - TRUCK_WIDTH) / 2;

  ctx.fillStyle = truckColor; // Color varies with truckTightness: silver-gray (100%) to dark gray (0%)
  // Front truck (60px wide x 20px tall)
  ctx.fillRect(truckX, frontTruckY, TRUCK_WIDTH, TRUCK_HEIGHT);
  // Rear truck (60px wide x 20px tall)
  ctx.fillRect(truckX, rearTruckY, TRUCK_WIDTH, TRUCK_HEIGHT);

  // Draw wheels (4 wheels: 2 per truck)
  const wheelOffsetX = DECK_WIDTH / 2 - WHEEL_RADIUS;
  const frontWheelY = frontTruckY + TRUCK_HEIGHT / 2;
  const rearWheelY = rearTruckY + TRUCK_HEIGHT / 2;

  ctx.fillStyle = wheelColor;

  // Front-left wheel
  ctx.beginPath();
  ctx.arc(deckX - WHEEL_RADIUS, frontWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Front-right wheel
  ctx.beginPath();
  ctx.arc(deckX + DECK_WIDTH + WHEEL_RADIUS, frontWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Rear-left wheel
  ctx.beginPath();
  ctx.arc(deckX - WHEEL_RADIUS, rearWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Rear-right wheel
  ctx.beginPath();
  ctx.arc(deckX + DECK_WIDTH + WHEEL_RADIUS, rearWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}
