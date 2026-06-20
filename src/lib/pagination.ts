import { NextResponse } from "next/server";

// Shared `?page=N&limit=M` parser for all paginated dashboard endpoints
// (conversations, leads, notifications). Centralized so the input contract
// is identical everywhere and bounded - a hostile client cannot request a
// 1,000,000-row page.

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export type Pagination = {
  page: number;
  limit: number;
  offset: number;
};

export type ParsePaginationResult =
  | { ok: true; pagination: Pagination }
  | { ok: false; response: NextResponse };

export function parsePagination(
  searchParams: URLSearchParams,
  opts?: { defaultLimit?: number; maxLimit?: number },
): ParsePaginationResult {
  const defaultLimit = opts?.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = opts?.maxLimit ?? MAX_LIMIT;

  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");

  const page = rawPage === null ? DEFAULT_PAGE : Number(rawPage);
  const limit = rawLimit === null ? defaultLimit : Number(rawLimit);

  if (!Number.isInteger(page) || page < 1) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_pagination", field: "page" },
        { status: 400 },
      ),
    };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_pagination", field: "limit" },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    pagination: { page, limit, offset: (page - 1) * limit },
  };
}
