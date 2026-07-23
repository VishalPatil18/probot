export const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-llm-api-key, x-embedding-api-key, x-llm-azure-endpoint, x-llm-azure-api-version",
  "Access-Control-Max-Age": "86400",
} as const;

export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: PUBLIC_CORS_HEADERS,
  });
}
