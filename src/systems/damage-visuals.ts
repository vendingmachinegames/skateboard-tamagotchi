/**
 * Damage visuals module for the Skateboard Tamagotchi.
 * Generates deterministic crack patterns based on deck integrity and seed,
 * and renders them on canvas as jagged lines.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../render/board-renderer";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A single crack point in 2D space.
 */
export interface CrackPoint {
  x: number;
  y: number;
}

/**
 * A crack with a starting position, a series of points forming the crack path,
 * and a severity value (0-1) indicating how severe the crack is.
 */
export interface Crack {
  startX: number;
  startY: number;
  points: CrackPoint[];
  severity: number; // 0 = hairline, 1 = full split
}

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Crack generation thresholds and parameters.
 */
export const CRACK_CONFIG = {
  noCracksThreshold: 70,    // Above this: no cracks
  hairlineMax: 70,          // Hairline range upper bound (inclusive)
  hairlineMin: 40,          // Hairline range lower bound (inclusive)
  crackedMax: 40,           // Cracked range upper bound (inclusive)
  crackedMin: 20,           // Cracked range lower bound (inclusive)
  criticalThreshold: 20,    // Below this: critical with major split
} as const;

// Board dimensions for positioning cracks within the deck area
const DECK_WIDTH = 120;
const DECK_HEIGHT = 320;
const DECK_CENTER_X = CANVAS_WIDTH / 2 - DECK_WIDTH / 2;
const DECK_CENTER_Y = CANVAS_HEIGHT / 2 - DECK_HEIGHT / 2;

// ─── Seeded PRNG (Mulberry32) ────────────────────────────────────────────────

/**
 * Mulberry32 — a fast, seeded pseudo-random number generator.
 * Produces deterministic output for a given seed.
 *
 * @param seed - Any integer seed value
 * @returns Function that returns next random float in [0, 1)
 */
function mulberry32(seed: number): () => number {
  // Ensure seed is a positive 32-bit integer
  let state = Math.abs(seed) | 0;
  return function (): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Crack Generation ────────────────────────────────────────────────────────

/**
 * Generate a single crack with jagged points.
 * The crack starts at (startX, startY) and extends through the given points.
 *
 * @param rng - Seeded random number generator
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param numPoints - Number of points in the crack path
 * @param severity - Crack severity (0-1), affects jaggedness
 * @param direction - Primary direction: 'vertical' | 'horizontal' | 'diagonal'
 */
function generateCrackPath(
  rng: () => number,
  startX: number,
  startY: number,
  numPoints: number,
  severity: number,
  direction: "vertical" | "horizontal" | "diagonal" = "vertical"
): CrackPoint[] {
  const points: CrackPoint[] = [];
  let cx = startX;
  let cy = startY;

  // Jaggedness (perpendicular jitter) increases with crack severity.
  // Low severity (0.1): ~4px jitter — hairline cracks that barely deviate from straight.
  // Medium severity (0.5): ~10px jitter — visible zigzag pattern.
  // High severity (0.9): ~16px jitter — very jagged, chaotic crack lines.
  const jaggleAmount = 3 + severity * 15;

  for (let i = 0; i < numPoints; i++) {
    // Primary direction step
    let dx = 0;
    let dy = 0;

    switch (direction) {
      case "vertical":
        dy = (DECK_HEIGHT / (numPoints + 1)) * (0.8 + rng() * 0.4);
        break;
      case "horizontal":
        dx = (DECK_WIDTH / (numPoints + 1)) * (0.8 + rng() * 0.4);
        break;
      case "diagonal":
        dx = (DECK_WIDTH / (numPoints + 1)) * (0.6 + rng() * 0.4);
        dy = (DECK_HEIGHT / (numPoints + 1)) * (0.6 + rng() * 0.4);
        break;
    }

    // Add perpendicular jitter for jaggedness
    const perpJitter = (rng() - 0.5) * 2 * jaggleAmount;
    if (direction === "vertical") {
      dx += perpJitter;
    } else {
      dy += perpJitter;
    }

    cx += dx;
    cy += dy;

    // Clamp to canvas bounds
    cx = Math.max(0, Math.min(CANVAS_WIDTH - 1, cx));
    cy = Math.max(0, Math.min(CANVAS_HEIGHT - 1, cy));

    points.push({ x: Math.round(cx), y: Math.round(cy) });
  }

  return points;
}

/**
 * Generate crack patterns based on deck integrity.
 * Uses a seeded PRNG for deterministic crack positions within a game session.
 *
 * @param deckIntegrity - Current deck integrity (0-100, clamped internally)
 * @param seed - Seed value derived from ticksAlive for determinism
 * @returns Array of Crack objects describing the damage pattern
 */
export function generateCracks(
  deckIntegrity: number,
  seed: number
): Crack[] {
  // Validate inputs
  if (typeof deckIntegrity !== "number" || isNaN(deckIntegrity)) {
    throw new Error("generateCracks requires a valid numeric deckIntegrity");
  }
  if (typeof seed !== "number" || isNaN(seed)) {
    throw new Error("generateCracks requires a valid numeric seed");
  }

  // Clamp deck integrity to valid range [0, 100]
  const clampedIntegrity = Math.max(0, Math.min(100, deckIntegrity));

  // No cracks when board is in good condition (> 70)
  if (clampedIntegrity > CRACK_CONFIG.noCracksThreshold) {
    return [];
  }

  const rng = mulberry32(seed);
  const cracks: Crack[] = [];

  // Determine crack count and severity based on integrity level
  let minCount = 0;
  let maxCount = 0;
  let baseSeverity = 0;
  let maxPointsPerCrack = 1;

  if (clampedIntegrity >= CRACK_CONFIG.hairlineMin) {
    // Hairline cracks: 1-2 thin, low-severity cracks (integrity 40-70)
    minCount = 1;
    maxCount = 2;
    baseSeverity = 0.1;
    maxPointsPerCrack = 2;
  } else if (clampedIntegrity >= CRACK_CONFIG.crackedMin) {
    // Cracked: 3-5 medium cracks with branching (integrity 20-40)
    minCount = 3;
    maxCount = 5;
    baseSeverity = 0.3;
    maxPointsPerCrack = 4;
  } else {
    // Critical: 6+ cracks with major split line (integrity < 20)
    minCount = 6;
    maxCount = 10;
    baseSeverity = 0.5;
    maxPointsPerCrack = 8;
  }

  // Scale severity inversely with integrity (lower integrity = higher severity).
  // At integrity=100: severityScale=0, so baseSeverity stays at its range minimum.
  // At integrity=0: severityScale=1, so baseSeverity doubles to maximum.
  const severityScale = 1 - clampedIntegrity / 100;
  baseSeverity *= 0.5 + severityScale * 0.5;

  // Determine number of cracks within the range for this integrity level.
  // Uses seeded RNG so same seed always produces same count.
  const crackCount = minCount + Math.floor(rng() * (maxCount - minCount + 1));

  for (let i = 0; i < crackCount; i++) {
    // Starting position within deck bounds
    const startX = DECK_CENTER_X + rng() * DECK_WIDTH;
    const startY = DECK_CENTER_Y + rng() * DECK_HEIGHT * 0.3;

    // Number of points varies with severity level
    const numPoints = 1 + Math.floor(rng() * maxPointsPerCrack);

    // Individual crack severity varies around base
    const crackSeverity = Math.min(
      1,
      Math.max(0, baseSeverity + (rng() - 0.3) * 0.3)
    );

    // Direction: mostly vertical for deck cracks, some diagonal
    const dirRoll = rng();
    let direction: "vertical" | "horizontal" | "diagonal";
    if (dirRoll < 0.6) {
      direction = "vertical";
    } else if (dirRoll < 0.85) {
      direction = "diagonal";
    } else {
      direction = "horizontal";
    }

    const points = generateCrackPath(
      rng,
      startX,
      startY,
      numPoints,
      crackSeverity,
      direction
    );

    cracks.push({ startX, startY, points, severity: Math.round(crackSeverity * 100) / 100 });
  }

  // For critical level (< 20), ensure there is a major split line
  if (clampedIntegrity < CRACK_CONFIG.criticalThreshold) {
    const splitSeverity = 0.7 + severityScale * 0.3; // 0.7 to 1.0
    const splitStartX = DECK_CENTER_X + DECK_WIDTH / 2 + (rng() - 0.5) * 20;
    const splitStartY = DECK_CENTER_Y + rng() * DECK_HEIGHT * 0.2;
    const splitPoints = generateCrackPath(
      rng,
      splitStartX,
      splitStartY,
      5 + Math.floor(rng() * 4), // 5-8 points for a long crack
      splitSeverity,
      "vertical"
    );

    // Insert the major crack at a random position in the array
    const insertPos = Math.floor(rng() * (cracks.length + 1));
    cracks.splice(insertPos, 0, {
      startX: splitStartX,
      startY: splitStartY,
      points: splitPoints,
      severity: Math.round(splitSeverity * 100) / 100,
    });
  }

  return cracks;
}

// ─── Crack Rendering ────────────────────────────────────────────────────────

/**
 * Render crack patterns on the canvas.
 * Draws each crack as a jagged line using beginPath/moveTo/lineTo/stroke.
 * Line width and color vary based on crack severity.
 * The jaggedness comes from the crack POINTS being non-linear (generated by
 * generateCrackPath with perpendicular jitter), not from renderCracks itself.
 *
 * @param ctx - Canvas rendering context
 * @param cracks - Array of Crack objects to render
 */
export function renderCracks(
  ctx: CanvasRenderingContext2D,
  cracks: Crack[]
): void {
  if (!ctx || !cracks) {
    throw new Error("renderCracks requires valid ctx and cracks array");
  }

  if (cracks.length === 0) {
    return;
  }

  for (const crack of cracks) {
    ctx.save();

    // Line width scales with severity: thin (1px) to thick (4px)
    ctx.lineWidth = 1 + crack.severity * 3;

    // Color shifts from dark brown (low severity) to black (high severity)
    const r = Math.round(60 - crack.severity * 60);   // 60 -> 0
    const g = Math.round(40 - crack.severity * 40);   // 40 -> 0
    const b = Math.round(30 - crack.severity * 30);   // 30 -> 0
    ctx.strokeStyle = `rgb(${r},${g},${b})`;

    ctx.beginPath();
    ctx.moveTo(crack.startX, crack.startY);

    for (const point of crack.points) {
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
    ctx.restore();
  }
}
