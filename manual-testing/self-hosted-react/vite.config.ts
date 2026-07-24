import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { createOpenAIHandler } from "probot-self-hosted/adapters/openai";

// Vite dev-server middleware that mounts POST /api/chat and pipes
// through the package's OpenAI adapter. Runs in the same Node process as
// Vite, so there's no CORS and no second terminal to manage. Reads
// `OPENAI_API_KEY` and `OPENAI_MODEL` from the environment.
//
// Run with:
//   OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini npm run dev
//
// The Echo and Dashboard-linked modes do not hit this handler.
export default defineConfig({
  plugins: [
    react(),
    {
      name: "probot-openai-proxy",
      configureServer(server) {
        server.middlewares.use("/api/chat", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("method not allowed");
            return;
          }
          const chunks: Buffer[] = [];
          req.on("data", (chunk: Buffer) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const parsed = JSON.parse(raw) as {
                system: string;
                messages: { role: "user" | "assistant"; content: string }[];
              };
              const send = createOpenAIHandler({
                apiKey: process.env.OPENAI_API_KEY ?? "",
                model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
              });
              const reply = await send({
                system: parsed.system,
                messages: parsed.messages,
              });
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ reply }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader("content-type", "application/json");
              res.end(
                JSON.stringify({
                  error: err instanceof Error ? err.message : String(err),
                }),
              );
            }
          });
        });
      },
    },
  ],
  resolve: {
    // React needs to be de-duped when `probot-self-hosted` is installed via
    // a file: path — otherwise Vite can resolve to two copies of React and
    // hooks throw "invalid hook call".
    dedupe: ["react", "react-dom"],
  },
});
