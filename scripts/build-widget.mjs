#!/usr/bin/env node
/*
 * Build the embeddable widget into public/widget.js.
 *
 * - Reads src/widget/widget.css and inlines it via esbuild's --define so the
 *   widget needs zero runtime CSS fetches.
 * - Compiles src/widget/widget.ts as an IIFE so it self-executes when the
 *   <script> tag is loaded on the host page.
 * - Targets es2017 - wide browser support without burning bytes on
 *   transforms for syntax most browsers have shipped for years.
 * - Minified output is the deploy artifact; the un-minified copy used to
 *   exist behind a flag but Vercel never serves it, so we only build the
 *   minified one.
 */

import { readFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const entry = resolve(projectRoot, "src/widget/widget.ts");
const cssPath = resolve(projectRoot, "src/widget/widget.css");
const outfile = resolve(projectRoot, "public/widget.js");

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
  banner: { js: "/* ProBot widget · MIT · v1 */" },
});

const size = statSync(outfile).size;
const kb = (size / 1024).toFixed(2);
console.log(`✓ widget built: ${outfile} (${kb} KB)`);
if (size > 50 * 1024) {
  console.warn(
    `⚠ widget exceeded 50 KB budget (${kb} KB). Investigate before deploy.`,
  );
}
