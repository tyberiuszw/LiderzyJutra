import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../src/lib/auth/jwt";
import { UserSessionPayload } from "../../src/types/auth";

describe("Adversarial JWT Token Attacks & Boundary Conditions", () => {
  const secretKey = new TextEncoder().encode(
    process.env.JWT_SECRET || "liderzy-jutra-development-secret-jwt-key-32-chars-min"
  );

  const basePayload: UserSessionPayload = {
    sub: "user-adversary-001",
    email: "youth.leader@example.com",
    orgId: "org-alpha-001",
    role: "TEAM_MEMBER",
    name: "Jan Kowalski",
    mustChangePassword: false,
  };

  // =========================================================================
  // 1. Signature Tampering & Privilege Escalation
  // =========================================================================
  describe("Signature Tampering & Privilege Escalation", () => {
    it("rejects token when signature is altered by a single character", async () => {
      const token = await signAccessToken(basePayload);
      const parts = token.split(".");
      expect(parts.length).toBe(3);

      // Mutate signature
      const sig = parts[2];
      const corruptedSig =
        sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
      const tamperedToken = `${parts[0]}.${parts[1]}.${corruptedSig}`;

      const verified = await verifyAccessToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects privilege escalation attempt (modifying payload from ORG_MEMBER to SUPERADMIN without re-signing)", async () => {
      const token = await signAccessToken(basePayload);
      const parts = token.split(".");

      // Decode payload
      const payloadObj = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      expect(payloadObj.role).toBe("TEAM_MEMBER");

      // Elevate role to SUPERADMIN
      payloadObj.role = "SUPERADMIN";
      payloadObj.orgId = "system-tenant-hq";

      const elevatedPayloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
      const maliciousToken = `${parts[0]}.${elevatedPayloadB64}.${parts[2]}`;

      const verified = await verifyAccessToken(maliciousToken);
      expect(verified).toBeNull();
    });

    it("rejects token with completely stripped signature ('header.payload.')", async () => {
      const token = await signAccessToken(basePayload);
      const parts = token.split(".");
      const unsignedToken = `${parts[0]}.${parts[1]}.`;

      const verified = await verifyAccessToken(unsignedToken);
      expect(verified).toBeNull();
    });

    it("rejects signature swapping (signature from another valid token)", async () => {
      const token1 = await signAccessToken(basePayload);
      const token2 = await signAccessToken({
        ...basePayload,
        sub: "user-victim-999",
        role: "SUPERADMIN",
      });

      const parts1 = token1.split(".");
      const parts2 = token2.split(".");

      // Swap signature of token1 onto token2's payload
      const splicedToken = `${parts2[0]}.${parts2[1]}.${parts1[2]}`;
      const verified = await verifyAccessToken(splicedToken);
      expect(verified).toBeNull();
    });
  });

  // =========================================================================
  // 2. Algorithm Confusion Attacks ("none", asymmetric RS256, etc.)
  // =========================================================================
  describe("Algorithm Confusion Attacks", () => {
    it("rejects tokens with alg: 'none' (unsigned JWT attack)", async () => {
      // Create unprotected header with alg: none
      const headerB64 = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payloadB64 = Buffer.from(JSON.stringify({
        ...basePayload,
        role: "SUPERADMIN",
      })).toString("base64url");

      const noneToken = `${headerB64}.${payloadB64}.`;
      const verified = await verifyAccessToken(noneToken);
      expect(verified).toBeNull();
    });

    it("rejects tokens with wrong symmetric algorithm (e.g. HS384 / HS512 when expecting HS256)", async () => {
      // Sign with HS384 using the same secret
      const hs384Token = await new SignJWT({ ...basePayload })
        .setProtectedHeader({ alg: "HS384" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(secretKey);

      // Verify should reject because verifyAccessToken enforces algorithm pinning { algorithms: ["HS256"] }
      const verified = await verifyAccessToken(hs384Token);
      expect(verified).toBeNull();
    });

    it("rejects tokens with fake RS256 algorithm header (asymmetric key confusion attack)", async () => {
      const headerB64 = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const payloadB64 = Buffer.from(JSON.stringify({ ...basePayload })).toString("base64url");
      const fakeSig = Buffer.from("fakesignaturebytes").toString("base64url");

      const rs256Token = `${headerB64}.${payloadB64}.${fakeSig}`;
      const verified = await verifyAccessToken(rs256Token);
      expect(verified).toBeNull();
    });

    it("rejects tokens with empty or invalid algorithm header", async () => {
      const headerB64 = Buffer.from(JSON.stringify({ alg: "", typ: "JWT" })).toString("base64url");
      const payloadB64 = Buffer.from(JSON.stringify({ ...basePayload })).toString("base64url");
      const token = `${headerB64}.${payloadB64}.sig`;

      const verified = await verifyAccessToken(token);
      expect(verified).toBeNull();
    });
  });

  // =========================================================================
  // 3. Expiration & Temporal Boundary Conditions
  // =========================================================================
  describe("Temporal Boundary Attacks (Expiration, Future iat, nbf)", () => {
    it("rejects token expired by 1 second", async () => {
      const expiredToken = await new SignJWT({ ...basePayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 60)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
        .sign(secretKey);

      const verified = await verifyAccessToken(expiredToken);
      expect(verified).toBeNull();
    });

    it("rejects token expired by 1 hour", async () => {
      const expiredToken = await new SignJWT({ ...basePayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(secretKey);

      const verified = await verifyAccessToken(expiredToken);
      expect(verified).toBeNull();
    });

    it("rejects token with not-before (nbf) set in the future", async () => {
      const futureNbfToken = await new SignJWT({ ...basePayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setNotBefore(Math.floor(Date.now() / 1000) + 3600) // 1 hour in the future
        .setExpirationTime("2h")
        .sign(secretKey);

      const verified = await verifyAccessToken(futureNbfToken);
      expect(verified).toBeNull();
    });

    it("investigates future issuedAt (iat) handling in jose", async () => {
      const futureIatToken = await new SignJWT({ ...basePayload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(Math.floor(Date.now() / 1000) + 86400) // 1 day in the future
        .setExpirationTime(Math.floor(Date.now() / 1000) + 90000)
        .sign(secretKey);

      const verified = await verifyAccessToken(futureIatToken);
      // In jose, unless maxTokenAge is configured, iat in future is checked if maxTokenAge is passed.
      console.log("Future iat verification result:", verified !== null ? "accepted" : "rejected");
    });
  });

  // =========================================================================
  // 4. Malformed Token Structure & Type Coercion Attacks
  // =========================================================================
  describe("Malformed Structure & Boundary Attacks", () => {
    it("safely rejects malformed strings (single part, two parts, four parts)", async () => {
      const malformedCases = [
        "",
        "single-string-without-dots",
        "header.payload", // 2 parts
        "part1.part2.part3.part4", // 4 parts
        "..", // empty dots
        "a.b.c", // invalid base64
        "   .   .   ",
        "null",
        "undefined",
      ];

      for (const token of malformedCases) {
        expect(await verifyAccessToken(token)).toBeNull();
        expect(await verifyRefreshToken(token)).toBeNull();
      }
    });

    it("safely rejects non-string types without throwing uncaught exceptions", async () => {
      // @ts-expect-error test invalid types
      expect(await verifyAccessToken(null)).toBeNull();
      // @ts-expect-error test invalid types
      expect(await verifyAccessToken(undefined)).toBeNull();
      // @ts-expect-error test invalid types
      expect(await verifyAccessToken(12345)).toBeNull();
      // @ts-expect-error test invalid types
      expect(await verifyAccessToken({})).toBeNull();

      // @ts-expect-error test invalid types
      expect(await verifyRefreshToken(null)).toBeNull();
      // @ts-expect-error test invalid types
      expect(await verifyRefreshToken(undefined)).toBeNull();
      // @ts-expect-error test invalid types
      expect(await verifyRefreshToken(12345)).toBeNull();
    });

    it("rejects token signed with an entirely different secret key", async () => {
      const foreignSecret = new TextEncoder().encode("attacker-controlled-secret-key-32-chars-long!");
      const fakeToken = await new SignJWT({ ...basePayload, role: "SUPERADMIN" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(foreignSecret);

      const verified = await verifyAccessToken(fakeToken);
      expect(verified).toBeNull();
    });
  });

  // =========================================================================
  // 5. Refresh Token Cross-Type Substitution & Validation
  // =========================================================================
  describe("Refresh Token Security & Type Substitution", () => {
    it("rejects access token passed into verifyRefreshToken", async () => {
      const accessToken = await signAccessToken(basePayload);
      const verified = await verifyRefreshToken(accessToken);
      expect(verified).toBeNull();
    });

    it("rejects refresh token signed without 'sub' or without 'type: refresh'", async () => {
      // Refresh token with missing sub
      const noSubToken = await new SignJWT({ type: "refresh" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);

      expect(await verifyRefreshToken(noSubToken)).toBeNull();

      // Refresh token with wrong type
      const wrongTypeToken = await new SignJWT({ sub: "user-123", type: "id_token" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);

      expect(await verifyRefreshToken(wrongTypeToken)).toBeNull();
    });

    it("rejects refresh token when signature is corrupted", async () => {
      const refreshToken = await signRefreshToken("user-123", "30d");
      const tampered = refreshToken.slice(0, -5) + "xyz12";
      expect(await verifyRefreshToken(tampered)).toBeNull();
    });
  });
});
