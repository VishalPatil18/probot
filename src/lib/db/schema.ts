import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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

// users
// The LLM API key is intentionally NOT stored here - it lives only in the
// user's browser (localStorage `probot.llm.key.v1`) and rides the
// `x-llm-api-key` header per chat request. See claude/plan.md §1.5.
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
    isActive: boolean("is_active").notNull().default(true),
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
    // Stage 3 RAG: OpenAI text-embedding-3-large truncated to 1536 dims via
    // the API's `dimensions` parameter (Matryoshka representation). Nullable
    // because (a) Stage 1/2 bots have no embeddings, and (b) ingestion-time
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
// One row per recruiter session on a bot. Created in Stage 4 (plan.md §4.5)
// for the chat-logging story that lands in Stage 6 — no code writes to this
// table yet. `session_id` is a client-supplied opaque ID (UUID generated in
// the chat UI per visit). `recruiter_ip` is INTENTIONALLY omitted; raw IPs
// are PII and the GDPR / consent surface lives in Stage 7.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
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
    // Unique on (bot_id, session_id) so concurrent tabs on the same bot for
    // the same recruiter cannot double-insert and skew the Stage 6 metrics.
    botSessionUnique: uniqueIndex("conversations_bot_session_unique").on(
      table.botId,
      table.sessionId,
    ),
  }),
).enableRLS();

// messages
// One row per chat turn (user + assistant), child of conversations. Created
// in Stage 4 for the Stage 6 analytics surface — no code writes yet.
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
    // Lock the role to the allowed values at the DB level so a typo
    // ('assitant') in some future writer can't silently corrupt analytics.
    roleCheck: check(
      "messages_role_check",
      sql`${table.role} IN ('user', 'assistant', 'system', 'tool')`,
    ),
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
export type KnowledgeChunk = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeBase.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
