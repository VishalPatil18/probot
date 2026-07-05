# BYO-key flow

ProBot is **bring-your-own-key**: you supply your own LLM provider API key, and
ProBot uses it to power your bot. The key is envelope-encrypted end-to-end -
never logged in plaintext, never returned in a response, never written to disk
unwrapped.

## Managed encryption (default on pro-bot.dev)

The bot owner stores their key once from the dashboard. The server envelopes it
under a per-bot Data Encryption Key (DEK), which is itself wrapped under a
Key Encryption Key (KEK) held **outside** the database. A database-only leak
is useless without the KEK.

```
AIModelKeyTab → POST /api/bots/[botId]/llm-key { apiKey }
                                                │
                                                ▼
              envelope-encrypt: random DEK → AES-GCM ciphertext;
              DEK wrapped under a KEK from the PROBOT_KEY_ENCRYPTION_KEY env
                                                │
                                                ▼
                       encrypted_llm_keys (per-bot row; KEK never in DB)
                                                │
                                                ▼
   recruiter chat → /api/chat/[botId] looks up the row, unwraps the DEK,
   decrypts the key in-memory, calls the provider, discards the plaintext,
   writes a decrypt-audit-log row.
```

The bot owner's own dashboard test chat also uses the encrypted store path;
there is no plaintext key on any surface the visitor or the operator can read.

## Self-hosting without managed storage

Operators who don't set the KEK env var (`PROBOT_KEY_ENCRYPTION_KEY`) get the
managed-storage path disabled: `POST /api/bots/[botId]/llm-key` returns 503,
and chats need to be served by the self-hosted `probot-bot` runtime where the
operator holds the plaintext key themselves. See [self-hosted-bot docs](docs/self-hosted-bot/index.mdx).

## Guarantees

The key never enters a JSON body, never gets logged, and never appears in any
error message or response. A canary-key test enforces this at every layer, and
the CI guard `npm run check:key-leaks` greps every source file for `console.*` /
`Sentry.*` calls referencing key-shaped property names and fails the build if any
are found outside the allowlisted modules.
