import crypto from "crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_HEX_REGEX = /^[0-9a-fA-F]{32}$/;
const KEY_HEX_REGEX = /^[0-9a-fA-F]{128}$/;

function scryptPromise(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Derives a secure password hash using Node.js crypto.scrypt with a random 16-byte salt.
 * Output format: scrypt$<N>$<r>$<p>$<saltHex>$<derivedKeyHex>
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptPromise(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, derivedKey.toString("hex")].join("$");
}

/**
 * Verifies a plaintext password against a stored PHC scrypt hash in constant time.
 * Prevents timing side-channel attacks via crypto.timingSafeEqual.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // If not standard scrypt format (e.g. unrecognized prefix), return false safely
    return false;
  }

  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  const salt = parts[4];
  const hexKey = parts[5];

  if (!N || !r || !p || !salt || !hexKey) {
    return false;
  }

  if (N <= 0 || r <= 0 || p <= 0) {
    return false;
  }

  // Validate salt (must be 32 hex chars = 16 bytes) and hexKey (must be 128 hex chars = 64 bytes)
  if (!SALT_HEX_REGEX.test(salt) || !KEY_HEX_REGEX.test(hexKey)) {
    return false;
  }

  try {
    const expectedKey = Buffer.from(hexKey, "hex");
    if (expectedKey.length !== KEY_LENGTH) {
      return false;
    }

    const derivedKey = await scryptPromise(password, salt, KEY_LENGTH, {
      N,
      r,
      p,
    });

    if (expectedKey.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedKey, derivedKey);
  } catch {
    return false;
  }
}
