import { getEncoding, type Tiktoken } from "js-tiktoken";

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
    cachedEncoder = getEncoding("cl100k_base");
  }
  return cachedEncoder;
}

export function __resetEncoder(): void {
  cachedEncoder = null;
}

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
    const decoded = enc.decode(window).trim();
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
