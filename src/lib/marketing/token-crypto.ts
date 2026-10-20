import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encrypts Meta access tokens before they're stored in marketing_connections
// / marketing_oauth_pending, so a direct table read never yields a usable
// token even though this app's RLS policy (like every table's — see
// 0002_rls.sql) is "any authenticated user", not a tighter per-row rule.
// This is the extra layer the brief asks for ("keep access tokens secure on
// the server") given that existing shape — never exported to a Client
// Component, and never decrypted anywhere outside the server-only Meta
// Graph API helpers in src/lib/marketing/meta-graph.ts.
//
// Requires MARKETING_TOKEN_ENCRYPTION_KEY — a 32-byte key, base64-encoded
// (e.g. `openssl rand -base64 32`) — as a Vercel project environment
// variable. Until it's set, connecting an account will fail loudly rather
// than silently storing a token in plain text.

function getKey(): Buffer {
  const raw = process.env.MARKETING_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MARKETING_TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it as a Vercel environment variable before connecting a Facebook/Instagram account."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("MARKETING_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

/** AES-256-GCM, encoded as `iv:authTag:ciphertext` (all base64) in one
 * string so it fits a single text column. */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Stored token is not in the expected encrypted format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
