import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";

describe("Password Hashing & Verification (scrypt + timingSafeEqual)", () => {
  it("generates formatted scrypt hash with 6 segments", async () => {
    const password = "YouthLeader2026!Secure";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    const parts = hash.split("$");
    expect(parts.length).toBe(6);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toBe("16384");
    expect(parts[2]).toBe("8");
    expect(parts[3]).toBe("1");
    expect(parts[4]).toHaveLength(32); // 16 bytes hex = 32 chars
    expect(parts[5].length).toBeGreaterThanOrEqual(64);
  });

  it("verifies correct password against generated hash", async () => {
    const password = "CorrectPassword123#";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const password = "CorrectPassword123#";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword("WrongPassword!", hash);
    expect(isValid).toBe(false);
  });

  it("rejects empty or malformed inputs safely", async () => {
    expect(await verifyPassword("", "")).toBe(false);
    expect(await verifyPassword("test", "not-a-hash")).toBe(false);
    expect(await verifyPassword("test", "scrypt$invalid$hash")).toBe(false);
    // @ts-expect-error test invalid types
    expect(await verifyPassword(null, undefined)).toBe(false);

    await expect(hashPassword("")).rejects.toThrow();
  });

  it("produces unique salts for identical passwords", async () => {
    const password = "IdenticalPassword!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});
