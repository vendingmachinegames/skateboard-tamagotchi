/// <reference types="bun" />

import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** Strip JS-style comments from JSONC files so they can be parsed */
function parseJsonc(text: string): unknown {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/(?<!")\/\/.*/g, "") // line comments (naive, but works for tsconfig)
    .replace(/,+\s*,/g, ",") // clean up double commas from removed trailing commas
    .replace(/,\s*([}\]])/g, "$1"); // remove trailing commas
  return JSON.parse(stripped);
}

describe("Project Structure", () => {
  describe("package.json", () => {
    it("should exist", () => {
      expect(existsSync(join(ROOT, "package.json"))).toBe(true);
    });

    it("should have typescript as a dependency or peerDependency", () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
      const hasTsDev = pkg.devDependencies?.typescript !== undefined;
      const hasTsPeer = pkg.peerDependencies?.typescript !== undefined;
      const hasTsDeps = pkg.dependencies?.typescript !== undefined;
      expect(hasTsDev || hasTsPeer || hasTsDeps).toBe(true);
    });

    it("should use Bun as runtime (has @types/bun or bun reference)", () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
      // Bun projects typically have @types/bun in devDependencies
      const hasBunTypes =
        pkg.devDependencies?.["@types/bun"] !== undefined ||
        pkg.dependencies?.["@types/bun"] !== undefined;
      expect(hasBunTypes).toBe(true);
    });

    it("should have type-check script", () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
      expect(pkg.scripts?.["type-check"]).toBeDefined();
    });

    it("should have test script", () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
      expect(pkg.scripts?.test).toBeDefined();
    });

    it("should use ESM module type", () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
      expect(pkg.type).toBe("module");
    });
  });

  describe("tsconfig.json", () => {
    it("should exist", () => {
      expect(existsSync(join(ROOT, "tsconfig.json"))).toBe(true);
    });

    it("should target ES2022", () => {
      const config = parseJsonc(
        readFileSync(join(ROOT, "tsconfig.json"), "utf-8")
      ) as Record<string, unknown>;
      expect((config.compilerOptions as Record<string, string>).target).toBe(
        "ES2022"
      );
    });

    it("should have strict mode enabled", () => {
      const config = parseJsonc(
        readFileSync(join(ROOT, "tsconfig.json"), "utf-8")
      ) as Record<string, unknown>;
      expect((config.compilerOptions as Record<string, boolean>).strict).toBe(
        true
      );
    });

    it("should have noEmit enabled", () => {
      const config = parseJsonc(
        readFileSync(join(ROOT, "tsconfig.json"), "utf-8")
      ) as Record<string, unknown>;
      expect((config.compilerOptions as Record<string, boolean>).noEmit).toBe(
        true
      );
    });
  });

  describe("src/game/Game.ts", () => {
    it("should exist", () => {
      expect(existsSync(join(ROOT, "src/game/Game.ts"))).toBe(true);
    });

    it("should export a Game class", () => {
      const content = readFileSync(
        join(ROOT, "src/game/Game.ts"),
        "utf-8"
      );
      // Verify the file exports a Game class
      expect(content).toMatch(/export\s+(class|const)\s+Game/);
    });

    it("should contain start, stop, and tick methods", () => {
      const content = readFileSync(
        join(ROOT, "src/game/Game.ts"),
        "utf-8"
      );
      expect(content).toMatch(/start\s*\(/);
      expect(content).toMatch(/stop\s*\(/);
      expect(content).toMatch(/tick\s*\(/);
    });

    it("should use requestAnimationFrame for the game loop", () => {
      const content = readFileSync(
        join(ROOT, "src/game/Game.ts"),
        "utf-8"
      );
      expect(content).toContain("requestAnimationFrame");
    });
  });

  describe("src/index.ts", () => {
    it("should exist", () => {
      expect(existsSync(join(ROOT, "src/index.ts"))).toBe(true);
    });

    it("should import and instantiate the Game class", () => {
      const content = readFileSync(join(ROOT, "src/index.ts"), "utf-8");
      expect(content).toMatch(/import.*Game/);
      expect(content).toMatch(/new\s+Game\s*\(/);
    });

    it("should be runnable via bun without errors", (done) => {
      const child = spawn("bun", ["run", "src/index.ts"], {
        cwd: ROOT,
        timeout: 5000,
        env: { ...process.env, NODE_ENV: "test" },
      });

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        expect(code).toBe(0);
        done();
      });

      child.on("error", (err) => {
        throw new Error(err.message);
      });
    }, 10000);
  });

  describe("public/index.html", () => {
    it("should exist", () => {
      expect(existsSync(join(ROOT, "public/index.html"))).toBe(true);
    });

    it("should contain a canvas element with id 'game-canvas'", () => {
      const html = readFileSync(join(ROOT, "public/index.html"), "utf-8");
      expect(html).toContain('id="game-canvas"');
    });

    it("should have canvas width of 800", () => {
      const html = readFileSync(join(ROOT, "public/index.html"), "utf-8");
      expect(html).toContain('width="800"');
    });

    it("should have canvas height of 600", () => {
      const html = readFileSync(join(ROOT, "public/index.html"), "utf-8");
      expect(html).toContain('height="600"');
    });

    it("should be valid HTML with DOCTYPE", () => {
      const html = readFileSync(join(ROOT, "public/index.html"), "utf-8");
      expect(html).toMatch(/<!DOCTYPE\s+html>/i);
    });

    it("should import the index.ts entry point via script tag", () => {
      const html = readFileSync(join(ROOT, "public/index.html"), "utf-8");
      expect(html).toMatch(/type=["']module["']/);
      expect(html).toContain("src/index.ts");
    });
  });
});
