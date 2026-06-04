# ProBot - Learnings

> Summary of my learnings while building this project from scratch and how I plan to incrementally build the product in stages.

## Overview

This document outlines a learning plan for building ProBot, an AI-powered chatbot platform. The plan is structured in stages, with each stage introducing new features and improvements while ensuring that the core functionality is available from the very beginning.

**Key Principle**: Learn by doing. The best way to understand how to build ProBot is to start building it, even if the initial version is very basic.

### 1. Drizzle ORM and PostgreSQL

> What is Drizzle and why use it?

Drizzle is a schema-first, type-safe SQL toolkit (not an ORM in the heavy ActiveRecord sense). Two layers:

- Schema layer (schema.ts): you declare pgTable("users", { id: uuid("id").primaryKey() ... }). This is not just types — it's a runtime metadata object Drizzle uses for both (a) generating SQL migrations (via drizzle-kit) and (b) building type-safe queries (via drizzle-orm).
- Query layer (index.ts): db.select().from(users).where(eq(users.email, "x")) — every column reference is type-checked against the schema. The return type of db.query.users.findFirst() is User | undefined inferred from the schema — no separate type declarations.

The $inferSelect / $inferInsert helpers expose those inferred types so other modules (NextAuth in Task 1.3, the chat API in Task 1.8) can import User without re-typing the schema.

The pg.Pool is a connection pool — it keeps a small set of TCP connections open to Postgres and hands them out per query, avoiding the cost of opening a new connection every request. In Next.js, the pool is created once per server instance (singleton in index.ts).

> How Drizzle's type inference works?

pgTable("users", { id: uuid("id").primaryKey().defaultRandom(), ... }) returns a runtime metadata object and a TypeScript type carrier. typeof users.$inferSelect extracts the row shape as it comes back from a SELECT (so id is string, createdAt is Date, optional columns are T | null). typeof users.$inferInsert extracts the insert shape (columns with defaults become optional — you don't have to provide id, createdAt, llmProvider, etc.). These types flow through every Drizzle query — db.query.users.findFirst() returns User | undefined without you writing a single type annotation. This is the same idea as Prisma but without code generation — pure inference.

Why the pg.Pool is lazy: new Pool({ connectionString: undefined }) does not error. The pool stores config and waits — it only opens its first TCP connection when pool.query() or pool.connect() is called. That lets import { db } from "@/lib/db" succeed at build time even with no DATABASE_URL set, and fail loudly only when the first real query runs. Compare to a strict pattern where the import itself would throw: that would break next build for any module that transitively imports db, even on a code path that doesn't actually query.

Why gen_random_uuid() works without pgcrypto: Postgres ≥ 13 ships gen_random_uuid() built-in. Supabase, Neon, and modern local installs all qualify. Drizzle's .defaultRandom() emits DEFAULT gen_random_uuid() in the migration SQL — no extension migration needed.

---

### JWT Authentication with NextAuth

> Why JWT for Stage 1, not DB sessions?

With NextAuth's Credentials provider, the only real choice is JWT — Credentials doesn't ship with a DB-sessions story (you'd have to roll your own session table + adapter). JWT means: at login, NextAuth signs a JSON Web Token containing the user id (and whatever else we put in it) using NEXTAUTH_SECRET. The token rides in an HTTP-only cookie. On every request, NextAuth verifies the signature without touching the DB — fast and stateless. The tradeoff: you can't revoke a JWT before it expires (sessions are bounded by the JWT's exp claim, default 30 days). For Stage 1 this is fine; Stage 7 can short-shorten the JWT TTL or add an in-memory blocklist if needed.

Why bcrypt and not Argon2? Argon2 is technically stronger, but bcrypt / bcryptjs is the standard for Node app auth and is what NextAuth examples use. Bcrypt's known-quantity threat model — slow comparison via cost factor, salt baked into the hash string — is sufficient. The cost factor controls how slow each hash is (each +1 doubles the time); 10 ≈ 100ms per hash, which is the right "fast for users, slow for attackers" balance.

Why does the username validation matter NOW even though the public URL isn't live? The users.username column has UNIQUE NOT NULL — every registered user has one stored. If we let Jane.Doe register today, then in Stage 4 we add a route app/u/[username]/chat/page.tsx and someone navigates to /u/Jane.Doe/chat, two problems: (1) URLs are case-sensitive on most CDNs — Jane.Doe ≠ jane.doe, (2) the . could collide with a reserved Next.js route segment. Enforcing the regex at the gate is the easiest fix.

---

### Route Groups

> Why a route-group layout?

src/app/(auth)/layout.tsx is rendered for both /login and /register but not for /, /dashboard, etc. The parens make (auth) a route group — purely organizational, never appears in the URL. So the shared chrome (left brand panel, container, fonts) renders once and only the page content swaps as you navigate between /login and /register. Faster transitions, less duplicated JSX, and the URL stays clean.

Why next/font/google over CDN? With CDN, the browser does: (1) parse HTML, (2) discover <link>, (3) DNS-lookup + connect to fonts.googleapis.com, (4) fetch CSS, (5) discover font URL, (6) DNS-lookup + connect to fonts.gstatic.com, (7) fetch WOFF2, (8) finally render text. With next/font/google, Next downloads the fonts at build time, hashes them, serves them from your own origin, and inlines @font-face declarations into your CSS — text renders on first paint with no FOUC. Bonus: GDPR-friendly (no third-party hit), and it works in offline / restricted-network deployments.

Why auto-sign-in after register? Two separate round-trips would force users to type their password twice (once to register, once to log in). The POST /api/auth/register returns 201 with the user, then the client calls signIn('credentials', ...) with the same email/password — the user goes register → dashboard in one motion. Per srs.md §5.1.1's CTA "Create Your Bot in 2 Minutes," friction here is a goal-state.

---
