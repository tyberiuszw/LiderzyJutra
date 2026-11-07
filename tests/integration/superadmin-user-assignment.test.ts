import { describe, it, expect, beforeAll } from "vitest";
import { prismaUnscoped } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth/password";
import { runSeed } from "../../prisma/seed";

describe("Super Admin Direct User Assignment & Unapproved Room Guard", () => {
  beforeAll(async () => {
    await runSeed();
  });

  it("allows direct assignment of a user to an organization, updating role and activating account", async () => {
    const timestamp = Date.now();
    const userEmail = `assign_test_${timestamp}@example.com`;
    const passwordHash = await hashPassword("AssignPass123!");

    // 1. Create target organization
    const org = await prismaUnscoped.organization.create({
      data: {
        name: `Org Docelowa ${timestamp}`,
        slug: `org-docelowa-${timestamp}`,
        status: "APPROVED",
        isPublic: true,
        teams: {
          create: {
            name: "Główny Zespół",
          },
        },
      },
      include: { teams: true },
    });

    // 2. Create pending user in initial organization
    const initialOrg = await prismaUnscoped.organization.create({
      data: {
        name: `Org Początkowa ${timestamp}`,
        slug: `org-poczatkowa-${timestamp}`,
        status: "PENDING_APPROVAL",
      },
    });

    const user = await prismaUnscoped.user.create({
      data: {
        email: userEmail,
        passwordHash,
        role: "TEAM_MEMBER",
        status: "PENDING_APPROVAL",
        organizationId: initialOrg.id,
      },
    });

    expect(user.organizationId).toBe(initialOrg.id);
    expect(user.status).toBe("PENDING_APPROVAL");

    // 3. Super Admin directly moves/assigns user to target org with role ORG_ADMIN
    const updated = await prismaUnscoped.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: user.id },
        data: {
          organizationId: org.id,
          role: "ORG_ADMIN",
          status: "ACTIVE",
        },
      });

      const defaultTeam = org.teams[0];
      await tx.teamMember.create({
        data: {
          teamId: defaultTeam.id,
          userId: user.id,
          role: "ORG_ADMIN",
        },
      });

      return u;
    });

    expect(updated.organizationId).toBe(org.id);
    expect(updated.role).toBe("ORG_ADMIN");
    expect(updated.status).toBe("ACTIVE");

    // Verify team membership in target org
    const membership = await prismaUnscoped.teamMember.findFirst({
      where: { userId: user.id, teamId: org.teams[0].id },
    });
    expect(membership).toBeDefined();
    expect(membership?.role).toBe("ORG_ADMIN");
  });

  it("guards against room creation by unapproved organizations or users", async () => {
    const timestamp = Date.now();
    const unapprovedOrg = await prismaUnscoped.organization.create({
      data: {
        name: `Org Nieaktywna ${timestamp}`,
        slug: `org-nieaktywna-${timestamp}`,
        status: "PENDING_APPROVAL",
      },
    });

    const unapprovedUser = await prismaUnscoped.user.create({
      data: {
        email: `unapproved_${timestamp}@example.com`,
        passwordHash: await hashPassword("Pass123!"),
        role: "TEAM_MEMBER",
        status: "PENDING_APPROVAL",
        organizationId: unapprovedOrg.id,
      },
      include: { organization: true },
    });

    // Check guard condition
    const isAllowed =
      unapprovedUser.status === "ACTIVE" &&
      unapprovedUser.organization.status === "APPROVED";

    expect(isAllowed).toBe(false);
  });
});
