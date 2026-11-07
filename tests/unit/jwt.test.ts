import { describe, it, expect } from "vitest";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "../../src/lib/auth/jwt";
import { UserSessionPayload } from "../../src/types/auth";

describe("JWT Token Management (jose HS256)", () => {
  const samplePayload: UserSessionPayload = {
    sub: "user-12345-uuid",
    email: "tyberiusz.wylon@gmail.com",
    orgId: "org-67890-uuid",
    role: "SUPERADMIN",
    name: "Tyberiusz Wylon",
    mustChangePassword: false,
  };

  it("signs and verifies an access token correctly", async () => {
    const token = await signAccessToken(samplePayload, "15m");
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Header.Payload.Signature

    const verified = await verifyAccessToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe(samplePayload.sub);
    expect(verified?.email).toBe(samplePayload.email);
    expect(verified?.orgId).toBe(samplePayload.orgId);
    expect(verified?.role).toBe("SUPERADMIN");
    expect(verified?.name).toBe("Tyberiusz Wylon");
  });

  it("rejects invalid or tampered tokens", async () => {
    const token = await signAccessToken(samplePayload, "15m");
    const tampered = token.slice(0, -6) + "abcdef";
    const verified = await verifyAccessToken(tampered);
    expect(verified).toBeNull();

    expect(await verifyAccessToken("not.a.token")).toBeNull();
    expect(await verifyAccessToken("")).toBeNull();
  });

  it("rejects expired tokens", async () => {
    // 0s or negative expiration
    const expiredToken = await signAccessToken(samplePayload, "-1s");
    const verified = await verifyAccessToken(expiredToken);
    expect(verified).toBeNull();
  });

  it("signs and verifies refresh tokens with refresh type", async () => {
    const refreshToken = await signRefreshToken("user-12345-uuid", "30d");
    expect(typeof refreshToken).toBe("string");

    const verified = await verifyRefreshToken(refreshToken);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("user-12345-uuid");

    // Access token cannot be verified as refresh token
    const accessToken = await signAccessToken(samplePayload);
    const verifiedAsRefresh = await verifyRefreshToken(accessToken);
    expect(verifiedAsRefresh).toBeNull();
  });

  it("supports isolated JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables", async () => {
    const origAccess = process.env.JWT_ACCESS_SECRET;
    const origRefresh = process.env.JWT_REFRESH_SECRET;

    try {
      process.env.JWT_ACCESS_SECRET = "custom-access-secret-minimum-32-chars-long!";
      process.env.JWT_REFRESH_SECRET = "custom-refresh-secret-minimum-32-chars-long!";

      const accessToken = await signAccessToken(samplePayload);
      const verifiedAccess = await verifyAccessToken(accessToken);
      expect(verifiedAccess?.sub).toBe(samplePayload.sub);

      const refreshToken = await signRefreshToken("user-isolated-123");
      const verifiedRefresh = await verifyRefreshToken(refreshToken);
      expect(verifiedRefresh?.sub).toBe("user-isolated-123");

      // Verify cross-secret isolation: token signed with refresh secret fails access verification
      const crossVerified = await verifyAccessToken(refreshToken);
      expect(crossVerified).toBeNull();
    } finally {
      process.env.JWT_ACCESS_SECRET = origAccess;
      process.env.JWT_REFRESH_SECRET = origRefresh;
    }
  });
});
