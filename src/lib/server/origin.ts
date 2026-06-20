import { headers } from "next/headers";

// Derive the public origin (scheme + host) of the current request so
// server components can construct fully-qualified URLs that match the
// deploy environment - localhost in dev, the preview domain in preview,
// the prod domain in prod - without a build-time env var.
//
// `x-forwarded-proto` comes from upstream proxies and isn't trustworthy
// in arbitrary deployments, so we allowlist the value to `http` | `https`.
// Falls back to `https://probot.dev` if every signal is missing.
export function getOrigin(): string {
  const headersList = headers();
  const host = headersList.get("host") ?? "probot.dev";
  const rawProto = headersList.get("x-forwarded-proto");
  const proto =
    rawProto === "https" || rawProto === "http"
      ? rawProto
      : host.includes("localhost")
        ? "http"
        : "https";
  return `${proto}://${host}`;
}
