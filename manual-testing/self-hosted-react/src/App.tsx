import { useMemo, useState } from "react";

import { ProbotBot } from "probot-self-hosted";
import type {
  ChatMessage,
  DashboardLink,
  ProbotBotConfig,
  SendMessage,
} from "probot-self-hosted";

// Test-harness page for the <ProbotBot /> component. Three runtime modes,
// no restart needed. Each mode swaps the `sendMessage` and `dashboard`
// fields on the config; everything else (persona, theme, suggested Qs)
// stays constant so you're isolating the transport under test.
type Mode = "echo" | "openai" | "dashboard";

const SUGGESTED_QUESTIONS = [
  "Who are you?",
  "What projects have you built?",
  "Are you open to new roles?",
];

export function App() {
  const [mode, setMode] = useState<Mode>("echo");
  const [captureLead, setCaptureLead] = useState(true);
  const [dashboardToken, setDashboardToken] = useState("");
  const [dashboardApiUrl, setDashboardApiUrl] = useState(
    "http://localhost:3000",
  );
  const [leadFired, setLeadFired] = useState<string | null>(null);

  const sendMessage: SendMessage = useMemo(() => {
    if (mode === "openai") return openaiSendMessage;
    if (mode === "dashboard") return echoSendMessage;
    return echoSendMessage;
  }, [mode]);

  const dashboard: DashboardLink | undefined = useMemo(() => {
    if (mode !== "dashboard") return undefined;
    if (!dashboardToken) return undefined;
    return { token: dashboardToken, apiUrl: dashboardApiUrl };
  }, [mode, dashboardToken, dashboardApiUrl]);

  // Key the widget on the mode so React fully unmounts + remounts it when
  // you flip modes — otherwise stale conversation state from the previous
  // transport bleeds into the next test.
  const widgetKey = `${mode}-${dashboardToken.length > 0 ? "linked" : "solo"}`;

  const config: ProbotBotConfig = {
    name: "Ada",
    headline: "Ask me about my work",
    themeColor: "#7c5cff",
    suggestedQuestions: SUGGESTED_QUESTIONS,
    context:
      "You are Ada, an AI recruiter assistant. Answer briefly and in a friendly tone.",
    sendMessage,
    dashboard,
    captureLead,
    onLead: async ({ email }) => {
      setLeadFired(email);
      window.setTimeout(() => setLeadFired(null), 3000);
    },
  };

  return (
    <div className="wrap">
      <h1>probot-self-hosted · React test harness</h1>
      <p className="lede">
        Toggle between three transports to exercise every code path in the
        package. The bubble in the bottom-right is the same{" "}
        <code>&lt;ProbotBot /&gt;</code> in every mode; only its{" "}
        <code>sendMessage</code> and <code>dashboard</code> fields change.
      </p>

      <fieldset className="modes">
        <legend>Transport mode</legend>
        {(["echo", "openai", "dashboard"] as const).map((m) => (
          <label key={m} className={mode === m ? "on" : ""}>
            <input
              type="radio"
              name="mode"
              value={m}
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            <strong>{modeTitle(m)}</strong>
            <span>{modeHint(m)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Options</legend>
        <label className="row">
          <input
            type="checkbox"
            checked={captureLead}
            onChange={(e) => setCaptureLead(e.target.checked)}
          />
          Enable lead capture ("Leave your email" chip in the widget)
        </label>
        {leadFired ? (
          <p className="fired">
            <code>onLead</code> fired with email: <strong>{leadFired}</strong>
          </p>
        ) : null}
      </fieldset>

      {mode === "dashboard" ? (
        <fieldset>
          <legend>Dashboard link</legend>
          <label className="row">
            Token (pbt_…)
            <input
              type="text"
              value={dashboardToken}
              onChange={(e) => setDashboardToken(e.target.value)}
              placeholder="pbt_xxxxxxxx…"
            />
          </label>
          <label className="row">
            API URL
            <input
              type="text"
              value={dashboardApiUrl}
              onChange={(e) => setDashboardApiUrl(e.target.value)}
            />
          </label>
          <p className="hint">
            Register a self-hosted bot at
            <code> /dashboard/bots/new-self-hosted</code> in the Next app to
            mint a token. Each completed chat turn POSTs to{" "}
            <code>/api/v1/bot/conversations</code>; each lead submission to{" "}
            <code>/api/v1/bot/leads</code>.
          </p>
        </fieldset>
      ) : null}

      <ProbotBot key={widgetKey} {...config} />
    </div>
  );
}

// Local echo — proves the wiring without any external dependency. Returns
// after 400 ms so the typing dots animate.
const echoSendMessage: SendMessage = async ({ messages }) => {
  const last = messages[messages.length - 1]?.content ?? "";
  await new Promise((r) => setTimeout(r, 400));
  return [
    `**Echo:** ${last}`,
    "",
    "_This is the echo transport — no LLM is wired up in this mode._",
  ].join("\n");
};

// Calls the Vite dev-server middleware (see vite.config.ts) which pipes
// through the package's `createOpenAIHandler`.
const openaiSendMessage: SendMessage = async ({ system, messages }) => {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: "unknown" }))) as {
      error?: string;
    };
    throw new Error(body.error ?? `openai_${res.status}`);
  }
  const data = (await res.json()) as { reply?: string };
  return data.reply ?? "";
};

// TypeScript unused-import guard — pin the type reference so tsc doesn't
// mark it dead code. The value is intentionally not used at runtime.
const _typeGuard: ChatMessage | null = null;
void _typeGuard;

function modeTitle(m: Mode): string {
  if (m === "echo") return "Echo";
  if (m === "openai") return "OpenAI (via Vite middleware)";
  return "Dashboard-linked (echo transport + analytics POST)";
}

function modeHint(m: Mode): string {
  if (m === "echo") return "No LLM required. Proves the widget wiring.";
  if (m === "openai")
    return "Needs OPENAI_API_KEY in the environment. Round-trips through createOpenAIHandler.";
  return "Needs the Next app on :3000 + a self-hosted bot token. Exercises reportConversation / reportLead.";
}
