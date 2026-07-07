import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// Postgres `bytea` column mapped to a Node Buffer. Drizzle has no first-class
// bytea helper, so this minimal customType bridges it - used by user_avatars to
// store uploaded profile photos in the database (zero external storage).
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

// users
// The LLM API key is intentionally NOT stored here - it lives only in the
// user's browser (localStorage `probot.llm.key.v1`) and rides the
// `x-llm-api-key` header per chat request.
// RLS is enabled with no policies so Supabase PostgREST anon/authenticated
// roles are denied by default; the app's pg.Pool (table-owner) connection
// is unaffected because we do NOT use FORCE ROW LEVEL SECURITY.
// hashed_password is nullable because OAuth + magic-link users have no
// password. email_verified is a nullable timestamp (NextAuth shape):
// null = unverified, non-null = verified at that timestamp.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 30 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  llmProvider: varchar("llm_provider", { length: 20 })
    .notNull()
    .default("anthropic"),
  llmModel: varchar("llm_model", { length: 60 }),
  // Opt-in: email the owner when a new lead is captured (off by default).
  // Reuses the Resend transport already wired for auth emails.
  notifyLeadsEmail: boolean("notify_leads_email").notNull().default(false),
  // Last time the user acknowledged the legal effective date (Terms/Privacy).
  // NULL = never acknowledged. The dashboard banner shows when
  // LEGAL_EFFECTIVE_AT is newer than this; dismissing sets it to now().
  lastLegalAckDate: timestamp("last_legal_ack_date", {
    mode: "date",
    withTimezone: false,
  }),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: false,
  }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

// bots
export const bots = pgTable(
  "bots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    headline: varchar("headline", { length: 120 }),
    personality: varchar("personality", { length: 20 })
      .notNull()
      .default("professional"),
    contextText: text("context_text").notNull(),
    // Per-bot cap (in tokens) on the assembled `context_text` reassembled from
    // knowledge_base chunks. Default 12_000 ≈ 50K chars - safe for Haiku/gpt-4o-mini
    // with room for chat history. Surfaced as an Advanced setting in the Bot
    // Factory; raising it risks model context-window overflow.
    contextTokenCap: integer("context_token_cap").notNull().default(12000),
    suggestedQuestions: jsonb("suggested_questions").$type<string[]>(),
    loadingMessages: jsonb("loading_messages")
      .$type<string[]>()
      .notNull()
      .default(
        sql`'["Thinking…","Searching memory…","Drafting a response…","Almost ready…"]'::jsonb`,
      ),
    // Per-bot theme color (hex #RRGGBB) used by the embeddable
    // widget and signature badge. Default matches the brand purple so bots
    // older bots render coherently when the column backfills.
    themeColor: varchar("theme_color", { length: 7 })
      .notNull()
      .default("#7c5cff"),
    // Per-bot avatar URL. NULL = render the default ProBot icon. When the
    // owner uploads a bot photo it points at GET /api/bot-avatar/<botId>,
    // which streams the bytes stored in `bot_avatars`. Shown on the public
    // chat header and the embeddable widget.
    image: text("image"),
    // Free-form additions to the system prompt. Max length
    // is enforced at the Zod layer (botInput / botPatchInput) so a future
    // tightening of the cap doesn't require a migration. Injected into the
    // assembled system prompt between the personality block and the response-
    // style block - see prompt-builder.ts.
    customInstructions: text("custom_instructions"),
    // Per-bot draft/publish flow. New bots are created
    // with `is_active=false` + a signed `preview_token` so the creator can
    // chat against the bot privately at `/u/<username>/chat?preview=<token>`
    // before clicking Publish (which flips is_active=true and clears the
    // token). The token is a JWT signed with NEXTAUTH_SECRET so its mere
    // existence in the URL cannot grant anyone else access without verifying
    // against the bot row.
    previewToken: text("preview_token"),
    // Per-bot configurable rate limits. NULL means the
    // env-var default (PROBOT_RATE_PER_MINUTE / PROBOT_RATE_PER_DAY /
    // PROBOT_RATE_MAX_CHARS) takes over - lets a self-host operator tune the
    // baseline without touching every bot row.
    rateLimitPerMinute: integer("rate_limit_per_minute"),
    rateLimitPerDay: integer("rate_limit_per_day"),
    rateLimitMaxChars: integer("rate_limit_max_chars"),
    // New bots default to inactive. Bots created before
    // this migration backfill to `true` via the migration so existing
    // published bots are unaffected.
    isActive: boolean("is_active").notNull().default(false),
    // Where the bot's chat runtime lives. 'managed' = served by this
    // platform (public /u/<username>/chat + embed widget). 'self_hosted' =
    // the owner embeds the `probot-self-hosted` npm package in their own
    // webapp; the chat runs entirely there and only conversation/lead
    // analytics are POSTed back to the platform. Default keeps every
    // existing bot on the managed path.
    deploymentMode: varchar("deployment_mode", { length: 16 })
      .notNull()
      .default("managed"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("bots_user_id_idx").on(table.userId),
  }),
).enableRLS();

// accounts (NextAuth standard schema for OAuth + EmailProvider).
// One row per (user, provider, providerAccountId) tuple.
// The Drizzle adapter is the only writer.
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("accounts_user_id_idx").on(account.userId),
  }),
).enableRLS();

// verification_tokens (NextAuth standard schema for magic-link tokens).
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: false,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
).enableRLS();

// encrypted_llm_keys (managed-key path)
// One row per bot whose owner opted in to managed key storage. The user's
// LLM API key is NEVER stored in plaintext - the columns hold an envelope-
// encryption payload (see src/lib/crypto/envelope.ts):
//   - {ciphertext, iv, auth_tag}: the user's key encrypted with a per-bot
//     DEK (Data Encryption Key) under AES-256-GCM.
//   - {wrapped_dek, dek_iv, dek_auth_tag}: the DEK encrypted with the KEK
//     stored in PROBOT_KEY_ENCRYPTION_KEY (env). The KEK never touches the
//     DB so a leaked DB dump alone cannot decrypt anything.
// `provider` is a non-sensitive denormalisation of the bot owner's chosen
// provider at key-store time so the chat route can confirm the key matches
// the active provider without an extra users-table read.
export const encryptedLlmKeys = pgTable(
  "encrypted_llm_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    wrappedDek: text("wrapped_dek").notNull(),
    dekIv: text("dek_iv").notNull(),
    dekAuthTag: text("dek_auth_tag").notNull(),
    provider: varchar("provider", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    botIdUnique: uniqueIndex("encrypted_llm_keys_bot_id_unique").on(
      table.botId,
    ),
  }),
).enableRLS();

// decrypt_audit_log
// One row per server-side decrypt of a managed LLM key. Surfaced in the
// dashboard so creators can see when their key was used. We deliberately
// store ONLY the timestamp and a SHA-256 hash of the recruiter IP - never
// the raw IP, never any portion of the decrypted key. 30-day retention is
// enforced by the cleanup cron job (no rows are pruned yet since
// the cron infrastructure lands later).
export const decryptAuditLog = pgTable(
  "decrypt_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    decryptedAt: timestamp("decrypted_at", {
      mode: "date",
      withTimezone: false,
    })
      .notNull()
      .defaultNow(),
    requesterIpHash: varchar("requester_ip_hash", { length: 64 }),
  },
  (table) => ({
    botDecryptedIdx: index("decrypt_audit_log_bot_decrypted_idx").on(
      table.botId,
      table.decryptedAt.desc(),
    ),
  }),
).enableRLS();

// password_reset_tokens
// One row per outstanding reset request. `token_hash` stores SHA-256 of the
// raw token we email; the raw token never touches the DB so a leaked dump
// cannot be used to take over accounts. TTL = 1 hour. `used_at` makes tokens
// strictly single-use - a second POST with the same token is rejected.
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: false,
    }).notNull(),
    usedAt: timestamp("used_at", { mode: "date", withTimezone: false }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("password_reset_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
  }),
).enableRLS();

// deletion_requests
// One row per outstanding account-deletion request. The grace period is
// `scheduled_purge_at - requested_at` (7 days in code). Snapshots
// `email_snapshot` + `username_snapshot` so the post-purge completion
// email can still reach the (now-deleted) user.
//
// `undo_token_hash` is the SHA-256 of the raw token we email the user.
// They click the link, type their username to confirm, and the row gets
// deleted - cancelling the purge. The raw token never touches the DB; same
// pattern as password_reset_tokens.
//
// `confirmation_username` is what the user typed in the GitHub-style
// confirmation modal at delete-init time. Stored so the post-incident
// audit can answer "did they type their own username, not someone else's
// by mistake or via a CSRF?" - we already validate at request time but
// the historic value is useful forensics.
//
// `purged_at` flips from null to a timestamp the moment the cron job
// finishes purging this user's data. The row itself sticks around briefly
// for one more cron run (so the completion email can be sent from the
// snapshot), then gets cleaned up.
export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailSnapshot: varchar("email_snapshot", { length: 255 }).notNull(),
    usernameSnapshot: varchar("username_snapshot", { length: 30 }).notNull(),
    confirmationUsername: varchar("confirmation_username", {
      length: 30,
    }).notNull(),
    undoTokenHash: varchar("undo_token_hash", { length: 64 }).notNull(),
    requestedAt: timestamp("requested_at", {
      mode: "date",
      withTimezone: false,
    })
      .notNull()
      .defaultNow(),
    scheduledPurgeAt: timestamp("scheduled_purge_at", {
      mode: "date",
      withTimezone: false,
    }).notNull(),
    purgedAt: timestamp("purged_at", { mode: "date", withTimezone: false }),
    completionEmailSentAt: timestamp("completion_email_sent_at", {
      mode: "date",
      withTimezone: false,
    }),
  },
  (table) => ({
    userIdUnique: uniqueIndex("deletion_requests_user_id_unique").on(
      table.userId,
    ),
    undoTokenHashUnique: uniqueIndex(
      "deletion_requests_undo_token_hash_unique",
    ).on(table.undoTokenHash),
    scheduledPurgeAtIdx: index(
      "deletion_requests_scheduled_purge_at_idx",
    ).on(table.scheduledPurgeAt),
  }),
).enableRLS();

// email_verification_tokens
// Sent to credentials-registered users at signup time. Magic-link signups
// don't use this table - NextAuth's `verification_tokens` covers them and
// sets `email_verified` on click. TTL = 24 hours. Verifying the email
// deletes the row (no `used_at` column needed - presence implies pending).
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: false,
    }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex(
      "email_verification_tokens_token_hash_unique",
    ).on(table.tokenHash),
    userIdIdx: index("email_verification_tokens_user_id_idx").on(table.userId),
  }),
).enableRLS();

// knowledge_base
// One row per chunk. A bot's `context_text` is reassembled by concatenating
// all chunks for the bot ordered by (source_name, chunk_index) and truncated
// to `bots.context_token_cap`. `source_type` is 'pdf' or 'text'; per-source
// replace on re-ingestion (delete WHERE bot_id=? AND source_name=?).
export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    sourceType: varchar("source_type", { length: 10 }).notNull(),
    sourceName: varchar("source_name", { length: 255 }).notNull(),
    contentText: text("content_text").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count").notNull(),
    // RAG: OpenAI text-embedding-3-large truncated to 1536 dims via
    // the API's `dimensions` parameter (Matryoshka representation). Nullable
    // because (a) older bots have no embeddings, and (b) ingestion-time
    // embedding may be skipped when the user does not supply an OpenAI key.
    // Bots without embeddings fall back to the assembled `bots.context_text`.
    embedding: vector("embedding", { dimensions: 1536 }),
    embeddingModel: varchar("embedding_model", { length: 60 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    botIdIdx: index("knowledge_base_bot_id_idx").on(table.botId),
    botSourceIdx: index("knowledge_base_bot_source_idx").on(
      table.botId,
      table.sourceName,
    ),
  }),
).enableRLS();

// conversations
// One row per recruiter session on a bot. Created earlier;
// chat persistence writes land in the current flow. `session_id` is a
// client-supplied opaque UUID (generated per browser tab via sessionStorage
// in the chat UI). `recruiter_ip` is INTENTIONALLY omitted; raw IPs are PII
// and the GDPR / consent surface lives in a later addition. `recruiter_email` is
// populated by the lead-capture flow for quick dashboard
// lookups; the canonical lead record lives in `leads`.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    recruiterEmail: varchar("recruiter_email", { length: 255 }),
    messageCount: integer("message_count").notNull().default(0),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", {
      mode: "date",
      withTimezone: false,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    botIdIdx: index("conversations_bot_id_idx").on(table.botId),
    // Dashboard lists conversations ordered by recency per bot.
    // Composite (bot_id, started_at DESC) covers both the equality filter
    // and the ORDER BY in a single index scan.
    botStartedIdx: index("conversations_bot_started_idx").on(
      table.botId,
      table.startedAt.desc(),
    ),
    // Unique on (bot_id, session_id) so concurrent tabs on the same bot for
    // the same recruiter cannot double-insert and skew the analytics metrics.
    botSessionUnique: uniqueIndex("conversations_bot_session_unique").on(
      table.botId,
      table.sessionId,
    ),
  }),
).enableRLS();

// messages
// One row per chat turn (user + assistant), child of conversations. Created
// for the analytics surface - no code writes yet.
// `tokens_used` is nullable because the provider response may not include a
// usage breakdown for every model.
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 10 }).notNull(),
    content: text("content").notNull(),
    tokensUsed: integer("tokens_used"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(
      table.conversationId,
    ),
    // Conversation transcript view scans all messages for a
    // conversation in chronological order. Composite (conversation_id,
    // created_at) covers both predicates in one index.
    convCreatedIdx: index("messages_conv_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    // Lock the role to the allowed values at the DB level so a typo
    // ('assitant') in some future writer can't silently corrupt analytics.
    roleCheck: check(
      "messages_role_check",
      sql`${table.role} IN ('user', 'assistant', 'system', 'tool')`,
    ),
  }),
).enableRLS();

// leads
// Captured recruiter emails per bot. `conversation_id` is ON DELETE SET NULL
// (not cascade) so a GDPR-driven conversation purge still
// preserves the lead - the email is business-valuable even if the chat log
// is gone. `context_summary` is filled by the lead-capture client with a
// truncated concatenation of the first 2-3 recruiter messages (deterministic
// and free; LLM-generated summaries would add a paid dependency).
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 255 }).notNull(),
    // Recruiter-supplied contact details (form capture). `name` + `company` are
    // required when a recruiter submits the form; `linkedin_url` is optional.
    // Nullable at the column level so historical email-only leads remain valid.
    name: varchar("name", { length: 120 }),
    company: varchar("company", { length: 160 }),
    linkedinUrl: varchar("linkedin_url", { length: 255 }),
    contextSummary: text("context_summary"),
    capturedAt: timestamp("captured_at", {
      mode: "date",
      withTimezone: false,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    botCapturedIdx: index("leads_bot_captured_idx").on(
      table.botId,
      table.capturedAt.desc(),
    ),
  }),
).enableRLS();

// notifications
// In-app notifications surfaced by the dashboard bell. No email transport in
// the current flow - that lands once Resend is wired for auth emails.
// `kind` is extensible; today the emitters cover 'lead_captured' (any new
// recruiter lead), 'conversation_started' (a fresh chat session lands on a
// bot, from either the managed public URL or a self-hosted webapp), and
// 'knowledge_updated' (an owner uploaded/re-ingested knowledge base
// content). The CHECK constraint mirrors the messages.role pattern so a
// typo cannot silently corrupt the unread badge query. Partial index on
// `read_at IS NULL` keeps the unread-count query O(unread) instead of
// O(total notifications).
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    botId: uuid("bot_id").references(() => bots.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    readAt: timestamp("read_at", { mode: "date", withTimezone: false }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userUnreadIdx: index("notifications_user_unread_idx")
      .on(table.userId, table.createdAt.desc())
      .where(sql`${table.readAt} IS NULL`),
    kindCheck: check(
      "notifications_kind_check",
      sql`${table.kind} IN ('lead_captured','conversation_started','knowledge_updated')`,
    ),
  }),
).enableRLS();

// user_avatars
// One row per user who uploads a custom profile photo. Stores the raw image
// bytes (2 MB cap enforced in the route) plus its MIME type so the serve route
// can set the right Content-Type. One avatar per user, so `user_id` is the PK.
// When set, `users.image` points at GET /api/avatar/<userId>, which reads here.
// Default (animal-icon / OAuth) avatars stay as plain URLs on `users.image` and
// never create a row here.
export const userAvatars = pgTable("user_avatars", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: varchar("content_type", { length: 40 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false })
    .notNull()
    .defaultNow(),
}).enableRLS();

// bot_avatars
// One row per bot whose owner uploaded a custom picture. Same shape + rationale
// as user_avatars: raw image bytes + MIME, one per bot (`bot_id` PK). When set,
// `bots.image` points at GET /api/bot-avatar/<botId>. Bots with the default
// ProBot icon never create a row here.
export const botAvatars = pgTable("bot_avatars", {
  botId: uuid("bot_id")
    .primaryKey()
    .references(() => bots.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: varchar("content_type", { length: 40 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false })
    .notNull()
    .defaultNow(),
}).enableRLS();

// bot_tokens
// API tokens a self-hosted webapp (using the `probot-self-hosted` npm
// package) uses to authenticate to /api/v1/bot/{conversations,leads} so its
// analytics land in the owner's dashboard. The raw token (`pbt_<hex>`) is
// shown to the owner exactly once at mint time; only its SHA-256 hash is
// persisted, so a DB dump cannot be replayed. `revoked_at` is a
// soft-delete: revoking flips it so the auth path rejects instantly without
// losing the audit row. `last_seen_at` is bumped on each authenticated call
// so the dashboard can show liveness.
export const botTokens = pgTable(
  "bot_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 80 }).notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      mode: "date",
      withTimezone: false,
    }),
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: false }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    botIdIdx: index("bot_tokens_bot_id_idx").on(table.botId),
  }),
).enableRLS();

// bot_presets
// A saved snapshot of a bot's configuration (name, headline, personality,
// theme, suggested questions, custom instructions, etc.) that the owner can
// reuse when creating a future bot. Stored as opaque JSON so the preset shape
// can evolve without a migration. Belongs to a user (not a bot) so it survives
// the bot it was captured from. Powers the "Save as preset" action and the
// future multi-bot "Create from preset" flow.
export const botPresets = pgTable(
  "bot_presets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("bot_presets_user_id_idx").on(table.userId),
  }),
).enableRLS();

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type EmailVerificationToken =
  typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken =
  typeof emailVerificationTokens.$inferInsert;
export type EncryptedLlmKey = typeof encryptedLlmKeys.$inferSelect;
export type NewEncryptedLlmKey = typeof encryptedLlmKeys.$inferInsert;
export type DecryptAuditLogEntry = typeof decryptAuditLog.$inferSelect;
export type NewDecryptAuditLogEntry = typeof decryptAuditLog.$inferInsert;
export type DeletionRequest = typeof deletionRequests.$inferSelect;
export type NewDeletionRequest = typeof deletionRequests.$inferInsert;
export type KnowledgeChunk = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeBase.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserAvatar = typeof userAvatars.$inferSelect;
export type NewUserAvatar = typeof userAvatars.$inferInsert;
export type BotAvatar = typeof botAvatars.$inferSelect;
export type NewBotAvatar = typeof botAvatars.$inferInsert;
export type BotToken = typeof botTokens.$inferSelect;
export type NewBotToken = typeof botTokens.$inferInsert;
export type BotPreset = typeof botPresets.$inferSelect;
export type NewBotPreset = typeof botPresets.$inferInsert;
