import { describe, it, expect } from "vitest";
import { prismaUnscoped } from "../../src/lib/db";
import { runSeed } from "../../prisma/seed";

describe("Adversarial Seed Idempotency & State Integrity", () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "tyberiusz.wylon@gmail.com";

  it("survives 5 successive executions of runSeed() without duplicating, modifying, or corrupting records", async () => {
    // Execution 1
    const run1 = await runSeed();
    expect(run1.email).toBe(adminEmail);

    // Capture baseline state from database
    const baselineUser = await prismaUnscoped.user.findUnique({
      where: { email: adminEmail },
      include: {
        profile: true,
        organization: true,
        teamMemberships: true,
      },
    });

    expect(baselineUser).not.toBeNull();
    const baselinePasswordHash = baselineUser!.passwordHash;
    const baselineUserId = baselineUser!.id;
    const baselineOrgId = baselineUser!.organizationId;

    // Execution 2
    const run2 = await runSeed();
    expect(run2.skipped).toBe(true);
    expect(run2.userId).toBe(baselineUserId);

    // Execution 3
    const run3 = await runSeed();
    expect(run3.skipped).toBe(true);

    // Execution 4
    const run4 = await runSeed();
    expect(run4.skipped).toBe(true);

    // Execution 5
    const run5 = await runSeed();
    expect(run5.skipped).toBe(true);

    // Comprehensive Database Invariant Verifications:

    // 1. Exactly 1 user with admin email
    const adminUsers = await prismaUnscoped.user.findMany({
      where: { email: adminEmail },
      include: {
        profile: true,
        organization: true,
        teamMemberships: true,
      },
    });
    expect(adminUsers.length).toBe(1);

    const postRunUser = adminUsers[0];
    expect(postRunUser.id).toBe(baselineUserId);

    // 2. Password hash was NOT overwritten or mutated
    expect(postRunUser.passwordHash).toBe(baselinePasswordHash);

    // 3. User attributes preserved
    expect(postRunUser.role).toBe("SUPERADMIN");
    expect(postRunUser.organizationId).toBe(baselineOrgId);
    expect(postRunUser.profile?.displayName).toBe("Tyberiusz Wylon");
    expect(postRunUser.profile?.chameleonColor).toBe("#06B6D4");

    // 4. Exactly 1 system organization
    const systemOrgs = await prismaUnscoped.organization.findMany({
      where: { slug: "liderzy-jutra-hq" },
    });
    expect(systemOrgs.length).toBe(1);
    expect(systemOrgs[0].isSystemTenant).toBe(true);

    // 5. Exactly 1 default team under system organization
    const defaultTeams = await prismaUnscoped.team.findMany({
      where: {
        organizationId: systemOrgs[0].id,
        name: "Główny Zespół Liderów",
      },
    });
    expect(defaultTeams.length).toBe(1);

    // 6. Exactly 1 team membership for the admin user
    const memberships = await prismaUnscoped.teamMember.findMany({
      where: { userId: baselineUserId },
    });
    expect(memberships.length).toBe(1);
    expect(memberships[0].role).toBe("SUPERADMIN");

    // 7. Exactly 1 system_initialized config record
    const systemConfigs = await prismaUnscoped.systemConfig.findMany({
      where: { key: "system_initialized" },
    });
    expect(systemConfigs.length).toBe(1);
    expect(systemConfigs[0].value).toBe("true");
  });
});
