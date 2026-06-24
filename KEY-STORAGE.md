# Key storage & KEK rotation

Managed mode encrypts every stored LLM key with a fresh per-bot **DEK** (Data
Encryption Key, AES-256-GCM), then wraps that DEK with a **KEK** (Key Encryption
Key) loaded from `PROBOT_KEY_ENCRYPTION_KEY` (32 bytes, base64-encoded). The KEK
never touches the database, so a DB dump alone cannot decrypt anything.

## Rotating the KEK

Rotate quarterly (or after any suspected exposure):

1. Generate a fresh key:
   ```bash
   openssl rand -base64 32
   ```
2. Deploy with **both** env vars set: `PROBOT_KEY_ENCRYPTION_KEY` (current) and `PROBOT_KEY_ENCRYPTION_KEY_NEXT` (new).
3. Preview, then commit the re-wrap:
   ```bash
   npm run kek:rotate -- --dry-run   # preview
   npm run kek:rotate                # re-wrap every stored DEK with the new KEK
   ```
   The encrypted LLM keys themselves are untouched - only the DEK wrapping changes.
4. Promote the new KEK to current (`PROBOT_KEY_ENCRYPTION_KEY = <new>`), drop `PROBOT_KEY_ENCRYPTION_KEY_NEXT`, and redeploy.

## Self-hosting without managed storage

Self-host operators who don't enable managed mode leave `PROBOT_KEY_ENCRYPTION_KEY`
unset. The dashboard's "store key on server" path returns `503`, and users
authenticate every chat from the browser's encrypted IndexedDB store instead -
the key never leaves their machine.

See [BYO-KEY.md](BYO-KEY.md) for the end-to-end key flow.
