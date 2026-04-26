/**
 * Button hit region for click detection.
 * Matches the output of renderButtons() from ui-renderer.ts.
 */
export interface ButtonRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Minimal interface for elements that can receive click events.
 */
interface ClickTarget {
  addEventListener(type: string, handler: (event: MouseEvent) => void): void;
  removeEventListener(type: string, handler: (event: MouseEvent) => void): void;
}

/**
 * Sets up mouse click detection on a canvas element for UI buttons.
 *
 * Checks if click coordinates fall within any button hit region.
 * First matching button (by array order) wins if regions overlap.
 *
 * @param canvas - The canvas element to attach the click listener to
 * @param buttons - Array of button hit regions to check against
 * @param onClick - Callback invoked with button id when a button is clicked
 * @returns A cleanup function to remove the event listener
 */
export function setupClick(
  canvas: ClickTarget,
  buttons: ButtonRegion[],
  onClick: (buttonId: string) => void,
): () => void {
  if (!canvas) {
    throw new Error("setupClick requires a valid canvas element");
  }

  const handleClick = (event: MouseEvent) => {
    const x = event.clientX;
    const y = event.clientY;

    // Check each button region for a hit (first match wins)
    // Skip buttons with non-positive dimensions (invalid regions)
    for (const btn of buttons) {
      if (
        btn.w > 0 &&
        btn.h > 0 &&
        x >= btn.x &&
        x <= btn.x + btn.w &&
        y >= btn.y &&
        y <= btn.y + btn.h
      ) {
        onClick(btn.id);
        return;
      }
    }
  };

  canvas.addEventListener("click", handleClick);

  // Return cleanup function
  return () => {
    canvas.removeEventListener("click", handleClick);
  };
}
