import { describe, it, expect, beforeAll } from "vitest";
import { prismaUnscoped, getScopedPrisma } from "../../src/lib/db";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";
import { signAccessToken, verifyAccessToken } from "../../src/lib/auth/jwt";
import { runSeed } from "../../prisma/seed";

describe("Milestone 2 Integration: Auth, Multi-Tenancy & Tenant Scoping", () => {
  beforeAll(async () => {
    // Run seed to ensure baseline system initialization
    await runSeed();
  });

  it("verifies superadmin seed idempotency", async () => {
    const seedResult = await runSeed();
    expect(seedResult.skipped).toBe(true);
    expect(seedResult.email).toBe(process.env.SEED_ADMIN_EMAIL || "tyberiusz.wylon@gmail.com");

    const superAdmin = await prismaUnscoped.user.findUnique({
      where: { email: seedResult.email },
      include: { profile: true, organization: true },
    });

    expect(superAdmin).not.toBeNull();
    expect(superAdmin?.role).toBe("SUPERADMIN");
    expect(superAdmin?.organization.isSystemTenant).toBe(true);
    expect(superAdmin?.profile?.displayName).toBe("Tyberiusz Wylon");

    // Check system config lock
    const sysConfig = await prismaUnscoped.systemConfig.findUnique({
      where: { key: "system_initialized" },
    });
    expect(sysConfig?.value).toBe("true");
  });

  it("strictly enforces multi-tenant isolation across distinct organizations", async () => {
    const timestamp = Date.now();

    // 1. Create Organization Alpha
    const orgAlpha = await prismaUnscoped.organization.create({
      data: {
        name: `Org Alpha ${timestamp}`,
        slug: `org-alpha-${timestamp}`,
      },
    });

    const teamAlpha = await prismaUnscoped.team.create({
      data: {
        name: "Alpha Explorers",
        organizationId: orgAlpha.id,
      },
    });

    const userAlpha = await prismaUnscoped.user.create({
      data: {
        email: `alpha_${timestamp}@example.com`,
        passwordHash: await hashPassword("AlphaPass123!"),
        role: "ORG_ADMIN",
        organizationId: orgAlpha.id,
        profile: {
          create: {
            displayName: "Leader Alpha",
            chameleonColor: "#06B6D4",
          },
        },
        teamMemberships: {
          create: {
            teamId: teamAlpha.id,
            role: "ORG_ADMIN",
          },
        },
      },
    });

    // 2. Create Organization Beta
    const orgBeta = await prismaUnscoped.organization.create({
      data: {
        name: `Org Beta ${timestamp}`,
        slug: `org-beta-${timestamp}`,
      },
    });

    const teamBeta = await prismaUnscoped.team.create({
      data: {
        name: "Beta Pioneers",
        organizationId: orgBeta.id,
      },
    });

    const userBeta = await prismaUnscoped.user.create({
      data: {
        email: `beta_${timestamp}@example.com`,
        passwordHash: await hashPassword("BetaPass123!"),
        role: "ORG_ADMIN",
        organizationId: orgBeta.id,
        profile: {
          create: {
            displayName: "Leader Beta",
            chameleonColor: "#EC4899",
          },
        },
        teamMemberships: {
          create: {
            teamId: teamBeta.id,
            role: "ORG_ADMIN",
          },
        },
      },
    });

    // 3. Test Scoped Client for Org Alpha
    const scopedAlpha = getScopedPrisma(orgAlpha.id);

    const alphaUsers = await scopedAlpha.user.findMany();
    const alphaUserIds = alphaUsers.map((u) => u.id);
    expect(alphaUserIds).toContain(userAlpha.id);
    expect(alphaUserIds).not.toContain(userBeta.id);

    const alphaTeams = await scopedAlpha.team.findMany();
    const alphaTeamIds = alphaTeams.map((t) => t.id);
    expect(alphaTeamIds).toContain(teamAlpha.id);
    expect(alphaTeamIds).not.toContain(teamBeta.id);

    // 4. Test Scoped Client for Org Beta
    const scopedBeta = getScopedPrisma(orgBeta.id);

    const betaUsers = await scopedBeta.user.findMany();
    const betaUserIds = betaUsers.map((u) => u.id);
    expect(betaUserIds).toContain(userBeta.id);
    expect(betaUserIds).not.toContain(userAlpha.id);

    const betaTeams = await scopedBeta.team.findMany();
    const betaTeamIds = betaTeams.map((t) => t.id);
    expect(betaTeamIds).toContain(teamBeta.id);
    expect(betaTeamIds).not.toContain(teamAlpha.id);
  });

  it("handles shared catalog models with isGlobal fallback properly", async () => {
    const timestamp = Date.now();

    const orgX = await prismaUnscoped.organization.create({
      data: { name: `Org X ${timestamp}`, slug: `org-x-${timestamp}` },
    });
    const orgY = await prismaUnscoped.organization.create({
      data: { name: `Org Y ${timestamp}`, slug: `org-y-${timestamp}` },
    });

    // Create custom word banks
    const bankX = await prismaUnscoped.wordBank.create({
      data: {
        name: "X Custom Bank",
        category: "Tech",
        difficulty: "Easy",
        words: ["robot", "kod"],
        organizationId: orgX.id,
        isGlobal: false,
      },
    });

    const bankY = await prismaUnscoped.wordBank.create({
      data: {
        name: "Y Custom Bank",
        category: "Art",
        difficulty: "Medium",
        words: ["pędzel", "farba"],
        organizationId: orgY.id,
        isGlobal: false,
      },
    });

    // Create global word bank
    const globalBank = await prismaUnscoped.wordBank.create({
      data: {
        name: "Global Common Bank",
        category: "Nature",
        difficulty: "Easy",
        words: ["kameleon", "las"],
        organizationId: orgX.id, // linked to an org but marked isGlobal: true
        isGlobal: true,
      },
    });

    const scopedX = getScopedPrisma(orgX.id);
    const wordsForX = await scopedX.wordBank.findMany();
    const bankIdsForX = wordsForX.map((b) => b.id);

    expect(bankIdsForX).toContain(bankX.id);
    expect(bankIdsForX).toContain(globalBank.id);
    expect(bankIdsForX).not.toContain(bankY.id);

    const scopedY = getScopedPrisma(orgY.id);
    const wordsForY = await scopedY.wordBank.findMany();
    const bankIdsForY = wordsForY.map((b) => b.id);

    expect(bankIdsForY).toContain(bankY.id);
    expect(bankIdsForY).toContain(globalBank.id);
    expect(bankIdsForY).not.toContain(bankX.id);
  });

  it("verifies end-to-end token and session lifecycle", async () => {
    const rawPassword = "SuperSecretPassword2026!";
    const hash = await hashPassword(rawPassword);

    expect(await verifyPassword(rawPassword, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);

    const token = await signAccessToken({
      sub: "user-test-id",
      email: "test@example.com",
      orgId: "org-test-id",
      role: "ORG_ADMIN",
      name: "Test Leader",
    });

    const session = await verifyAccessToken(token);
    expect(session).not.toBeNull();
    expect(session?.email).toBe("test@example.com");
    expect(session?.role).toBe("ORG_ADMIN");
  });
});
