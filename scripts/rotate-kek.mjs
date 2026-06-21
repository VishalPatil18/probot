#!/usr/bin/env node
// Stage 7 Phase 7: KEK rotation runbook entrypoint.
//
// Operator flow:
//   1. Generate a new 32-byte base64 key:
//        openssl rand -base64 32
//   2. Deploy with BOTH env vars set:
//        PROBOT_KEY_ENCRYPTION_KEY=<old>
//        PROBOT_KEY_ENCRYPTION_KEY_NEXT=<new>
//   3. Run: `npm run kek:rotate`
//      - Reads every encrypted_llm_keys row.
//      - Unwraps each DEK with the OLD KEK.
//      - Re-wraps each DEK with the NEW KEK.
//      - UPDATEs each row with the new wrapped DEK + IV + auth tag.
//      - The actual ciphertext (encrypted LLM key) is unchanged - only
//        the DEK envelope rotates.
//   4. Promote NEW to current and drop OLD:
//        PROBOT_KEY_ENCRYPTION_KEY=<new>
//        PROBOT_KEY_ENCRYPTION_KEY_NEXT=(unset)
//   5. Redeploy.
//
// The rewrap implementation is duplicated below (not imported from the
// TS module) because Node's .mjs loader doesn't natively run .ts files,
// and we don't want to ship esbuild as a script dep just for this. The
// AES-256-GCM op is small enough that the duplication is acceptable.
// If src/lib/crypto/envelope.ts changes its envelope shape, this script
// MUST be updated in lockstep.
//
// Safety:
//   - Idempotent on a per-row basis: if the script crashes mid-way, you
//     can re-run with both KEKs set. Rows already rotated will fail to
//     decrypt with the OLD KEK; the script logs "skip" and moves on.
//   - DRY-RUN supported: `npm run kek:rotate -- --dry-run`.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { Pool } from "pg";

const KEY_ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;

const DRY_RUN = process.argv.includes("--dry-run");

function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`${name} is not set`);
  }
  return v.trim();
}

function decodeKek(envValue, name) {
  const buf = Buffer.from(envValue, "base64");
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `${name} must decode to ${KEY_LEN} bytes (got ${buf.length})`,
    );
  }
  return buf;
}

function decryptBuffer(payload, key) {
  const decipher = createDecipheriv(
    KEY_ALGO,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
}

function encryptBuffer(plaintext, key) {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(KEY_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function rewrap(row, oldKek, newKek) {
  const wrappedPayload = {
    ciphertext: row.wrapped_dek,
    iv: row.dek_iv,
    authTag: row.dek_auth_tag,
  };
  const dek = decryptBuffer(wrappedPayload, oldKek);
  try {
    return encryptBuffer(dek, newKek);
  } finally {
    dek.fill(0);
  }
}

async function main() {
  const oldKek = decodeKek(
    requireEnv("PROBOT_KEY_ENCRYPTION_KEY"),
    "PROBOT_KEY_ENCRYPTION_KEY",
  );
  const newKek = decodeKek(
    requireEnv("PROBOT_KEY_ENCRYPTION_KEY_NEXT"),
    "PROBOT_KEY_ENCRYPTION_KEY_NEXT",
  );
  const dbUrl = requireEnv("DATABASE_URL");

  if (oldKek.equals(newKek)) {
    throw new Error(
      "PROBOT_KEY_ENCRYPTION_KEY and PROBOT_KEY_ENCRYPTION_KEY_NEXT are identical - rotation would be a no-op",
    );
  }

  const pool = new Pool({ connectionString: dbUrl });

  let rotated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const { rows } = await pool.query(
      "SELECT id, wrapped_dek, dek_iv, dek_auth_tag FROM encrypted_llm_keys",
    );
    console.log(`Found ${rows.length} encrypted_llm_keys rows to rotate.`);

    for (const row of rows) {
      let rewrapped;
      try {
        rewrapped = rewrap(row, oldKek, newKek);
      } catch (err) {
        // Old KEK can't unwrap → likely already rotated. Log + skip.
        console.warn(
          `[skip] row ${row.id}: could not unwrap with old KEK (${err instanceof Error ? err.message : "unknown"})`,
        );
        skipped += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(
          `[dry-run] row ${row.id}: new wrappedDek prefix ${rewrapped.ciphertext.slice(0, 8)}…`,
        );
        rotated += 1;
        continue;
      }

      try {
        await pool.query(
          `UPDATE encrypted_llm_keys
             SET wrapped_dek = $1, dek_iv = $2, dek_auth_tag = $3, updated_at = NOW()
             WHERE id = $4`,
          [rewrapped.ciphertext, rewrapped.iv, rewrapped.authTag, row.id],
        );
        rotated += 1;
      } catch (err) {
        console.error(
          `[fail] row ${row.id}: UPDATE failed (${err instanceof Error ? err.message : "unknown"})`,
        );
        failed += 1;
      }
    }
  } finally {
    await pool.end();
  }

  console.log("");
  console.log(
    `Rotation complete: ${rotated} rotated, ${skipped} skipped (already rotated?), ${failed} failed.`,
  );
  if (DRY_RUN) {
    console.log("(dry-run mode - no UPDATEs were issued)");
  }
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Rotation aborted:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
