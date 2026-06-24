#!/usr/bin/env node
/*
 * Build the publishable ProBot chatbot widget into dist/probot-chatbot.js.
 *
 * Reuses the platform's widget source (src/widget/widget.ts + widget.css) so
 * the npm package and the hosted /widget.js are always byte-for-byte the same
 * behaviour - no duplicated widget code. Mirrors scripts/build-widget.mjs.
 *
 * - Inlines widget.css via esbuild `--define` (zero runtime CSS fetch).
 * - Compiles as an IIFE so it self-executes when the <script> tag loads.
 * - Targets es2017 for broad browser support.
 */

import { readFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
// packages/probot-chatbot -> repo root is two levels up.
const repoRoot = resolve(__dirname, "..", "..");
const entry = resolve(repoRoot, "src/widget/widget.ts");
const cssPath = resolve(repoRoot, "src/widget/widget.css");
const outfile = resolve(__dirname, "dist/probot-chatbot.js");

const apiBaseDefault =
  process.env.PROBOT_WIDGET_API_BASE ?? "https://pro-bot.dev";

mkdirSync(dirname(outfile), { recursive: true });

const css = readFileSync(cssPath, "utf8");

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2017",
  legalComments: "none",
  define: {
    __WIDGET_CSS__: JSON.stringify(css),
    __API_BASE_DEFAULT__: JSON.stringify(apiBaseDefault),
  },
  banner: { js: "/* probot-chatbot · MIT · https://pro-bot.dev */" },
});

const kb = (statSync(outfile).size / 1024).toFixed(2);
console.log(`✓ probot-chatbot built: dist/probot-chatbot.js (${kb} KB)`);
