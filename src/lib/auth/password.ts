import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const VERSION = "scrypt-v1";

function scrypt(value: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(value, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string, pepper: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(`${password}\u0000${pepper}`, salt);
  return [VERSION, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(
  password: string,
  encoded: string,
  pepper: string,
): Promise<boolean> {
  const [version, saltText, hashText] = encoded.split("$");
  if (version !== VERSION || !saltText || !hashText) return false;

  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = await scrypt(`${password}\u0000${pepper}`, Buffer.from(saltText, "base64url"));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
