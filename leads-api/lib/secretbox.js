// AES-256-GCM for secrets stored in the database (the hosts' Google refresh tokens).
// Key: TALK_TOKEN_KEY, 32 random bytes as base64 (`openssl rand -base64 32`).
// Stored form: "v1.<iv>.<ciphertext>.<tag>", each part base64url.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** The 32-byte key from its base64/base64url text, or null when missing or malformed. */
export function parseKey(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const key = Buffer.from(text.trim(), text.includes('-') || text.includes('_') ? 'base64url' : 'base64');
  return key.length === 32 ? key : null;
}

export function seal(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return ['v1', iv, body, cipher.getAuthTag()].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

/** The plaintext, or null when the box is malformed, tampered with, or sealed with another key. */
export function open(sealed, key) {
  if (typeof sealed !== 'string') return null;
  const [version, iv, body, tag] = sealed.split('.');
  if (version !== 'v1' || !iv || !body || !tag) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
