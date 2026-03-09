/**
 * Password hashing and verification using Node crypto (scrypt).
 *
 * Format: salt (32 bytes hex) + hash (64 bytes hex), colon-separated.
 * Compatible with stateless verification — no external deps.
 */

import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SALT_LEN = 32;
const KEY_LEN = 64;
const COST = 16384;

/**
 * Hash a plaintext password. Returns salt:hash (hex).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored hash (salt:hash format).
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const hash = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return hash.toString("hex") === hashHex;
}
