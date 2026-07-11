import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });

const shared = {
  bundle: true,
  sourcemap: true,
  target: ["es2020"],
  platform: "neutral",
  external: ["react", "react-dom"],
  loader: { ".css": "text" },
  logLevel: "info",
};

const entries = [
  { in: "src/index.ts", outBase: "dist/index" },
  { in: "src/vanilla.ts", outBase: "dist/vanilla" },
  { in: "src/adapters/openai.ts", outBase: "dist/adapters/openai" },
];

for (const e of entries) {
  await build({ ...shared, entryPoints: [e.in], outfile: `${e.outBase}.mjs`, format: "esm" });
  await build({ ...shared, entryPoints: [e.in], outfile: `${e.outBase}.cjs`, format: "cjs" });
}

// Vanilla IIFE for <script src> use. React is bundled here so the script
// works standalone in any page that has neither React nor a bundler.
await build({
  entryPoints: ["src/vanilla.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ["es2020"],
  platform: "browser",
  format: "iife",
  globalName: "ProbotSelfHosted",
  outfile: "dist/probot-self-hosted.iife.js",
  loader: { ".css": "text" },
  logLevel: "info",
});

execSync("tsc -p tsconfig.json", { stdio: "inherit" });
