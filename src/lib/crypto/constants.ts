// Envelope encryption parameters. AES-256-GCM with a 12-byte IV and the
// default 16-byte auth tag is the recommended baseline for symmetric
// authenticated encryption in 2026; nothing fancier (e.g. AES-SIV, ChaCha20-
// Poly1305) is justified for protecting a short-lived in-memory plaintext.

export const KEY_ALGORITHM = "aes-256-gcm" as const;
export const KEY_LENGTH_BYTES = 32; // 256-bit DEK / KEK
export const IV_LENGTH_BYTES = 12; // GCM-recommended IV size
export const AUTH_TAG_LENGTH_BYTES = 16;

// Env-var name for the Key Encryption Key. Required only on operators that
// want to enable the managed-key flow; self-host-only operators can omit it
// and the dashboard's "store key on server" path will surface a clear error.
export const KEK_ENV_VAR = "PROBOT_KEY_ENCRYPTION_KEY";
