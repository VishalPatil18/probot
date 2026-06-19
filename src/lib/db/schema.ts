import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
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
