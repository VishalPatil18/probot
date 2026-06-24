// CORS headers shared by the two public endpoints the embeddable
// widget calls cross-origin: POST /api/chat/[botId] and
// GET /api/bots/[botId]/config. The widget runs on any host (janedoe.com,
// portfolio.dev, etc.) so Allow-Origin is `*` - safe because both endpoints
// are public-by-design and the BYO key transport requires no cookies.
//
// All other API routes (knowledge upload, register, onboarding, PATCH bot,
// etc.) intentionally do NOT include these headers; they remain same-origin.

export const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-llm-api-key, x-embedding-api-key, x-llm-azure-endpoint, x-llm-azure-api-version",
  "Access-Control-Max-Age": "86400",
} as const;

// Standard preflight responder for OPTIONS handlers. Browsers expect a 2xx
// (commonly 204 No Content) and the same CORS headers as the actual response.
export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: PUBLIC_CORS_HEADERS,
  });
}
