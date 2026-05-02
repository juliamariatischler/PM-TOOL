import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;
  const [salt, storedKey] = passwordHash.split(":");
  if (!salt || !storedKey) return false;

  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(Buffer.from(storedKey), Buffer.from(derivedKey));
}
