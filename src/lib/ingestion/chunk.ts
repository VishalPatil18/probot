import { get_encoding, type Tiktoken } from "tiktoken";

import { IngestionError } from "./errors";

const DEFAULT_TARGET_TOKENS = 750;
const DEFAULT_OVERLAP_TOKENS = 100;

export interface Chunk {
  contentText: string;
  chunkIndex: number;
  tokenCount: number;
}

export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

let cachedEncoder: Tiktoken | null = null;
function getEncoder(): Tiktoken {
  if (!cachedEncoder) {
    cachedEncoder = get_encoding("cl100k_base");
  }
  return cachedEncoder;
}

// Test-only reset. Re-acquires the encoder on the next call.
export function __resetEncoder(): void {
  if (cachedEncoder) {
    cachedEncoder.free();
    cachedEncoder = null;
  }
}

// Splits `text` into overlapping token-bounded chunks using the cl100k_base
// encoding. Default 750 tokens per chunk with 100-token overlap. Throws
// `IngestionError("empty_input")` if `text` is whitespace-only.
export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const targetTokens = opts.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlapTokens = opts.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  if (targetTokens <= 0) {
    throw new Error("targetTokens must be > 0");
  }
  if (overlapTokens < 0 || overlapTokens >= targetTokens) {
    throw new Error("overlapTokens must be in [0, targetTokens)");
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new IngestionError("empty_input", "Cannot chunk empty text");
  }

  const enc = getEncoder();
  const tokens = enc.encode(trimmed);
  const decoder = new TextDecoder("utf-8");

  if (tokens.length <= targetTokens) {
    return [
      { contentText: trimmed, chunkIndex: 0, tokenCount: tokens.length },
    ];
  }

  const stride = targetTokens - overlapTokens;
  const chunks: Chunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < tokens.length) {
    const end = Math.min(start + targetTokens, tokens.length);
    const window = tokens.slice(start, end);
    const bytes = enc.decode(window);
    const decoded = decoder.decode(bytes).trim();
    if (decoded.length > 0) {
      chunks.push({
        contentText: decoded,
        chunkIndex,
        tokenCount: window.length,
      });
      chunkIndex += 1;
    }
    if (end >= tokens.length) {
      break;
    }
    start += stride;
  }

  return chunks;
}

