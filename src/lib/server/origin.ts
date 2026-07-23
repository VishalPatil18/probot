import { headers } from "next/headers";

export function getOrigin(): string {
  const headersList = headers();
  const host = headersList.get("host") ?? "pro-bot.dev";
  const rawProto = headersList.get("x-forwarded-proto");
  const proto =
    rawProto === "https" || rawProto === "http"
      ? rawProto
      : host.includes("localhost")
        ? "http"
        : "https";
  return `${proto}://${host}`;
}
