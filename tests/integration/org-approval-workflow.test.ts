import { describe, it, expect, beforeAll } from "vitest";
import { prismaUnscoped } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth/password";
import { runSeed } from "../../prisma/seed";

describe("Milestone 6 Integration: Organization Approvals & Membership Requests Workflow", () => {
  beforeAll(async () => {
    await runSeed();
  });

  it("creates a pending organization and allows superadmin approval", async () => {
    const timestamp = Date.now();
    const founderEmail = `founder_${timestamp}@example.com`;
    const passwordHash = await hashPassword("SecurePass123!");

    // 1. Founder registers new organization -> status: PENDING_APPROVAL
    const org = await prismaUnscoped.organization.create({
      data: {
        name: `Nowa Szkoła Liderów ${timestamp}`,
        slug: `nowa-szkola-${timestamp}`,
        status: "PENDING_APPROVAL",
        isPublic: true,
      },
    });

    const founder = await prismaUnscoped.user.create({
      data: {
        email: founderEmail,
        passwordHash,
        role: "ORG_ADMIN",
        status: "PENDING_APPROVAL",
        organizationId: org.id,
        profile: {
          create: {
            displayName: "Założyciel Szkoły",
          },
        },
      },
    });

    await prismaUnscoped.organization.update({
      where: { id: org.id },
      data: { founderId: founder.id },
    });

    expect(org.status).toBe("PENDING_APPROVAL");
    expect(founder.status).toBe("PENDING_APPROVAL");

    // 2. Superadmin approves organization
    const updatedOrg = await prismaUnscoped.organization.update({
      where: { id: org.id },
      data: { status: "APPROVED" },
    });

    await prismaUnscoped.user.updateMany({
      where: { id: founder.id, status: "PENDING_APPROVAL" },
      data: { status: "ACTIVE" },
    });

    expect(updatedOrg.status).toBe("APPROVED");

    const activatedFounder = await prismaUnscoped.user.findUnique({
      where: { id: founder.id },
    });
    expect(activatedFounder?.status).toBe("ACTIVE");
  });

  it("creates a membership request for an existing public organization and allows founder approval", async () => {
    const timestamp = Date.now();
    const applicantEmail = `applicant_${timestamp}@example.com`;
    const passwordHash = await hashPassword("ApplicantPass123!");

    // 1. Setup approved organization with a default team
    const org = await prismaUnscoped.organization.create({
      data: {
        name: `Akademia Aktywna ${timestamp}`,
        slug: `akademia-aktywna-${timestamp}`,
        status: "APPROVED",
        isPublic: true,
      },
    });

    const team = await prismaUnscoped.team.create({
      data: {
        name: "Główny Zespół",
        organizationId: org.id,
      },
    });

    // 2. New user signs up to join this org -> user status PENDING_APPROVAL
    const applicant = await prismaUnscoped.user.create({
      data: {
        email: applicantEmail,
        passwordHash,
        role: "TEAM_MEMBER",
        status: "PENDING_APPROVAL",
        organizationId: org.id,
        profile: {
          create: {
            displayName: "Nowy Kandydat",
          },
        },
      },
    });

    // 3. Create MembershipRequest
    const request = await prismaUnscoped.membershipRequest.create({
      data: {
        userId: applicant.id,
        organizationId: org.id,
        status: "PENDING",
        message: "Chcę dołączyć do zespołu projektowego",
      },
    });

    expect(request.status).toBe("PENDING");
    expect(applicant.status).toBe("PENDING_APPROVAL");

    // 4. Founder approves the request
    await prismaUnscoped.$transaction(async (tx) => {
      await tx.membershipRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
      });

      await tx.user.update({
        where: { id: applicant.id },
        data: { status: "ACTIVE" },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: applicant.id,
          role: "TEAM_MEMBER",
        },
      });
    });

    // 5. Verification: user is now ACTIVE and member of the team
    const activeUser = await prismaUnscoped.user.findUnique({
      where: { id: applicant.id },
      include: {
        membershipRequests: true,
        teamMemberships: true,
      },
    });

    expect(activeUser?.status).toBe("ACTIVE");
    expect(activeUser?.membershipRequests[0].status).toBe("APPROVED");
    expect(activeUser?.teamMemberships.length).toBe(1);
    expect(activeUser?.teamMemberships[0].teamId).toBe(team.id);
  });
});
