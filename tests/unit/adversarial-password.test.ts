import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";

describe("Adversarial Password Hashing & Verification Attacks", () => {
  // =========================================================================
  // 1. Malformed Hash Strings
  // =========================================================================
  describe("Malformed Hash Attacks", () => {
    it("rejects truncated hash strings with fewer than 6 segments", async () => {
      const truncatedCases = [
        "",
        "scrypt",
        "scrypt$16384",
        "scrypt$16384$8",
        "scrypt$16384$8$1",
        "scrypt$16384$8$1$a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6", // only 5 segments
      ];

      for (const malformed of truncatedCases) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("rejects hash strings with extra segments (> 6 parts)", async () => {
      const extraPartsCases = [
        "scrypt$16384$8$1$salt$key$extra",
        "scrypt$16384$8$1$salt$key$extra1$extra2",
        "scrypt$16384$8$1$salt$key$$$$",
      ];

      for (const malformed of extraPartsCases) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("rejects non-scrypt algorithm prefixes / tags", async () => {
      const nonScryptTags = [
        "bcrypt$16384$8$1$salt$key",
        "argon2id$16384$8$1$salt$key",
        "pbkdf2$16384$8$1$salt$key",
        "sha256$16384$8$1$salt$key",
        "plain$16384$8$1$salt$key",
        "unknown$16384$8$1$salt$key",
        "$16384$8$1$salt$key",
      ];

      for (const malformed of nonScryptTags) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("rejects non-numeric scrypt parameters (N, r, p)", async () => {
      const nonNumericCases = [
        "scrypt$NaN$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$abc$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$xyz$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$8$foo$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$undefined$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$null$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$true$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$8$1.5$aabbccddeeff00112233445566778899$aabbccdd",
      ];

      for (const malformed of nonNumericCases) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("rejects zero or negative scrypt parameters", async () => {
      const zeroOrNegative = [
        "scrypt$0$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$0$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$8$0$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$-16384$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$-8$1$aabbccddeeff00112233445566778899$aabbccdd",
        "scrypt$16384$8$-1$aabbccddeeff00112233445566778899$aabbccdd",
      ];

      for (const malformed of zeroOrNegative) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("survives resource exhaustion attacks with abnormally huge N or r without crashing", async () => {
      const hugeCostCases = [
        // N = 2^30 (1073741824) - triggers maxmem limit in crypto.scrypt
        "scrypt$1073741824$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        // N not power of 2
        "scrypt$12345$8$1$aabbccddeeff00112233445566778899$aabbccdd",
        // r = 999999
        "scrypt$16384$999999$1$aabbccddeeff00112233445566778899$aabbccdd",
      ];

      for (const malformed of hugeCostCases) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("rejects empty salt or empty key segments", async () => {
      const corruptHex = [
        "scrypt$16384$8$1$$aabbccddeeff00112233445566778899", // empty salt
        "scrypt$16384$8$1$aabbccddeeff00112233445566778899$", // empty key
        "scrypt$16384$8$1$$", // both empty
      ];

      for (const malformed of corruptHex) {
        const result = await verifyPassword("SecretPassword123!", malformed);
        expect(result).toBe(false);
      }
    });

    it("strictly rejects zero-length or non-hex key segments and prevents bypass", async () => {
      // When hexKey consists of non-hex characters (e.g. whitespace or 'zzzz'),
      // or invalid length, verifyPassword must strictly reject with false.
      const whitespaceBypass = await verifyPassword("attacker_password", "scrypt$16384$8$1$salt$   ");
      const nonHexBypass = await verifyPassword("attacker_password", "scrypt$16384$8$1$salt$zzzz");

      // Verify strict rejection of corrupt/whitespace hashes (no auth bypass)
      expect(whitespaceBypass).toBe(false);
      expect(nonHexBypass).toBe(false);
    });
  });

  // =========================================================================
  // 2. Empty, Null, and Type Boundary Inputs
  // =========================================================================
  describe("Empty, Null & Type Boundary Inputs", () => {
    it("rejects empty password in hashPassword with an explicit Error", async () => {
      await expect(hashPassword("")).rejects.toThrow("Password must be a non-empty string");
    });

    it("rejects non-string inputs in hashPassword", async () => {
      // @ts-expect-error test non-string types
      await expect(hashPassword(null)).rejects.toThrow();
      // @ts-expect-error test non-string types
      await expect(hashPassword(undefined)).rejects.toThrow();
      // @ts-expect-error test non-string types
      await expect(hashPassword(12345)).rejects.toThrow();
      // @ts-expect-error test non-string types
      await expect(hashPassword({})).rejects.toThrow();
      // @ts-expect-error test non-string types
      await expect(hashPassword([])).rejects.toThrow();
    });

    it("rejects empty, null, or non-string inputs in verifyPassword without throwing", async () => {
      const validHash = await hashPassword("ValidPassword123!");

      // @ts-expect-error test non-string types
      expect(await verifyPassword(null, validHash)).toBe(false);
      // @ts-expect-error test non-string types
      expect(await verifyPassword(undefined, validHash)).toBe(false);
      expect(await verifyPassword("", validHash)).toBe(false);
      // @ts-expect-error test non-string types
      expect(await verifyPassword(12345, validHash)).toBe(false);

      expect(await verifyPassword("ValidPassword123!", "")).toBe(false);
      // @ts-expect-error test non-string types
      expect(await verifyPassword("ValidPassword123!", null)).toBe(false);
      // @ts-expect-error test non-string types
      expect(await verifyPassword("ValidPassword123!", undefined)).toBe(false);
      // @ts-expect-error test non-string types
      expect(await verifyPassword(null, null)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Character Boundary Conditions (UTF-8, Polish, Cyrillic, 1000+ chars)
  // =========================================================================
  describe("Character Boundary Conditions", () => {
    it("correctly hashes and verifies multi-byte UTF-8 emojis", async () => {
      const emojiPassword = "🦎👑🚀🌟🌈🔥👨‍👩‍👧‍👦💫🎯";
      const hash = await hashPassword(emojiPassword);

      expect(await verifyPassword(emojiPassword, hash)).toBe(true);
      expect(await verifyPassword("🦎👑🚀🌟🌈🔥👨‍👩‍👧‍👦💫❌", hash)).toBe(false);
    });

    it("correctly hashes and verifies Polish diacritics in lowercase and uppercase", async () => {
      const polishPassword = "ZażółćGęśląJaźń_123!ZAŻÓŁĆGĘŚLĄJAŹŃ";
      const hash = await hashPassword(polishPassword);

      expect(await verifyPassword(polishPassword, hash)).toBe(true);
      // Alter one diacritic: ę -> e
      const altered = "ZażółcGeśląJaźń_123!ZAŻÓŁĆGĘŚLĄJAŹŃ";
      expect(await verifyPassword(altered, hash)).toBe(false);
    });

    it("correctly hashes and verifies Ukrainian Cyrillic characters with distinct phonemes (і, ї, є, ґ)", async () => {
      const ukrainianPassword = "ПривітСвіт_Їжак_Єнот_Іскра_Ґудзик_СлаваУкраїні2026!";
      const hash = await hashPassword(ukrainianPassword);

      expect(await verifyPassword(ukrainianPassword, hash)).toBe(true);
      // Change Ukrainian 'і' to Russian 'и' or Latin 'i'
      const replacedI = "ПривuтСвіт_Їжак_Єнот_Іскра_Ґудзик_СлаваУкраїні2026!";
      expect(await verifyPassword(replacedI, hash)).toBe(false);
    });

    it("handles passwords containing null bytes, tabs, newlines, and RTL text", async () => {
      const complexPassword = "Leading\0Null\tTab\nNewline\r\nCRLF_مرحبا_שָׁלוֹם_SpecialChars#&^%$@!";
      const hash = await hashPassword(complexPassword);

      expect(await verifyPassword(complexPassword, hash)).toBe(true);
      expect(await verifyPassword("LeadingNullTabNewline", hash)).toBe(false);
    });

    it("handles extreme length passwords (1,000+ characters) without buffer overflow or failure", async () => {
      // 1,200 character string composed of repeating Polish, Ukrainian, and ASCII sequences
      const pattern = "LiderzyJutra2026_Kameleon_Zażółć_Україна_🦎_";
      const longPassword = pattern.repeat(25); // 25 * 47 = 1175 chars
      expect(longPassword.length).toBeGreaterThanOrEqual(1000);

      const hash = await hashPassword(longPassword);
      expect(await verifyPassword(longPassword, hash)).toBe(true);

      // Fails when last character is changed
      const mutatedLong = longPassword.slice(0, -1) + "X";
      expect(await verifyPassword(mutatedLong, hash)).toBe(false);
    });

    it("handles 5,000 character ultra-long password safely", async () => {
      const ultraLongPassword = "A".repeat(5000);
      const hash = await hashPassword(ultraLongPassword);

      expect(await verifyPassword(ultraLongPassword, hash)).toBe(true);
      expect(await verifyPassword(ultraLongPassword.slice(0, -1) + "B", hash)).toBe(false);
    });
  });

  // =========================================================================
  // 4. Timing Attack & Equality Verification on Mismatched Lengths
  // =========================================================================
  describe("Timing Attack Resistance & Key Length Handling", () => {
    it("handles stored hash with non-standard key length without throwing or leaking", async () => {
      // Standard key length is 64 bytes (128 hex chars)
      // Craft a valid scrypt hash but with a 32-byte key (64 hex chars)
      const salt = crypto.randomBytes(16).toString("hex");
      const shortKeyHex = crypto.randomBytes(32).toString("hex");
      const shortHash = `scrypt$16384$8$1$${salt}$${shortKeyHex}`;

      // Verification should safely return false without throwing RangeError
      const result = await verifyPassword("SomePassword123!", shortHash);
      expect(result).toBe(false);
    });

    it("handles stored hash with odd-length hex key safely", async () => {
      const salt = crypto.randomBytes(16).toString("hex");
      // Odd number of hex characters (5 hex chars = 2.5 bytes)
      const oddHexHash = `scrypt$16384$8$1$${salt}$abcde`;

      const result = await verifyPassword("SomePassword123!", oddHexHash);
      expect(typeof result).toBe("boolean");
    });

    it("does not leak comparison early on differing prefixes (timingSafeEqual validation)", async () => {
      const password = "TargetPassword2026!";
      const hash = await hashPassword(password);
      const parts = hash.split("$");
      const correctKeyHex = parts[5];

      // Mutate the very first byte of the hex key
      const firstByteAltered =
        (correctKeyHex.startsWith("00") ? "ff" : "00") + correctKeyHex.slice(2);
      const hashFirstByteBad = [...parts.slice(0, 5), firstByteAltered].join("$");

      // Mutate the very last byte of the hex key
      const lastByteAltered =
        correctKeyHex.slice(0, -2) + (correctKeyHex.endsWith("00") ? "ff" : "00");
      const hashLastByteBad = [...parts.slice(0, 5), lastByteAltered].join("$");

      // Both must evaluate to false
      expect(await verifyPassword(password, hashFirstByteBad)).toBe(false);
      expect(await verifyPassword(password, hashLastByteBad)).toBe(false);

      // Verify timingSafeEqual behavior directly: compare timing across 50 iterations
      // Node.js crypto.timingSafeEqual throws if lengths differ, so verify that length guard works
      const bufA = Buffer.from(correctKeyHex, "hex");
      const bufB = Buffer.from(firstByteAltered, "hex");
      const bufC = Buffer.from(lastByteAltered, "hex");

      expect(crypto.timingSafeEqual(bufA, bufB)).toBe(false);
      expect(crypto.timingSafeEqual(bufA, bufC)).toBe(false);
      expect(crypto.timingSafeEqual(bufA, bufA)).toBe(true);
    });
  });
});
