# BYO-key flow

ProBot is **bring-your-own-key**: you supply your own LLM provider API key, and
ProBot uses it to power your bot. There are two paths for where the key lives.

## Path 1 - Self-hosted / creator-local (default)

The key stays in your browser and rides each request as a header.

```
Bot Factory (AI model step) ── apiKey ──► IndexedDB (AES-256-GCM, non-extractable CryptoKey)
                                                │
                                                ▼
                    ChatWindow.send() awaits getApiKey() (decrypts in browser)
                                                │
                                                ▼
         fetch("/api/chat/[botId]", { headers: { "x-llm-api-key": apiKey } })
                                                │
                                                ▼
                  /api/chat/[botId] reads the header, calls the provider
                                                │
                                                ▼
   provider.complete({ apiKey, … }) ──HTTPS──► Anthropic / OpenAI / Azure / Gemini
```

## Path 2 - Managed (pro-bot.dev, opt-in)

If you don't want to re-enter the key on every device, store it server-side with
[envelope encryption](KEY-STORAGE.md).

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
   recruiter chat with no header → /api/chat/[botId] looks up the row,
   unwraps the DEK, decrypts the key in-memory, calls the provider,
   discards the plaintext, writes a decrypt-audit-log row.
```

## Guarantees

The key never enters a JSON body, never gets logged, and never appears in any
error message or response. A canary-key test enforces this at every layer, and
the CI guard `npm run check:key-leaks` greps every source file for `console.*` /
`Sentry.*` calls referencing key-shaped property names and fails the build if any
are found outside the allowlisted modules.

When you self-host without enabling managed mode, leave the KEK env var unset;
the "store key on server" path is disabled and every chat authenticates from the
browser's encrypted store.
