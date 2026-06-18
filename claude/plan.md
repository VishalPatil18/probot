# ProBot - v1.0 7-Stage Build Plan

> ProBot is free, open-source software (MIT). There is no Stripe integration, no Free/Pro tiers, and no paid features. Users bring their own LLM API key (Anthropic Claude, Google Gemini, DeepSeek, OpenAI GPT, etc.); the key is stored locally (browser local storage or self-host config) and is **never** transmitted to or persisted on ProBot servers. Rate limits remain, but exist only to protect the user's own LLM credits and are configurable when self-hosting.

## Overview

This document outlines a **7-stage incremental development plan** for pro-bot, derived from the SRS (`srs.md`) and the existing VAi implementation (`vai.md`). Each stage is **self-contained**, produces a **fully working and deployable product**, and is **backward compatible** with all previous stages. No stage breaks anything built before it.

**Key Principle**: Each stage ships. A user can use the product at the end of every stage. Features get richer as stages progress, but the core loop (create a bot, chat with it) works from Stage 1 onward.

### v1.1 Changes Reflected in This Plan

- **Open-source, no billing**: Stage 7 no longer adds Stripe, tier enforcement, or "Upgrade to Pro" prompts. It focuses on OAuth, compliance (GDPR / ToS / Privacy), landing page, security hardening, monitoring, and self-host packaging.
- **BYO-key LLM from Stage 1**: The Bot Factory now includes an "AI Model" step (FR-002.11, FR-002.12). The chat API resolves the user's selected provider/model and uses the locally stored key passed in per request (`x-llm-api-key` header) - never persisted server-side.
- **Multi-provider abstraction**: From Stage 1, the AI client is provider-agnostic (Anthropic / Google / DeepSeek / OpenAI). Stage 3 extends this to embeddings.
- **Schema deltas**: `users` table gains `llm_provider` / `llm_model` (non-sensitive preferences only). Columns `tier`, `stripe_customer_id`, `stripe_subscription_id` from the v1.0 plan are removed.
- **Rate limits as cost protection**: Limits are uniform (no Free vs Pro split), configurable via env / self-host config, and exist only to protect the user's own LLM credits.

---

## Stage Dependency Graph

```
Stage 1: Foundation & Bot Creation (Text-Only Chat)
    |
    v
Stage 2: Data Ingestion Pipeline (PDF Upload & Text Extraction)
    |
    v
Stage 3: RAG Pipeline & Vector Search
    |
    v
Stage 4: Multi-Tenant Public Chat & Unique URLs
    |
    v
Stage 5: Embeddable Chat Widget
    |
    v
Stage 6: Dashboard, Analytics & Lead Capture
    |
    v
Stage 7: Open-Source Hardening, Compliance & Launch
```

---

## Stage 1: Foundation & Bot Creation (Text-Only Chat)

### Goal

A user can sign up, create a chatbot by pasting their career info as text, and immediately chat with it. The bot answers questions using the pasted text as full context (same pattern as VAi's `vaiContext.js` injection into the system prompt).

### What the User Sees

1. Sign up / login page
2. A "Bot Factory" form: enter name, headline, paste bio/resume text, **pick an LLM provider + model, paste their own API key** (UI prominently states "stored locally in your browser - ProBot servers never see this key")
3. A private chat page where they can test their bot
4. The bot answers questions based on their pasted text, using the user's chosen LLM provider

### SRS Requirements Covered

- **FR-001**: User Registration and Authentication (email/password only, OAuth deferred to Stage 7)
- **FR-002.1-2.2, 2.5-2.6, 2.9**: Bot creation (text input, personality presets, slug generation)
- **FR-002.11, FR-002.12**: AI Model selection + BYO API key (key stored locally only, never sent to ProBot servers)
- **FR-005.1-5.13**: Chat interface (adapted from VAi.tsx)
- **FR-009.1-9.8**: Dynamic system prompt construction (adapted from VAi's `buildSystemPrompt`)
- **FR-010.1, FR-010.4, FR-010.5, FR-010.8**: Open-source distribution baseline, multi-provider support, BYO-key privacy guarantee, telemetry off by default

### Technical Implementation

#### 1.1 Project Scaffolding

```
probot/
  src/
    app/                          # Next.js 14 App Router
      (auth)/
        login/page.tsx
        register/page.tsx
      (dashboard)/
        dashboard/page.tsx
        dashboard/bots/new/page.tsx
      u/[username]/chat/page.tsx   # Public chat (Stage 4 makes this fully public)
    components/
      chat/
        ChatWindow.tsx             # Adapted from VAi.tsx
        MessageBubble.tsx
        SuggestedQuestions.tsx
        LoadingAnimation.tsx
      bot-factory/
        BotFactoryForm.tsx
    lib/
      db/
        schema.ts                  # Drizzle ORM schema
        index.ts                   # DB connection
      ai/
        providers/
          index.ts                 # Provider registry (anthropic, google, deepseek, openai)
          types.ts                 # Shared LLMProvider interface
          anthropic.ts             # Claude completion adapter
          openai.ts                # GPT completion adapter
          google.ts                # Gemini completion adapter (stub ok in S1)
          deepseek.ts              # DeepSeek completion adapter (stub ok in S1)
        prompt-builder.ts          # Adapted from VAi's buildSystemPrompt
        sanitize-input.ts          # Adapted from VAi's sanitizeMessage
        sanitize-output.ts         # Adapted from VAi's sanitizeOutput
        key-transport.ts           # Reads/validates x-llm-api-key header; never logs/stores it
      auth/
        auth.ts                    # NextAuth config
      client/
        llm-key-store.ts           # Browser-side: persist BYO key in localStorage (never POSTed to /api except via x-llm-api-key header)
    types/
      index.ts
```

#### 1.2 Database Schema (Initial)

Only create what's needed now. Tables for later stages are added when needed.

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  llm_provider VARCHAR(20) DEFAULT 'anthropic',  -- v1.1: non-sensitive preference only
  llm_model VARCHAR(60),                          -- v1.1: non-sensitive preference only
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTE (v1.1): The user's LLM API key is intentionally NOT stored in the database.
-- It is held only in browser localStorage / self-host config and sent on each chat
-- request via the `x-llm-api-key` header. ProBot never logs, persists, or forwards
-- this key anywhere except directly to the chosen LLM provider for that request.

-- Bots table (simplified for Stage 1)
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  headline VARCHAR(120),
  personality VARCHAR(20) DEFAULT 'professional',
  context_text TEXT NOT NULL,          -- Full text pasted by user (Stage 1 approach)
  suggested_questions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Chat API (`/api/chat/[botId]/route.ts`)

Adapted directly from VAi's `ask_vai.ts`:

```
POST /api/chat/:botId
  Headers: x-llm-api-key: <user's BYO key, never logged>
  |
  v
Validate request (method, content-type, body) ← from VAi
  |
  v
Extract x-llm-api-key header (key-transport.ts: validate format, never log/persist)
  - If missing/invalid: 400 { error: "missing_llm_key" } with friendly UX prompt
  |
  v
Look up bot by ID from PostgreSQL → fetch owner's llm_provider / llm_model preference
  |
  v
Sanitize message (sanitizeMessage) ← ported from VAi
  |
  v
Build system prompt:
  - Identity: "You are the AI assistant for [bot.name]"
  - Immutable rules ← VAi's 7 rules adapted for multi-tenant
  - Personality tone from bot.personality
  - Full context_text injected (same as VAi's vaiContext approach)
  - Fallback: "If not in context, suggest contacting [bot.name]"
  |
  v
Resolve provider: providers[user.llm_provider].complete({
  model: user.llm_model,
  apiKey: <from header>,    // forwarded ONLY to the chosen provider
  temperature: 0.3,
  maxTokens: 500,
})
  |
  v
Sanitize output (sanitizeOutput) ← ported from VAi
  |
  v
Return { reply: "..." }
```

**BYO-key invariants (enforced from Stage 1):**

- The `x-llm-api-key` header value is never logged, never written to the database, never echoed in error messages, and never forwarded to any URL other than the user's chosen LLM provider.
- Server-side error tracking (Sentry, Vercel logs) scrubs this header from breadcrumbs.
- The browser persists the key in `localStorage` under a per-origin key (`probot.llm.key.v1`); it is attached to outgoing chat requests but is **never** sent via JSON body (so accidental logging of POST bodies cannot leak it).

#### 1.4 Key Files to Port from VAi

| VAi Source                              | ProBot Target                    | Changes                                                                      |
| --------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| `sanitizeMessage()` from `ask_vai.ts`   | `lib/ai/sanitize-input.ts`       | No changes needed - pattern is tenant-agnostic                               |
| `sanitizeOutput()` from `ask_vai.ts`    | `lib/ai/sanitize-output.ts`      | Replace hardcoded context keys with per-bot keys                             |
| `buildSystemPrompt()` from `ask_vai.ts` | `lib/ai/prompt-builder.ts`       | Replace Vishal's identity with dynamic `bot.name`, inject `bot.context_text` |
| `VAi.tsx` (UI)                          | `components/chat/ChatWindow.tsx` | Remove Vishal-specific branding, accept `botId` prop                         |
| CSS animations from `global.css`        | `styles/chat.css`                | Port `.chatbot-btn-ring`, `.vai-markdown`, loading ring                      |

#### 1.5 Environment Variables

```env
# Platform-level secrets only. NOTE (v1.1): ProBot ships NO default LLM credentials.
# Each user supplies their own LLM API key, stored locally in their browser and sent
# per-request via the x-llm-api-key header. The server never persists it.
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Self-hosters MAY optionally configure a fallback LLM key for their own private
# deployment (so they don't have to paste a key in their browser). This is purely
# local-config; the hosted probot.com deployment does not set these.
# PROBOT_DEFAULT_LLM_PROVIDER=anthropic
# PROBOT_DEFAULT_LLM_MODEL=claude-haiku-4-5
# PROBOT_DEFAULT_LLM_API_KEY=...
```

### Deliverables

- [x] Next.js 14 project with App Router, TypeScript, Tailwind CSS
- [x] PostgreSQL with `users` (incl. `llm_provider` / `llm_model`) and `bots` tables via Drizzle ORM
- [x] NextAuth.js email/password authentication
- [x] Bot Factory form (name, headline, text area, personality selector, **AI Model step with BYO API key field**)
- [x] Browser-side LLM key store (`localStorage`) with "stored locally, never tracked" UI assurance
- [x] Multi-provider LLM client abstraction (Anthropic + OpenAI minimum; Google/DeepSeek stubs)
- [x] Chat API ported from VAi's `ask_vai.ts` (full-context injection) using BYO key via `x-llm-api-key` header
- [x] Key-transport guarantees: header is never logged, never persisted, never forwarded except to the chosen provider
- [x] Chat UI ported from VAi's `VAi.tsx` (markdown, loading, suggestions)
- [x] Input sanitization (40+ patterns from VAi)
- [x] Output sanitization (leakage detection from VAi)
- [x] Basic in-memory rate limiting (ported from VAi, replaced in Stage 7) - uniform default, no tier split

### What Works After Stage 1

A job seeker can register, paste their resume/bio text, choose an LLM provider/model, paste their own API key (stored locally only), create a bot, and chat with it. The bot answers questions using the full text as context, with all of VAi's prompt engineering and security patterns active. This is essentially a **multi-user, BYO-key VAi**.

### Limitations (Resolved in Later Stages)

- No PDF upload (Stage 2)
- No RAG / vector search (Stage 3)
- Chat page requires login to access (Stage 4 makes it public)
- No embeddable widget (Stage 5)
- No analytics or lead capture (Stage 6)
- No OAuth, no email verification / password reset, no landing page, no GDPR flows (Stage 7) - v1.1 has no payment tiers in any stage

---

## Stage 2: Data Ingestion Pipeline (PDF Upload & Text Extraction)

### Goal

Users can upload PDF resumes and portfolio URLs in addition to pasting text. The system extracts text from these sources, chunks it, and stores it in the database. The chat still uses full-context injection (not RAG yet), but now the context is richer because it's assembled from multiple sources.

### What the User Sees

1. Bot Factory now has 3 input methods: PDF upload, URL input, Text area
2. Upload progress indicator during processing
3. Bot's knowledge base is assembled from all sources combined

### SRS Requirements Covered

- **FR-002.3**: PDF upload (max 10MB, max 5 files)
- **FR-002.4**: URL input (LinkedIn/portfolio)
- **FR-003.1**: PDF text extraction
- **FR-003.2**: URL text scraping
- **FR-003.3**: Text chunking (500-1000 tokens, 100-token overlap)
- **FR-003.6**: Store original text chunks in relational DB
- **FR-003.7**: Processing within 60 seconds
- **FR-003.8**: Processing progress display
- **FR-003.9**: Re-ingestion support
- **FR-003.10**: File validation

### Technical Implementation

#### 2.1 New Dependencies

```json
{
  "pdf-parse": "^1.1.1",
  "cheerio": "^1.0.0",
  "tiktoken": "^1.0.0"
}
```

#### 2.2 Database Schema Additions

```sql
-- KnowledgeBase table (new)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_type VARCHAR(10) NOT NULL,  -- 'pdf', 'url', 'text'
  source_name VARCHAR(255),           -- filename or URL
  content_text TEXT NOT NULL,          -- extracted/pasted text chunk
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add to bots table
ALTER TABLE bots ADD COLUMN profile_photo_url VARCHAR(500);
```

**Backward Compatibility**: The existing `bots.context_text` column still works. Bots created in Stage 1 (text-only) continue to use `context_text`. New bots also populate `knowledge_base` rows. The chat API checks: if `knowledge_base` rows exist for a bot, concatenate them for context; otherwise fall back to `context_text`.

#### 2.3 Ingestion Pipeline

```
User uploads PDF / enters URL / pastes text
    |
    v
[/api/bots/:botId/knowledge] POST endpoint
    |
    ├─ PDF: pdf-parse → extract raw text
    ├─ URL: fetch + cheerio → extract page text
    └─ Text: use as-is
    |
    v
Chunk text (500-1000 tokens, 100-token overlap using tiktoken)
    |
    v
Store chunks in knowledge_base table
    |
    v
Assemble full context: concatenate all chunks for this bot
    |
    v
Update bots.context_text with assembled full text
    (This keeps the Stage 1 chat API working unchanged)
```

#### 2.4 File Storage

- **AWS S3** (Always Free tier: 5 GB storage + 20K GET + 2K PUT per month) via presigned URLs.
- Profile photos: uploaded direct-to-S3 via short-lived presigned PUT URLs minted server-side.
- PDFs: uploaded to a temporary S3 prefix for processing, then deleted (only extracted text is kept in Postgres).
- AWS region pinned in env (`AWS_REGION`); IAM user scoped to one bucket with `PutObject`/`GetObject`/`DeleteObject` only.
- No direct public reads - PDFs/photos are fetched server-side only, so we never burn the 100 GB/mo egress allowance. Profile-photo URLs in chat UIs come from short-lived signed GET URLs.

#### 2.5 New API Endpoints

| Method | Endpoint                               | Description                            |
| ------ | -------------------------------------- | -------------------------------------- |
| POST   | `/api/bots/:botId/knowledge`           | Upload PDF, submit URL, or submit text |
| GET    | `/api/bots/:botId/knowledge`           | List knowledge base entries            |
| DELETE | `/api/bots/:botId/knowledge/:chunkId`  | Delete a knowledge entry               |
| POST   | `/api/bots/:botId/knowledge/reprocess` | Re-chunk and rebuild context           |

#### 2.6 Bot Factory Form Updates

Add to the existing multi-step form:

- **Step 2a**: Drag-and-drop PDF upload zone (max 10MB, max 5 files)
- **Step 2b**: URL input field with fetch preview
- **Step 2c**: Free-text area (existing from Stage 1)
- All three can be used together; their texts are combined

### Deliverables

- [x] PDF text extraction via `pdf-parse`
- [x] URL text scraping via `cheerio`
- [x] Text chunking with token counting via `tiktoken`
- [x] `knowledge_base` database table and CRUD APIs
- [x] File upload with drag-and-drop UI
- [x] Processing progress indicator
- [x] File validation (type, size, malware scan)
- [x] Re-ingestion support (delete old chunks, re-process)
- [x] Profile photo upload to object storage

### What Works After Stage 2

Everything from Stage 1, plus: users can upload PDFs and URLs as knowledge sources. The bot's context is now richer and assembled from multiple sources. The chat still works the same way (full-context injection) but with better data.

### Limitations (Resolved in Later Stages)

- Full context injected into prompt (token-expensive for large knowledge bases) -> Stage 3
- No semantic search -> Stage 3

---

## Stage 3: RAG Pipeline & Vector Search

### Goal

Replace full-context injection with Retrieval-Augmented Generation. When a recruiter asks a question, the system embeds the question, retrieves the top 3 most relevant chunks from the vector database, and uses only those chunks as context. This makes the system scalable to large knowledge bases and reduces token costs.

### What the User Sees

- Chat responses are **more relevant** because only the most pertinent context is used
- Bot can handle **larger knowledge bases** without hitting token limits
- Response quality improves for specific questions (less noise from irrelevant context)
- No visible UI changes - the improvement is under the hood

### SRS Requirements Covered

- **FR-003.4**: Generate vector embeddings using the user's configured provider (OpenAI `text-embedding-3-small`, or a provider equivalent for Anthropic / Google / DeepSeek), authenticated with the user-supplied BYO key
- **FR-003.5**: Store embeddings in vector DB namespaced by Bot ID
- **FR-004.1-4.8**: Full RAG pipeline (embed query, retrieve top-3, construct prompt, generate via user's LLM provider)

### Technical Implementation

#### 3.1 New Dependencies

```json
{
  "@pinecone-database/pinecone": "^3.0.0"
}
```

Alternative: Supabase `pgvector` extension (avoids adding another service).

#### 3.2 Vector Database Setup

**Option A: Pinecone** (recommended for scale)

```
Index: probot
Dimension: 1536 (text-embedding-3-small)
Metric: cosine
Namespaces: One per bot_id
```

**Option B: Supabase pgvector** (simpler, uses existing PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536);

CREATE INDEX ON knowledge_base
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

#### 3.3 Schema Update

```sql
-- Add vector_id to knowledge_base (for Pinecone reference)
ALTER TABLE knowledge_base ADD COLUMN vector_id VARCHAR(255);

-- v1.1: Track which provider/model was used to embed each chunk so chat-time
-- queries embed with the SAME model (different models produce non-comparable vectors).
ALTER TABLE knowledge_base ADD COLUMN embedding_provider VARCHAR(20);
ALTER TABLE knowledge_base ADD COLUMN embedding_model VARCHAR(60);
```

**Backward Compatibility**: Bots that were created before Stage 3 have `knowledge_base` rows but no embeddings. On first chat with such a bot, the system checks: if embeddings exist, use RAG; if not, fall back to full-context injection from `bots.context_text`. A background job can be triggered to backfill embeddings for existing bots.

#### 3.4 Embedding Pipeline (Extends Stage 2 Ingestion)

```
[Stage 2 chunking completes]
    |
    v
For each chunk:
    |
    v
Call embeddings.embed(chunk.content_text)  // dispatched by provider registry
  - openai: text-embedding-3-small (1536d)
  - anthropic: voyage-3 or equivalent (mapped to 1536d via projection if needed)
  - google: text-embedding-004
  - deepseek: provider's embedding model
  Uses the BYO API key passed in the ingestion request header.
    |
    v
Store embedding in Pinecone (namespace: bot_id, id: chunk.id)
  OR store in pgvector column on knowledge_base row
    |
    v
Save vector_id reference + embedding_provider/embedding_model in knowledge_base table
  (so chat-time queries use the SAME embedding model for cosine compatibility)
```

#### 3.5 Updated Chat API Flow

```
POST /api/chat/:botId
    |
    v
Validate + Sanitize (unchanged from Stage 1)
    |
    v
Check: Does this bot have embeddings?
    |
    ├─ YES (Stage 3+ bots) → RAG Path:
    |    |
    |    v
    |  Embed the user's question: text-embedding-3-small(message)
    |    |
    |    v
    |  Query vector DB: top_k=3, namespace=bot_id, filter by cosine similarity
    |    |
    |    v
    |  Fetch matching knowledge_base rows by vector_id
    |    |
    |    v
    |  Build system prompt with retrieved chunks only
    |
    └─ NO (Stage 1 legacy bots) → Full-Context Path:
         |
         v
       Build system prompt with bots.context_text (unchanged)
    |
    v
OpenAI completion (gpt-4o-mini, temp 0.3, max_tokens 500)
    |
    v
Sanitize output → Return { reply: "..." }
```

#### 3.6 Prompt Builder Update (`lib/ai/prompt-builder.ts`)

```typescript
// Stage 1: buildSystemPrompt(bot) - full context
// Stage 3: buildSystemPrompt(bot, retrievedChunks?) - RAG or full context

function buildSystemPrompt(bot: Bot, chunks?: KnowledgeChunk[]): string {
  const identity = `You are the AI assistant for ${bot.name}.`;
  const rules = IMMUTABLE_RULES; // Adapted from VAi's 7 rules
  const personality = PERSONALITY_PRESETS[bot.personality];

  let context: string;
  if (chunks && chunks.length > 0) {
    // RAG path: only relevant chunks
    context = chunks.map((c) => c.content_text).join("\n\n---\n\n");
  } else {
    // Legacy path: full context
    context = bot.context_text;
  }

  return `${identity}\n\n${rules}\n\n${personality}\n\n## Context:\n${context}`;
}
```

#### 3.7 Embedding Backfill Job

For bots created in Stages 1-2 that don't have embeddings yet:

```
GET /api/bots/:botId/knowledge/embed (auth required)
  → Triggers embedding generation for all chunks without embeddings
  → Returns progress (can be polled by frontend)
```

### Deliverables

- [x] Vector database integration (Pinecone or pgvector)
- [x] Embedding generation during ingestion pipeline
- [x] Query-time embedding of user questions
- [x] Top-3 similarity search per bot namespace
- [x] Updated prompt builder with RAG path + legacy fallback
- [x] Backfill endpoint for pre-existing bots
- [x] Graceful fallback when no relevant context found (FR-004.8)

### What Works After Stage 3

Everything from Stages 1-2, plus: chat now uses semantic search to find the most relevant pieces of the user's knowledge base. Responses are more accurate and focused. Large knowledge bases work without hitting token limits. Old bots still work via the full-context fallback.

### Limitations (Resolved in Later Stages)

- Chat page still requires login -> Stage 4
- No unique public URLs -> Stage 4

---

## Stage 4: Multi-Tenant Public Chat & Unique URLs

### Goal

Every bot gets a unique public URL (`probot.com/u/jane-doe/chat`) that anyone can visit without logging in. This is the core deployment mechanism that makes the product useful for recruiters.

### What the User Sees

1. After creating a bot, they get a **shareable URL**: `probot.com/u/jane-doe/chat`
2. The public chat page shows the bot owner's name, headline, and photo
3. Recruiters can chat without any account or login
4. The bot owner can copy their URL from the dashboard

### SRS Requirements Covered

- **FR-002.9**: Unique URL slug generation
- **FR-005.1**: Full-page chat at `/u/{username}/chat`
- **FR-005.2**: Display bot owner's name, headline, photo
- **FR-005.5**: Suggested questions on first visit
- **FR-005.9**: Fully responsive (desktop + mobile)
- **Section 4.5**: Multi-Tenant Routing

### Technical Implementation

#### 4.1 Dynamic Route Structure

```
src/app/
  u/
    [username]/
      chat/
        page.tsx          # Public chat page (no auth required)
      page.tsx            # Redirect to /chat
```

#### 4.2 Tenant Resolution Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/u\/([a-z0-9-]+)/);
  if (match) {
    const username = match[1];
    // Add username to headers for downstream resolution
    const headers = new Headers(request.headers);
    headers.set("x-tenant-username", username);
    return NextResponse.next({ headers });
  }
}
```

#### 4.3 Public Chat Page

```typescript
// src/app/u/[username]/chat/page.tsx
export default async function PublicChatPage({ params }: { params: { username: string } }) {
  // Server-side: resolve username → bot
  const user = await db.query.users.findFirst({
    where: eq(users.username, params.username)
  });
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.userId, user.id), eq(bots.isActive, true))
  });

  if (!bot) return notFound();

  // Pass public bot config to client component
  return <PublicChatWindow
    botId={bot.id}
    botName={bot.name}
    headline={bot.headline}
    photoUrl={bot.profilePhotoUrl}
    suggestedQuestions={bot.suggestedQuestions}
    themeColor={bot.themeColor}
  />;
}
```

#### 4.4 Public Bot Config API

```
GET /api/bots/:botId/config (no auth required)
  → Returns: { name, headline, photoUrl, themeColor, suggestedQuestions }
  → Used by: public chat page and widget (Stage 5)
```

#### 4.5 Chat API Update

The `/api/chat/:botId` endpoint from Stage 1 already works without auth. No changes needed. The only addition:

```sql
-- Store conversations (new table, needed for Stage 6 analytics but created now)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  recruiter_ip VARCHAR(45),
  message_count INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Backward Compatibility**: The chat API now optionally stores messages. If `session_id` is provided in the request, messages are logged. If not, chat still works (stateless, like Stage 1-3).

#### 4.6 Username Validation

Enforce during registration and bot creation:

```typescript
const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
// 3-30 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphens

const RESERVED_SLUGS = [
  "admin",
  "api",
  "dashboard",
  "login",
  "register",
  "widget",
  "u",
  "settings",
];
```

#### 4.7 SEO & Open Graph

Each public chat page gets dynamic metadata:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const bot = await resolveBot(params.username);
  return {
    title: `Chat with ${bot.name}'s AI Assistant | ProBot`,
    description: bot.headline,
    openGraph: {
      title: `Ask ${bot.name}'s AI anything about their career`,
      image: bot.profilePhotoUrl,
    },
  };
}
```

### Deliverables

- [x] Dynamic route `/u/[username]/chat` with server-side bot resolution
- [x] Tenant resolution middleware
- [x] Public chat page (no auth required) with bot branding
- [x] Public bot config API endpoint
- [x] Conversation and message logging tables
- [x] Username validation with reserved slug protection
- [x] SEO/Open Graph meta tags for public pages
- [x] "Copy URL" button in dashboard
- [x] Redirect `/u/[username]` -> `/u/[username]/chat`

### What Works After Stage 4

Everything from Stages 1-3, plus: every bot has a public URL. A job seeker creates their bot, copies the URL, and shares it with recruiters. Recruiters visit the URL and chat without logging in. The full VAi-quality chat experience is now publicly accessible per-user. This is the **first truly shareable version** of the product.

### Limitations (Resolved in Later Stages)

- No embeddable widget for external sites -> Stage 5
- No conversation analytics or lead capture -> Stage 6
- No OAuth, no Redis-backed rate limiting, no GDPR flows, no landing page, no self-host packaging -> Stage 7

---

## Stage 5: Embeddable Chat Widget

### Goal

Users get a `<script>` tag they can paste into their portfolio site. The script renders a floating chat bubble that opens a full chat dialog, all running against the ProBot API.

### What the User Sees

1. Dashboard shows an "Embed on Your Site" section with a copyable script tag
2. Pasting the script tag on any website adds a floating chat bubble (bottom-right)
3. Clicking the bubble opens the chat interface
4. The widget is branded with the bot's theme color and name

### SRS Requirements Covered

- **FR-006.1-6.8**: Full embeddable widget specification
- **Section 4.3**: Embeddable Chat Widget feature
- **Section 5.1.5**: Widget UI specification

### Technical Implementation

#### 5.1 Widget Architecture

The widget is a **single JavaScript file** that creates an isolated chat interface inside a Shadow DOM on the host page. This prevents CSS conflicts.

**Hosting:** the widget.js bundle is uploaded to AWS S3 (same bucket family as Stage 2) and served via **AWS CloudFront** (Always Free tier: 1 TB egress + 10M requests/month). CloudFront-to-S3 data transfer is waived. Distribution URL like `d111111abcdef8.cloudfront.net/widget.js` or behind a custom domain.

```
probot.com/widget.js (served from CloudFront → S3 origin)
    |
    v
Reads data-bot-id from its own <script> tag
    |
    v
Fetches bot config: GET /api/bots/:botId/config
    |
    v
Creates Shadow DOM container
    |
    v
Renders floating bubble + expandable chat dialog
    |
    v
Chat messages go through: POST /api/chat/:botId (CORS-enabled)
```

#### 5.2 Widget Script (`public/widget.js`)

```javascript
// Self-executing, no dependencies, Shadow DOM isolated
(function () {
  const script = document.currentScript;
  const botId = script.getAttribute("data-bot-id");
  if (!botId) return;

  const API_BASE = "https://probot.com";

  // Create container with Shadow DOM
  const host = document.createElement("div");
  host.id = "hiremebot-widget";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });

  // Inject all styles inside shadow DOM (no leaking)
  const style = document.createElement("style");
  style.textContent = `/* All widget CSS here - button, dialog, messages */`;
  shadow.appendChild(style);

  // ... render bubble, dialog, handle chat via fetch to API_BASE
})();
```

#### 5.3 CORS Configuration

Update `next.config.js` and API routes for widget cross-origin access:

```typescript
// For /api/chat/:botId and /api/bots/:botId/config
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Widget can be on any domain
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
```

**Security note**: The chat endpoint is already public (Stage 4). CORS `*` is safe here because:

- No cookies/auth tokens are sent from the widget
- Rate limiting is per-IP per-bot (not per-origin)
- The endpoint only accepts a `message` string, no sensitive operations

#### 5.4 Widget Build Pipeline

```
src/widget/
  widget.ts         # TypeScript source
  widget.css        # Styles (inlined at build)
  build.ts          # Build script: compile TS, inline CSS, minify

Output: public/widget.js (single file, < 50KB gzipped)
```

Build with esbuild for fast single-file bundling, then deploy to S3 (CloudFront-fronted):

```json
{
  "scripts": {
    "build:widget": "esbuild src/widget/widget.ts --bundle --minify --outfile=dist/widget.js",
    "deploy:widget": "aws s3 cp dist/widget.js s3://$PROBOT_WIDGET_BUCKET/widget.js --cache-control 'public,max-age=300' && aws cloudfront create-invalidation --distribution-id $PROBOT_CF_DISTRIBUTION --paths '/widget.js'"
  }
}
```

CloudFront cache: 5-minute TTL so widget code updates propagate fast; invalidation on every deploy. `widget.js` cost projection: 50 KB × 10M req/mo = 500 GB egress → well within the 1 TB Always Free allowance.

#### 5.5 Dashboard Embed Section

Add to the dashboard bot detail page:

```tsx
<div className="embed-section">
  <h3>Embed on Your Website</h3>
  <p>Paste this code before the closing &lt;/body&gt; tag:</p>
  <code className="copyable">
    {`<script src="https://probot.com/widget.js" data-bot-id="${bot.id}"></script>`}
  </code>
  <button onClick={copyToClipboard}>Copy Code</button>

  <h3>Share Your Bot</h3>
  <div className="share-links">
    <p>Direct URL: probot.com/u/{user.username}</p>
    <p>Email Signature: [badge HTML]</p>
    <p>LinkedIn: Add to Featured section</p>
  </div>
</div>
```

#### 5.6 Widget Features (Matching VAi UX)

Ported from VAi.tsx patterns:

- Floating circular button with animated ring (`.chatbot-btn-ring` from VAi)
- Expand/collapse chat dialog
- Suggested questions on first open
- Auto-expanding textarea (max 120px)
- Markdown rendering (lightweight, no react-markdown - use a small markdown parser)
- Loading animation with rotating messages
- Rate limit message with contact alternatives
- Mobile responsive (full-width on small screens)
- "Powered by ProBot" footer link

### Deliverables

- [x] `widget.js` single-file script with Shadow DOM isolation
- [x] Widget build pipeline (esbuild, CSS inlining, minification)
- [x] CORS headers on public API endpoints
- [x] Dashboard "Embed" section with copyable script tag
- [x] Widget floating bubble with animated ring
- [x] Widget chat dialog with full VAi UX patterns
- [x] Email signature badge template
- [x] < 50KB gzipped widget size
- [x] Tested on: plain HTML, WordPress, Squarespace, Wix (common portfolio platforms)

### What Works After Stage 5

Everything from Stages 1-4, plus: users can embed their bot on any website. A job seeker can add the widget to their portfolio at `janedoe.com` and recruiters browsing the portfolio can chat with the AI directly. Combined with the shareable URL from Stage 4, the bot is now **fully deployable** across all channels (direct link, embed, email signature).

### Limitations (Resolved in Later Stages)

- No visibility into who's chatting -> Stage 6
- No lead capture -> Stage 6
- No Redis-backed persistent rate limiting (in-memory only) -> Stage 7

---

## Stage 6: Dashboard, Analytics & Lead Capture

### Goal

Give bot owners visibility into how their bot is being used. Show conversation logs, capture recruiter emails as leads, surface **in-app notifications** in the dashboard when new leads arrive (no transactional email in this stage), and provide actionable analytics.

### What the User Sees

1. **Dashboard overview**: Cards showing total conversations, messages, leads this month
2. **Conversation log**: List of all chats with preview, expandable to full transcript
3. **Lead list**: Captured recruiter emails with conversation context
4. **Lead export**: Download leads as CSV
5. **In-chat lead capture**: After 3-4 messages, the bot asks for the recruiter's email
6. **In-app notification**: Bot owner sees a bell badge in the dashboard with an unread counter; clicking opens the new-leads list. (Email notifications deferred - re-evaluated post-Stage 7.)

### SRS Requirements Covered

- **FR-007.1-7.9**: Full dashboard specification
- **FR-008.1-8.6**: Lead capture flow
- **Section 4.4**: Lead Insights Dashboard feature

### Technical Implementation

#### 6.1 Database Schema Additions

```sql
-- Leads table (new)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  email VARCHAR(255) NOT NULL,
  context_summary TEXT,
  captured_at TIMESTAMP DEFAULT NOW()
);

-- Add recruiter_email to conversations (for quick lookup)
ALTER TABLE conversations ADD COLUMN recruiter_email VARCHAR(255);

-- Indexes for dashboard queries
CREATE INDEX idx_conversations_bot_started ON conversations(bot_id, started_at DESC);
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX idx_leads_bot_captured ON leads(bot_id, captured_at DESC);
```

**Backward Compatibility**: The `conversations` and `messages` tables were created in Stage 4. This stage adds `leads` and an index. Existing conversations continue to work. The lead capture is an additive feature.

#### 6.2 Lead Capture Flow

The lead capture happens **client-side** in the chat component, not in the AI prompt. After the 3rd or 4th assistant message, the client injects a special lead capture card:

```
[Message 1: Recruiter asks question]
[Message 2: Bot answers]
[Message 3: Recruiter asks another question]
[Message 4: Bot answers]
    |
    v
[Lead Capture Card appears]:
  "Would you like to leave your email so {botName} can get back to you?"
  [Email input] [Submit] [Skip]
    |
    ├─ Submit: POST /api/bots/:botId/leads { email, conversationId }
    |    → Store lead, notify bot owner via email
    |    → Show "Thanks! {botName} will be in touch."
    |
    └─ Skip: Dismiss card, continue chatting
```

#### 6.3 Dashboard Pages

```
src/app/(dashboard)/
  dashboard/
    page.tsx                            # Overview with stat cards
    bots/
      [botId]/
        page.tsx                        # Bot detail + settings
        conversations/
          page.tsx                      # Conversation list
          [conversationId]/page.tsx     # Full transcript
        leads/
          page.tsx                      # Lead list + export
        settings/
          page.tsx                      # Bot config (personality, knowledge base, etc.)
```

#### 6.4 Dashboard API Endpoints

| Method | Endpoint                                         | Description                                                           |
| ------ | ------------------------------------------------ | --------------------------------------------------------------------- |
| GET    | `/api/bots/:botId/analytics`                     | `{ totalConversations, totalMessages, totalLeads, thisMonth: {...} }` |
| GET    | `/api/bots/:botId/conversations?page=1&limit=20` | Paginated conversation list                                           |
| GET    | `/api/bots/:botId/conversations/:convId`         | Full conversation with messages                                       |
| GET    | `/api/bots/:botId/leads?page=1&limit=20`         | Paginated lead list                                                   |
| GET    | `/api/bots/:botId/leads/export`                  | CSV download of all leads                                             |
| POST   | `/api/bots/:botId/leads`                         | Capture a new lead (from chat UI)                                     |

#### 6.5 Analytics Queries

```sql
-- Dashboard overview for a bot
SELECT
  COUNT(DISTINCT c.id) as total_conversations,
  SUM(c.message_count) as total_messages,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT c.id) FILTER (WHERE c.started_at > NOW() - INTERVAL '30 days') as conversations_this_month,
  COUNT(DISTINCT l.id) FILTER (WHERE l.captured_at > NOW() - INTERVAL '30 days') as leads_this_month
FROM bots b
LEFT JOIN conversations c ON c.bot_id = b.id
LEFT JOIN leads l ON l.bot_id = b.id
WHERE b.id = :botId AND b.user_id = :userId;
```

#### 6.6 In-App Notifications

No transactional email in Stage 6 - notifications surface in the dashboard.

**Schema addition:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL,  -- 'lead_captured' for Stage 6; extensible
  payload JSONB NOT NULL,      -- e.g. { leadId, email, contextSummary }
  read_at TIMESTAMP,           -- NULL = unread
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
```

**On lead capture:** `INSERT INTO notifications (...) VALUES (...)` in the same transaction as the lead row, so the badge increments atomically.

**Dashboard UX:**

- Bell icon in the dashboard header with a small red dot + unread count
- `GET /api/notifications?unread=true` returns the list (paginated)
- `POST /api/notifications/:id/read` marks a single notification read
- `POST /api/notifications/read-all` clears the badge
- Client polls `GET /api/notifications/unread-count` every 30s while the dashboard is open (lightweight `{ count }` response). Stage 7 can swap to Server-Sent Events or WebSockets if real-time matters.

**Why no email here:**

- Avoids a SendGrid/Resend/SES dependency at this stage
- Side-steps email-deliverability complexity (sender reputation, DKIM, bounce handling) until Stage 7
- Bot owners visit the dashboard regularly enough that in-app surfacing is sufficient for the lead-followup loop in Stage 6

Email notifications can be re-introduced post-Stage 7 as an opt-in setting once the auth-email plumbing (Resend) is already wired for password reset and email verification.

#### 6.7 Knowledge Base Management in Dashboard

The dashboard bot settings page now includes:

- View all knowledge base entries (source type, source name, chunk count)
- Delete individual sources
- Upload new sources (re-uses Stage 2 ingestion pipeline)
- "Reprocess All" button (re-chunk + re-embed)

### Deliverables

- [x] `leads` table and CRUD APIs
- [x] In-chat lead capture card (after 3-4 messages)
- [x] Lead capture is skippable and non-blocking
- [x] Dashboard overview page with stat cards
- [x] Conversation list with pagination and search
- [x] Full conversation transcript viewer
- [x] Lead list with pagination
- [x] CSV lead export
- [x] In-app notifications on new lead capture (dashboard bell + unread badge + `notifications` table)
- [x] Knowledge base management UI in bot settings
- [x] Bot settings page (edit name, headline, personality, suggested questions)

### What Works After Stage 6

Everything from Stages 1-5, plus: bot owners have full visibility into their bot's usage. They can see who's chatting, what questions are being asked, and capture recruiter emails as leads. They see in-app notifications in the dashboard the moment a new lead arrives (with an unread-badge counter on the bell icon). This is a **complete product** suitable for early adopters and beta testing.

### Limitations (Resolved in Stage 7)

- No persistent rate limits (in-memory only - risk of credit drain on user's LLM key) -> Stage 7
- No OAuth, no email verification / password reset -> Stage 7
- In-memory rate limiting (not persistent across deploys) -> Stage 7
- No landing page, no GDPR flows, no self-host packaging -> Stage 7

---

## Stage 7: Open-Source Hardening, Compliance & Launch

> **Renamed in v1.1.** Previously "Monetization, Security Hardening & Launch." There is no monetization in ProBot. Stage 7 focuses on the polish work that moves the product from a complete beta (end of Stage 6) to a launch-ready, open-source, self-hostable platform.

### Goal

Harden security to production grade, add Redis-backed rate limiting (as cost-protection for users' BYO LLM credits - uniform, no tier split), ship OAuth + email verification + password reset, build a high-converting open-source landing page, complete GDPR compliance, package the project for self-hosting (Docker / one-click deploy), and add monitoring.

### What the User Sees

1. **Landing page**: Hero section, live demo, "Free & Open Source · Bring Your Own Key" messaging, self-host CTA, GitHub link, social proof
2. **All features available to all users** - no paywalls, no upgrade prompts, no billing UI
3. **OAuth sign-in**: Google, GitHub, LinkedIn (in addition to email/password)
4. **Email verification & password reset**: standard flows
5. **AI Model settings**: full provider/model picker, BYO-key management, "key active · stored locally" status
6. **Account controls**: data export (JSON), account deletion (purges all data within 30 days)
7. **Self-hosters see**: a one-command Docker deploy, sample `.env`, and a documented config schema for tuning rate limits

### SRS Requirements Covered

- **FR-001.2**: OAuth login (Google, GitHub, LinkedIn) - deferred from Stage 1
- **FR-001.5-1.6**: Email verification, password reset
- **FR-002.7-2.8**: Custom instructions, theme color (available to **all** users in v1.1 - no longer Pro-gated)
- **FR-002.10**: Bot preview before publishing
- **FR-007.10**: Dashboard surfaces active LLM provider/model + key status ("active · stored locally")
- **FR-010.1-10.9**: Open-source distribution, multi-provider BYO-key, local-only key storage, no telemetry by default, configurable rate limits
- **Section 5.1.1**: Landing page specification (open-source / BYO-key messaging)
- **Section 6**: All non-functional requirements
- **Section 9**: All security requirements (incl. SEC-D06: key never persisted server-side)
- **NFR-C01-C05**: Compliance requirements (GDPR, ToS, Privacy Policy)

### Technical Implementation

#### 7.1 Database Schema Additions

```sql
-- Add OAuth fields (v1.1: NO tier, NO stripe_customer_id, NO stripe_subscription_id)
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;  -- OAuth users don't have passwords
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20);
ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255);

-- Add theme_color and custom_instructions to bots (available to all users)
ALTER TABLE bots ADD COLUMN theme_color VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE bots ADD COLUMN custom_instructions TEXT;

-- Per-bot rate-limit overrides (self-host / power users)
ALTER TABLE bots ADD COLUMN rate_limit_per_minute INTEGER;   -- NULL = use platform default
ALTER TABLE bots ADD COLUMN rate_limit_per_day INTEGER;      -- NULL = use platform default
```

**Backward Compatibility**: All new columns are nullable or have defaults. Existing users and bots continue to work without migration. No `tier`, `stripe_customer_id`, `stripe_subscription_id`, or `usage_logs` table - these are removed from the v1.1 plan.

#### 7.2 (Removed) Stripe Integration

> **Removed in v1.1.** No Stripe SDK, no `src/lib/payments/` directory, no checkout flow, no webhooks, no billing portal, no `/api/payments/*` routes. ProBot is free.

#### 7.3 (Removed) Tier Enforcement Middleware

> **Removed in v1.1.** All features are available to all users. There is no `enforceTierLimits`. Rate limits below are uniform cost-protection guardrails, not tier gates.

#### 7.4 Redis-Backed Rate Limiting (Uniform, BYO-credit Protection)

Replace VAi's in-memory Maps with Upstash Redis. These limits exist to protect the user's own LLM credits and are configurable by self-hosters via env vars or per-bot overrides (`bots.rate_limit_per_minute`, `bots.rate_limit_per_day`).

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

const PER_MINUTE = Number(process.env.PROBOT_RATE_PER_MINUTE ?? 10);
const PER_DAY = Number(process.env.PROBOT_RATE_PER_DAY ?? 200);

// Window rate limit (per recruiter IP per bot)
const windowLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(PER_MINUTE, "60 s"),
  prefix: "rl:window",
});

// Daily rate limit (per bot total)
const dailyLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(PER_DAY, "24 h"),
  prefix: "rl:daily",
});
```

Per-bot overrides (when set) take precedence over the platform defaults - empowering self-hosters and individual bot owners to tune for their own LLM budget.

#### 7.5 OAuth Authentication

Extend NextAuth config:

```typescript
providers: [
  CredentialsProvider({ /* existing email/password */ }),
  GoogleProvider({ clientId: ..., clientSecret: ... }),
  GitHubProvider({ clientId: ..., clientSecret: ... }),
  LinkedInProvider({ clientId: ..., clientSecret: ... }),
]
```

#### 7.6 Email Verification & Password Reset

```
POST /api/auth/verify-email     # Verify token from email link
POST /api/auth/forgot-password  # Send reset email
POST /api/auth/reset-password   # Reset with token
```

Using **Resend** for transactional auth emails only (verification + password reset). Stage 6 explicitly does **not** use email for lead notifications - those are in-app. **AWS SES is not used** (sandbox-mode friction + production-access ticket friction make it a poor fit for the open-source self-host story; Resend is the easier path for both us and self-hosters).

#### 7.7 Landing Page

```
src/app/
  page.tsx          # Landing page (replaces simple redirect)
    ├── Hero section: "Don't just send a resume; send a representative"
    │     Subtitle: "Free, open source, and BYO-key - your API key never leaves your browser."
    ├── How It Works: 3-step visual (Upload → Pick Provider + Paste Key → Share)
    ├── Live Demo: Interactive widget showing a sample bot
    ├── Features grid: 6 key features with icons
    ├── Open-source section: "MIT licensed · self-host in one command · GitHub ★"
    ├── Privacy promise: "Your API key is stored in your browser. ProBot servers never see it." (links to SEC-D06)
    ├── Social proof: Testimonials / usage stats / GitHub stars
    └── CTA: "Create Your Bot in 2 Minutes" → /register   +   "Self-host on your own infra" → /docs/self-host
```

> No pricing table. No "Upgrade to Pro" button. The Pro/Free comparison from the v1.0 plan is removed.

#### 7.8 Security Hardening Checklist

All items from SRS Section 9, verified and production-ready:

**Input Security (from VAi):**

- [x] `sanitizeMessage()` with 40+ blocked patterns (ported in Stage 1)
- [x] Unicode normalization, homoglyph replacement (ported in Stage 1)
- [x] 8,000 char input limit, 16KB body limit (ported in Stage 1)
- [x] Content-Type validation (ported in Stage 1)

**Prompt Security (from VAi):**

- [x] Immutable rules in system prompt (ported in Stage 1)
- [x] Identity lock, context-only constraint, prompt protection (ported in Stage 1)
- [x] Override resistance, graceful degradation (ported in Stage 1)

**Output Security (from VAi):**

- [x] `sanitizeOutput()` with leakage detection (ported in Stage 1)
- [x] 1,500 char output limit (ported in Stage 1)

**HTTP Security Headers:**

- [x] All headers from VAi's `next.config.js` (ported in Stage 1)
- [x] Add `Content-Security-Policy` for widget embedding (new)
- [x] Add `Strict-Transport-Security` for HTTPS enforcement (new)

**Authentication & Authorization:**

- [x] bcrypt password hashing (Stage 1)
- [x] HTTP-only, Secure, SameSite session cookies (Stage 1)
- [x] Tenant isolation on all queries (Stage 4)
- [x] OAuth token encryption (Stage 7)
- [x] CSRF protection (Stage 7)

**Data Security:**

- [x] TLS 1.2+ on all connections (infrastructure)
- [x] Encrypted database connections (infrastructure)
- [x] File malware scanning (Stage 2)
- [x] Per-bot-id vector namespace isolation (Stage 3)
- [x] API keys as encrypted env vars (infrastructure)

**Rate Limiting (v1.1: uniform, BYO-credit protection):**

- [x] Redis-backed persistent rate limiting (Stage 7, replaces Stage 1 in-memory)
- [x] Per-IP per-bot window rate limit (default 10/min, env-configurable, per-bot override)
- [x] Per-bot daily rate limit (default 200/day, env-configurable, per-bot override)
- [x] Max message length (default 8,000 chars, env-configurable)
- [x] No tier-based splits - uniform defaults for all users

**BYO-Key Security (v1.1):**

- [x] Server never logs, persists, or echoes the `x-llm-api-key` header (SEC-D06)
- [x] Sentry / Vercel log scrubbing rules for the key header and any provider auth header
- [x] Browser stores key in `localStorage` only; never transmitted in request body
- [x] Dashboard surfaces "key active · stored locally" status without round-tripping the key value
- [x] Optional anonymous telemetry is opt-in and OFF by default (FR-010.8)

#### 7.9 Compliance

- [x] Terms of Service page (`/terms`)
- [x] Privacy Policy page (`/privacy`)
- [x] Cookie consent banner
- [x] Account deletion endpoint (removes all user data within 30 days)
- [x] Data export endpoint (download all user data as JSON)

#### 7.10 Monitoring & Error Tracking

```json
{
  "@sentry/nextjs": "^8.0.0",
  "@vercel/analytics": "^1.0.0"
}
```

- Sentry for error tracking (frontend + API)
- Vercel Analytics for performance monitoring
- Custom logging for: chat API errors, rate limit hits, ingestion failures

### Deliverables

- [x] Redis-backed rate limiting (Upstash) - uniform defaults, env-configurable, per-bot overrides
- [x] OAuth login (Google, GitHub, LinkedIn)
- [x] Email verification and password reset flows
- [x] Landing page with hero, demo, open-source / BYO-key messaging, GitHub link, social proof
- [x] Security hardening (CSRF, CSP, HSTS, key-header scrubbing)
- [x] Terms of Service and Privacy Policy pages (explicitly cover the BYO-key model)
- [x] Cookie consent banner
- [x] Account deletion and data export endpoints (GDPR)
- [x] Sentry error tracking with BYO-key header scrubbing
- [x] Bot preview before publishing
- [x] Custom branding (theme color, custom instructions) - available to all users
- [x] AI model & API-key management UI (provider/model selector, "key active · stored locally" status, switch/remove key)
- [x] Self-host packaging: `Dockerfile`, `docker-compose.yml`, sample `.env`, one-command quickstart, self-host docs. Recommended deploy targets: **Vercel** (preferred - same as the hosted deployment), **Render** / **Fly.io** / **Railway** / **AWS Lightsail** (flat-rate, predictable). **AWS EC2 is intentionally NOT a recommended target** - its post-July-2025 credit model is complex for new users and bills unpredictably after credits expire. AWS S3 + CloudFront (used in Stages 2 + 5) remain the only AWS services in the stack.
- [x] Public GitHub repository (MIT license, CONTRIBUTING, README, security policy)

### What Works After Stage 7

**Everything.** The full ProBot platform is production-ready and open source:

- Users sign up (email or OAuth), pick an LLM provider/model, paste their own API key (stored locally only), and create bots from PDFs/URLs/text
- Bots use RAG for intelligent, contextual answers via the user's chosen provider (Anthropic / Google / DeepSeek / OpenAI)
- Public URLs and embeddable widgets for distribution
- Dashboard with analytics, conversation logs, lead capture, and LLM key status
- Uniform, configurable rate limits protecting users' own LLM credits
- Production-grade security matching (and exceeding) VAi's patterns; BYO key never persisted server-side
- GDPR compliance, monitoring, and error tracking
- One-command self-host via Docker for users who want full control

---

## Summary: Stage Comparison Matrix

| Feature                              | S1  | S2  | S3  | S4  | S5  | S6  | S7  |
| ------------------------------------ | --- | --- | --- | --- | --- | --- | --- |
| User auth (email/password)           | x   | x   | x   | x   | x   | x   | x   |
| OAuth (Google/GitHub/LinkedIn)       |     |     |     |     |     |     | x   |
| BYO-key LLM (multi-provider)         | x   | x   | x   | x   | x   | x   | x   |
| Local-only API-key storage           | x   | x   | x   | x   | x   | x   | x   |
| Bot creation (text input)            | x   | x   | x   | x   | x   | x   | x   |
| PDF upload                           |     | x   | x   | x   | x   | x   | x   |
| URL scraping                         |     | x   | x   | x   | x   | x   | x   |
| Text chunking                        |     | x   | x   | x   | x   | x   | x   |
| Full-context chat (VAi-style)        | x   | x   | \*  | \*  | \*  | \*  | \*  |
| RAG pipeline (vector search)         |     |     | x   | x   | x   | x   | x   |
| Provider-aware embeddings            |     |     | x   | x   | x   | x   | x   |
| Private chat (auth required)         | x   | x   | x   | x   | x   | x   | x   |
| Public chat URL (`/u/username`)      |     |     |     | x   | x   | x   | x   |
| Embeddable widget                    |     |     |     |     | x   | x   | x   |
| Conversation logging                 |     |     |     | x   | x   | x   | x   |
| Dashboard analytics                  |     |     |     |     |     | x   | x   |
| Lead capture                         |     |     |     |     |     | x   | x   |
| In-app notifications (lead capture)  |     |     |     |     |     | x   | x   |
| Transactional auth email (Resend)    |     |     |     |     |     |     | x   |
| Redis rate limiting (uniform)        |     |     |     |     |     |     | x   |
| Landing page (open-source / BYO-key) |     |     |     |     |     |     | x   |
| GDPR compliance                      |     |     |     |     |     |     | x   |
| Self-host packaging (Docker)         |     |     |     |     |     |     | x   |
| Input sanitization (VAi)             | x   | x   | x   | x   | x   | x   | x   |
| Output sanitization (VAi)            | x   | x   | x   | x   | x   | x   | x   |
| Prompt engineering (VAi)             | x   | x   | x   | x   | x   | x   | x   |

`*` = Full-context is kept as fallback for legacy bots; new bots use RAG from Stage 3 onward.

> **Removed in v1.1:** "Stripe billing (Free/Pro)" row - no payments in any stage.

---

## Estimated Effort per Stage

| Stage | Description                                     | Complexity  | New Infra                                                                 |
| ----- | ----------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| **1** | Foundation + Auth + BYO-key Text Chat           | Medium      | PostgreSQL, NextAuth, multi-provider LLM client (Anthropic / OpenAI min.) |
| **2** | PDF/URL Ingestion                               | Medium      | AWS S3 (5 GB Always Free)                                                 |
| **3** | RAG + Vector Search (provider-aware embeddings) | High        | Pinecone or pgvector                                                      |
| **4** | Public URLs + Multi-Tenant                      | Medium      | None (routing only)                                                       |
| **5** | Embeddable Widget                               | Medium      | AWS S3 + CloudFront (1 TB Always Free)                                    |
| **6** | Dashboard + Analytics + Leads (in-app notif)    | Medium-High | None new (extends existing Postgres with `notifications` table)           |
| **7** | OAuth + Compliance + Self-host + Launch         | High        | Redis (Upstash), OAuth providers, Docker packaging (NO Stripe in v1.1)    |

---

## Tech Stack (Final)

| Layer                    | Technology                                                                                                               | Introduced In |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------- |
| **Framework**            | Next.js 14+ (App Router)                                                                                                 | Stage 1       |
| **Language**             | TypeScript                                                                                                               | Stage 1       |
| **Styling**              | Tailwind CSS                                                                                                             | Stage 1       |
| **ORM**                  | Drizzle ORM                                                                                                              | Stage 1       |
| **Database**             | PostgreSQL (Supabase/Neon)                                                                                               | Stage 1       |
| **Auth**                 | NextAuth.js (email/password in Stage 1; OAuth in Stage 7)                                                                | Stage 1       |
| **AI (Chat)**            | Multi-provider BYO-key client: Anthropic Claude, Google Gemini, DeepSeek, OpenAI GPT (key stored locally, never tracked) | Stage 1       |
| **AI (Embeddings)**      | Provider-matched embeddings (OpenAI `text-embedding-3-small`, Google `text-embedding-004`, Anthropic Voyage, DeepSeek)   | Stage 3       |
| **Vector DB**            | Pinecone or Supabase pgvector                                                                                            | Stage 3       |
| **File Storage**         | AWS S3 (Always Free: 5 GB + 20K GET + 2K PUT)                                                                            | Stage 2       |
| **CDN**                  | AWS CloudFront (Always Free: 1 TB + 10M req) - fronts S3 for `widget.js`                                                 | Stage 5       |
| **Widget Build**         | esbuild                                                                                                                  | Stage 5       |
| **In-app notifications** | Postgres `notifications` table + dashboard bell badge (no email)                                                         | Stage 6       |
| **Transactional email**  | **Resend** (auth flows only: verify email + password reset). AWS SES intentionally not used.                             | Stage 7       |
| **License**              | MIT (open source, no payments)                                                                                           | Stage 7       |
| **Cache/Rate Limit**     | Upstash Redis (uniform, configurable, BYO-credit protection)                                                             | Stage 7       |
| **Self-Host**            | Docker + docker-compose                                                                                                  | Stage 7       |
| **Monitoring**           | Sentry + Vercel Analytics (with `x-llm-api-key` header scrubbing)                                                        | Stage 7       |
| **Hosting**              | Vercel (also self-hostable on any Node 20+ host)                                                                         | Stage 1       |

> **Removed in v1.1:** Stripe is not part of the stack.
>
> **Removed in this revision (post Stage 1 close-out):** AWS SES (replaced by Resend for auth-only emails; Stage 6 lead notifications are now in-app). AWS EC2 (not a recommended deploy target - Vercel primary; Render / Fly.io / Railway / Lightsail for self-hosters). The AWS surface is now strictly **S3 (Stage 2) + CloudFront (Stage 5)** for clean Always Free tier coverage.
