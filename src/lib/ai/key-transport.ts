const HEADER_NAME = "x-llm-api-key";
const EMBEDDING_HEADER_NAME = "x-embedding-api-key";
const AZURE_ENDPOINT_HEADER = "x-llm-azure-endpoint";
const AZURE_API_VERSION_HEADER = "x-llm-azure-api-version";
const MIN_LEN = 8;
const MAX_LEN = 256;
const MAX_ENDPOINT_LEN = 512;
const MAX_API_VERSION_LEN = 64;

export type KeyTransportErrorReason =
  | "missing"
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_endpoint";

export class KeyTransportError extends Error {
  readonly reason: KeyTransportErrorReason;

  constructor(reason: KeyTransportErrorReason, message: string) {
    super(message);
    this.name = "KeyTransportError";
    this.reason = reason;
  }
}

export function readApiKey(headers: Headers): string {
  const raw = headers.get(HEADER_NAME);
  if (raw === null) {
    throw new KeyTransportError("missing", `Missing ${HEADER_NAME} header`);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new KeyTransportError("empty", `${HEADER_NAME} header is empty`);
  }
  if (trimmed.length < MIN_LEN) {
    throw new KeyTransportError(
      "too_short",
      `${HEADER_NAME} header is shorter than ${MIN_LEN} characters`,
    );
  }
  if (trimmed.length > MAX_LEN) {
    throw new KeyTransportError(
      "too_long",
      `${HEADER_NAME} header exceeds ${MAX_LEN} characters`,
    );
  }
  return trimmed;
}

// RAG: the OpenAI key used for embedding generation and chat-time
// query embedding. Independent of `x-llm-api-key` because the user's chat
// provider may not be OpenAI. Returns null when the header is absent - the
// caller treats this as "skip embeddings, fall back to full-context". Only
// throws when the header is present but malformed (length out of range).
export function readEmbeddingApiKey(headers: Headers): string | null {
  const raw = headers.get(EMBEDDING_HEADER_NAME);
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_LEN) {
    throw new KeyTransportError(
      "too_short",
      `${EMBEDDING_HEADER_NAME} header is shorter than ${MIN_LEN} characters`,
    );
  }
  if (trimmed.length > MAX_LEN) {
    throw new KeyTransportError(
      "too_long",
      `${EMBEDDING_HEADER_NAME} header exceeds ${MAX_LEN} characters`,
    );
  }
  return trimmed;
}

export function redactKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export type AzureCreds = {
  endpoint: string;
  apiVersion: string | null;
};

// Pull the two Azure-specific headers (endpoint + optional apiVersion).
// Returns null when no endpoint header is present - the chat route only
// requires these for `users.llmProvider === "azure"`, so absence is not
// fatal at this layer. Throws `KeyTransportError("invalid_endpoint")`
// if endpoint is present but malformed (empty, oversized, or not HTTPS).
export function readAzureCreds(headers: Headers): AzureCreds | null {
  const rawEndpoint = headers.get(AZURE_ENDPOINT_HEADER);
  if (rawEndpoint === null) return null;

  const endpoint = rawEndpoint.trim();
  if (endpoint.length === 0) {
    throw new KeyTransportError(
      "invalid_endpoint",
      `${AZURE_ENDPOINT_HEADER} header is empty`,
    );
  }
  if (endpoint.length > MAX_ENDPOINT_LEN) {
    throw new KeyTransportError(
      "invalid_endpoint",
      `${AZURE_ENDPOINT_HEADER} header exceeds ${MAX_ENDPOINT_LEN} characters`,
    );
  }
  if (!endpoint.startsWith("https://")) {
    // Defense-in-depth: never forward credentials to a non-TLS endpoint.
    throw new KeyTransportError(
      "invalid_endpoint",
      `${AZURE_ENDPOINT_HEADER} header must use https://`,
    );
  }

  const rawVersion = headers.get(AZURE_API_VERSION_HEADER);
  let apiVersion: string | null = null;
  if (rawVersion !== null) {
    const trimmedVersion = rawVersion.trim();
    if (
      trimmedVersion.length === 0 ||
      trimmedVersion.length > MAX_API_VERSION_LEN
    ) {
      // Treat malformed apiVersion as absent - the adapter will fall back to
      // its own default, which is safer than rejecting the whole request.
      apiVersion = null;
    } else {
      apiVersion = trimmedVersion;
    }
  }

  return { endpoint, apiVersion };
}
