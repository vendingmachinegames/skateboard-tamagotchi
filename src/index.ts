import { Game } from "./game/Game";

// Get canvas reference — may be null in non-browser environments (tests, server)
const canvas =
  typeof document !== "undefined"
    ? document.getElementById("game-canvas")
    : null;

const game = new Game(canvas as HTMLCanvasElement | null);
game.start();

export default game;
