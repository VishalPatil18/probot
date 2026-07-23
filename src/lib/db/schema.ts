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

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

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
  notifyLeadsEmail: boolean("notify_leads_email").notNull().default(false),
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
    contextTokenCap: integer("context_token_cap").notNull().default(12000),
    suggestedQuestions: jsonb("suggested_questions").$type<string[]>(),
    loadingMessages: jsonb("loading_messages")
      .$type<string[]>()
      .notNull()
      .default(
        sql`'["Thinking…","Searching memory…","Drafting a response…","Almost ready…"]'::jsonb`,
      ),
    themeColor: varchar("theme_color", { length: 7 })
      .notNull()
      .default("#7c5cff"),
    image: text("image"),
    customInstructions: text("custom_instructions"),
    previewToken: text("preview_token"),
    rateLimitPerMinute: integer("rate_limit_per_minute"),
    rateLimitPerDay: integer("rate_limit_per_day"),
    rateLimitMaxChars: integer("rate_limit_max_chars"),
    isActive: boolean("is_active").notNull().default(false),
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
    azureEndpoint: text("azure_endpoint"),
    azureApiVersion: varchar("azure_api_version", { length: 64 }),
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
    scheduledPurgeAtIdx: index("deletion_requests_scheduled_purge_at_idx").on(
      table.scheduledPurgeAt,
    ),
  }),
).enableRLS();

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
    botStartedIdx: index("conversations_bot_started_idx").on(
      table.botId,
      table.startedAt.desc(),
    ),
    botSessionUnique: uniqueIndex("conversations_bot_session_unique").on(
      table.botId,
      table.sessionId,
    ),
  }),
).enableRLS();

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
    convCreatedIdx: index("messages_conv_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    roleCheck: check(
      "messages_role_check",
      sql`${table.role} IN ('user', 'assistant', 'system', 'tool')`,
    ),
  }),
).enableRLS();

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
