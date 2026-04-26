/**
 * Snap animation and game over screen rendering for the Skateboard Tamagotchi.
 * Handles the dramatic board snap animation when deck integrity reaches 0,
 * and the game over screen with score, time survived, and Play Again button.
 */

import type { BoardStats } from "../types/game-types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./board-renderer";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Duration of the snap animation in milliseconds (~2 seconds). */
export const SNAP_ANIMATION_DURATION = 2000;

// Board dimensions (matching board-renderer.ts)
const DECK_WIDTH = 120;
const DECK_HEIGHT = 320;
const WHEEL_RADIUS = 12;
const TRUCK_WIDTH = 60;
const TRUCK_HEIGHT = 20;
const GRIP_TAPE_HEIGHT = 180;

// Color constants (matching board-renderer.ts)
const DECK_COLOR_PERFECT = "#c4956a";
const DECK_COLOR_DAMAGED = "#3d2b1f";
const GRIP_TAPE_COLOR = "#1a1a1a";
const TRUCK_COLOR_PERFECT = "#888888";
const WHEEL_COLOR_PERFECT = "#f0f0f0";

// Animation constants
const MAX_SEPARATION_X = 60;   // Max horizontal separation between halves
const MAX_ROTATION_ANGLE = 0.15; // Max rotation in radians (~8.6 degrees)

// Game over screen constants
const GAME_OVER_BG_COLOR = "rgba(0, 0, 0, 0.75)";
const TITLE_FONT = "bold 48px monospace";
const INFO_FONT = "24px monospace";
const BUTTON_FONT = "bold 20px monospace";
const PLAY_AGAIN_BG = "#4a90d9";
const PLAY_AGAIN_BORDER = "#ffffff";
const PLAY_AGAIN_WIDTH = 200;
const PLAY_AGAIN_HEIGHT = 50;

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Check if the snap should be triggered based on deck integrity.
 * @param deckIntegrity - Current deck integrity value (0-100)
 * @returns True if deck integrity is at or below 0
 */
export function isSnapTriggered(deckIntegrity: number): boolean {
  return deckIntegrity <= 0;
}

/**
 * Format milliseconds into a human-readable M:SS time string.
 * Minutes are not zero-padded, seconds are always two digits.
 * @param milliseconds - Time in milliseconds
 * @returns Formatted time string (e.g., "1:30", "0:45", "61:01")
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Ease-in function for dramatic animation effect.
 * Starts slow and accelerates toward the end.
 * @param t - Normalized time value (0-1)
 * @returns Eased value (0-1), starts slow then accelerates
 */
function easeIn(t: number): number {
  return t * t;
}

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

// ─── Board Half Drawing ────────────────────────────────────────────────────────

/**
 * Draw one half of the skateboard (deck + grip tape + truck + wheels).
 * Used by renderSnapAnimation to draw separated halves.
 * @param ctx - Canvas rendering context
 * @param half - Which half to draw: 'top' or 'bottom'
 * @param stats - Board statistics for color interpolation
 */
function drawBoardHalf(
  ctx: CanvasRenderingContext2D,
  half: "top" | "bottom",
  stats: BoardStats
): void {
  const deckDamageRatio = 1 - Math.max(0, Math.min(100, stats.deckIntegrity)) / 100;
  const wheelWearRatio = 1 - Math.max(0, Math.min(100, stats.wheelWear)) / 100;

  const deckColor = interpolateColor(DECK_COLOR_PERFECT, DECK_COLOR_DAMAGED, deckDamageRatio);
  const wheelColor = interpolateColor(WHEEL_COLOR_PERFECT, "#2a2a2a", wheelWearRatio);

  // Half dimensions
  const halfHeight = DECK_HEIGHT / 2;
  const halfY = half === "top" ? 0 : halfHeight;

  // Draw deck portion
  ctx.fillStyle = deckColor;
  ctx.fillRect(0, halfY, DECK_WIDTH, halfHeight);

  // Draw grip tape (centered on the half if it overlaps)
  const gripTapeCenterY = DECK_HEIGHT / 2;
  const gripTapeStartY = gripTapeCenterY - GRIP_TAPE_HEIGHT / 2;
  const gripTapeEndY = gripTapeCenterY + GRIP_TAPE_HEIGHT / 2;

  if (half === "top" && gripTapeEndY > 0) {
    ctx.fillStyle = GRIP_TAPE_COLOR;
    const startY = Math.max(halfY, gripTapeStartY);
    const endY = Math.min(halfY + halfHeight, gripTapeEndY);
    if (endY > startY) {
      ctx.fillRect(5, startY, DECK_WIDTH - 10, endY - startY);
    }
  } else if (half === "bottom" && gripTapeStartY < halfHeight) {
    ctx.fillStyle = GRIP_TAPE_COLOR;
    const startY = Math.max(halfY, gripTapeStartY);
    const endY = Math.min(halfY + halfHeight, gripTapeEndY);
    if (endY > startY) {
      ctx.fillRect(5, startY, DECK_WIDTH - 10, endY - startY);
    }
  }

  // Draw truck for this half
  const truckSpacing = DECK_HEIGHT * 0.3;
  const truckX = (DECK_WIDTH - TRUCK_WIDTH) / 2;

  if (half === "top") {
    // Front truck is in the top half
    const frontTruckY = truckSpacing;
    ctx.fillStyle = "#888888";
    ctx.fillRect(truckX, frontTruckY, TRUCK_WIDTH, TRUCK_HEIGHT);

    // Front wheels (2 per truck)
    const frontWheelY = frontTruckY + TRUCK_HEIGHT / 2;
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(-WHEEL_RADIUS, frontWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(DECK_WIDTH + WHEEL_RADIUS, frontWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rear truck is in the bottom half
    const rearTruckLocalY = DECK_HEIGHT - truckSpacing - TRUCK_HEIGHT - halfHeight;
    ctx.fillStyle = "#888888";
    ctx.fillRect(truckX, halfY + rearTruckLocalY, TRUCK_WIDTH, TRUCK_HEIGHT);

    // Rear wheels (2 per truck)
    const rearWheelLocalY = DECK_HEIGHT - truckSpacing - TRUCK_HEIGHT / 2 - halfHeight;
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(-WHEEL_RADIUS, halfY + rearWheelLocalY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(DECK_WIDTH + WHEEL_RADIUS, halfY + rearWheelLocalY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Snap Animation ───────────────────────────────────────────────────────────

/**
 * Draw a board half at absolute canvas coordinates (no transforms).
 * Used for the non-animated case where halves are drawn directly.
 */
function drawBoardHalfAt(
  ctx: CanvasRenderingContext2D,
  half: "top" | "bottom",
  stats: BoardStats,
  offsetX: number,
  offsetY: number
): void {
  const deckDamageRatio = 1 - Math.max(0, Math.min(100, stats.deckIntegrity)) / 100;
  const wheelWearRatio = 1 - Math.max(0, Math.min(100, stats.wheelWear)) / 100;

  const deckColor = interpolateColor(DECK_COLOR_PERFECT, DECK_COLOR_DAMAGED, deckDamageRatio);
  const wheelColor = interpolateColor(WHEEL_COLOR_PERFECT, "#2a2a2a", wheelWearRatio);

  // Half dimensions
  const halfHeight = DECK_HEIGHT / 2;
  const halfY = half === "top" ? 0 : halfHeight;

  // Draw deck portion at offset position
  ctx.fillStyle = deckColor;
  ctx.fillRect(offsetX, offsetY + halfY, DECK_WIDTH, halfHeight);

  // Draw grip tape (centered on the half if it overlaps)
  const gripTapeCenterY = DECK_HEIGHT / 2;
  const gripTapeStartY = gripTapeCenterY - GRIP_TAPE_HEIGHT / 2;
  const gripTapeEndY = gripTapeCenterY + GRIP_TAPE_HEIGHT / 2;

  if (half === "top" && gripTapeEndY > 0) {
    ctx.fillStyle = GRIP_TAPE_COLOR;
    const startY = Math.max(halfY, gripTapeStartY);
    const endY = Math.min(halfY + halfHeight, gripTapeEndY);
    if (endY > startY) {
      ctx.fillRect(offsetX + 5, offsetY + startY, DECK_WIDTH - 10, endY - startY);
    }
  } else if (half === "bottom" && gripTapeStartY < halfHeight) {
    ctx.fillStyle = GRIP_TAPE_COLOR;
    const startY = Math.max(halfY, gripTapeStartY);
    const endY = Math.min(halfY + halfHeight, gripTapeEndY);
    if (endY > startY) {
      ctx.fillRect(offsetX + 5, offsetY + startY, DECK_WIDTH - 10, endY - startY);
    }
  }

  // Draw truck for this half
  const truckSpacing = DECK_HEIGHT * 0.3;
  const truckX = (DECK_WIDTH - TRUCK_WIDTH) / 2;

  if (half === "top") {
    const frontTruckY = truckSpacing;
    ctx.fillStyle = "#888888";
    ctx.fillRect(offsetX + truckX, offsetY + frontTruckY, TRUCK_WIDTH, TRUCK_HEIGHT);

    const frontWheelY = frontTruckY + TRUCK_HEIGHT / 2;
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(offsetX - WHEEL_RADIUS, offsetY + frontWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(offsetX + DECK_WIDTH + WHEEL_RADIUS, offsetY + frontWheelY, WHEEL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const rearTruckLocalY = DECK_HEIGHT - truckSpacing - TRUCK_HEIGHT - halfHeight;
    ctx.fillStyle = "#888888";
    ctx.fillRect(
      offsetX + truckX,
      offsetY + halfY + rearTruckLocalY,
      TRUCK_WIDTH,
      TRUCK_HEIGHT
    );

    const rearWheelLocalY = DECK_HEIGHT - truckSpacing - TRUCK_HEIGHT / 2 - halfHeight;
    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(
      offsetX - WHEEL_RADIUS,
      offsetY + halfY + rearWheelLocalY,
      WHEEL_RADIUS,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      offsetX + DECK_WIDTH + WHEEL_RADIUS,
      offsetY + halfY + rearWheelLocalY,
      WHEEL_RADIUS,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

/**
 * Render the board snap animation at a given progress point.
 * At progress 0: board is intact (no separation).
 * At progress 0.5: crack widens, halves start separating with slight rotation.
 * At progress 1.0: halves fully separated with maximum distance and rotation.
 *
 * Uses ease-in easing for dramatic effect — slow start, accelerating separation.
 *
 * @param ctx - Canvas rendering context
 * @param progress - Animation progress (0-1). Must be between 0 and 1 inclusive.
 */
export function renderSnapAnimation(
  ctx: CanvasRenderingContext2D,
  progress: number
): void {
  if (!ctx) {
    throw new Error("renderSnapAnimation requires a valid canvas context");
  }

  // Validate progress
  if (typeof progress !== "number" || !Number.isFinite(progress)) {
    throw new Error(
      `renderSnapAnimation requires a finite number for progress, got: ${progress}`
    );
  }
  if (progress < 0 || progress > 1) {
    throw new Error(
      `renderSnapAnimation progress must be between 0 and 1, got: ${progress}`
    );
  }

  // Apply ease-in easing to progress for dramatic effect
  const easedProgress = easeIn(progress);

  // Calculate separation values based on eased progress
  const sepX = easedProgress * MAX_SEPARATION_X;
  const sepY = easedProgress * (MAX_SEPARATION_X / 2); // Vertical spread is half the horizontal
  const rotation = easedProgress * MAX_ROTATION_ANGLE;

  // Board center position on canvas
  const boardCenterX = CANVAS_WIDTH / 2 - DECK_WIDTH / 2;
  const boardCenterY = CANVAS_HEIGHT / 2 - DECK_HEIGHT / 2;
  const splitY = boardCenterY + DECK_HEIGHT / 2; // Split line at deck midpoint

  // Damaged stats for snapped board rendering
  const snappedStats: BoardStats = {
    deckIntegrity: 0,
    wheelWear: 20,
    truckTightness: 15,
    gripCondition: 10,
  };

  if (progress === 0) {
    // At progress 0: draw board intact with no transforms
    drawBoardHalfAt(ctx, "top", snappedStats, boardCenterX, boardCenterY);
    drawBoardHalfAt(ctx, "bottom", snappedStats, boardCenterX, boardCenterY);
    return;
  }

  // Draw top half (moves up and left with counter-clockwise rotation)
  ctx.save();
  ctx.translate(-sepX, -sepY);
  ctx.rotate(-rotation);

  drawBoardHalfAt(ctx, "top", snappedStats, boardCenterX, splitY);

  ctx.restore();

  // Draw bottom half (moves down and right with clockwise rotation)
  ctx.save();
  ctx.translate(sepX, sepY);
  ctx.rotate(rotation);

  drawBoardHalfAt(ctx, "bottom", snappedStats, boardCenterX, splitY);

  ctx.restore();

  // Draw crack line between halves (widens with progress)
  const crackWidth = easedProgress * 8;
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = crackWidth;
  ctx.beginPath();

  // Draw the split line with slight jaggedness
  const startX = boardCenterX - crackWidth / 2;
  const endX = boardCenterX + DECK_WIDTH + crackWidth / 2;

  ctx.moveTo(startX, splitY);
  // Add a few jagged points for the crack appearance
  const midX1 = boardCenterX + DECK_WIDTH * 0.33;
  const midX2 = boardCenterX + DECK_WIDTH * 0.66;
  ctx.lineTo(midX1, splitY + (easedProgress > 0.3 ? 3 : 0));
  ctx.lineTo(midX2, splitY - (easedProgress > 0.5 ? 4 : 0));
  ctx.lineTo(endX, splitY);

  ctx.stroke();
  ctx.restore();
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

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
 * Render the game over screen after the snap animation completes.
 * Displays "YOUR BOARD SNAPPED" title, final score, time survived,
 * and a "Play Again" button for restarting the game.
 *
 * @param ctx - Canvas rendering context
 * @param score - Final score to display
 * @param ticksAlive - Total time alive in milliseconds (formatted as M:SS)
 * @returns ButtonRegion for the Play Again button, or null if not rendered
 */
export function renderGameOver(
  ctx: CanvasRenderingContext2D,
  score: number,
  ticksAlive: number
): ButtonRegion | null {
  if (!ctx) {
    throw new Error("renderGameOver requires a valid canvas context");
  }

  // Draw semi-transparent dark background overlay
  ctx.fillStyle = GAME_OVER_BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Title: "YOUR BOARD SNAPPED" — centered near top
  ctx.save();
  ctx.font = TITLE_FONT;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleY = CANVAS_HEIGHT * 0.3;
  ctx.fillText("YOUR BOARD SNAPPED", CANVAS_WIDTH / 2, titleY);

  // Score display
  ctx.font = INFO_FONT;
  ctx.fillStyle = "#cccccc";
  const scoreY = CANVAS_HEIGHT * 0.45;
  ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, scoreY);

  // Time survived
  const timeString = formatTime(ticksAlive);
  const timeY = CANVAS_HEIGHT * 0.55;
  ctx.fillText(`Time Survived: ${timeString}`, CANVAS_WIDTH / 2, timeY);

  ctx.restore();

  // Play Again button — centered horizontally, in lower half of canvas
  const buttonX = CANVAS_WIDTH / 2 - PLAY_AGAIN_WIDTH / 2;
  const buttonY = CANVAS_HEIGHT * 0.7;

  // Button background
  ctx.fillStyle = PLAY_AGAIN_BG;
  ctx.fillRect(buttonX, buttonY, PLAY_AGAIN_WIDTH, PLAY_AGAIN_HEIGHT);

  // Button border
  ctx.strokeStyle = PLAY_AGAIN_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(buttonX, buttonY, PLAY_AGAIN_WIDTH, PLAY_AGAIN_HEIGHT);

  // Button text (no save/restore — last thing drawn)
  ctx.font = BUTTON_FONT;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "Play Again",
    CANVAS_WIDTH / 2,
    buttonY + PLAY_AGAIN_HEIGHT / 2
  );

  // Return button hit region for click detection
  return {
    id: "play-again",
    x: buttonX,
    y: buttonY,
    w: PLAY_AGAIN_WIDTH,
    h: PLAY_AGAIN_HEIGHT,
  };
}
