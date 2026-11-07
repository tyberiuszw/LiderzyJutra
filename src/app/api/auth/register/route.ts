import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";
import { UserRole, UserSessionPayload } from "@/types/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      displayName,
      orgName,
      orgSlug,
      invitationToken,
      chameleonColor = "#06B6D4",
      chameleonSecondary = "#3B82F6",
      chameleonAccent = "#10B981",
    } = body;

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, hasło i nazwa wyświetlana są wymagane." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Hasło musi mieć co najmniej 8 znaków." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prismaUnscoped.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Konto z tym adresem e-mail już istnieje." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // MODE B: Join via Invitation Token
    if (invitationToken) {
      const invite = await prismaUnscoped.invitation.findUnique({
        where: { token: invitationToken },
        include: { organization: true, team: true },
      });

      if (!invite) {
        return NextResponse.json(
          { error: "Nieprawidłowy token zaproszenia." },
          { status: 400 }
        );
      }

      if (invite.acceptedAt) {
        return NextResponse.json(
          { error: "To zaproszenie zostało już wykorzystane." },
          { status: 410 }
        );
      }

      if (invite.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Zaproszenie wygasło." },
          { status: 410 }
        );
      }

      let result;
      try {
        result = await prismaUnscoped.$transaction(async (tx) => {
          // Atomic conditional update to guard against concurrent redemption race conditions
          const updateResult = await tx.invitation.updateMany({
            where: { id: invite.id, acceptedAt: null },
            data: { acceptedAt: new Date() },
          });

          if (updateResult.count === 0) {
            throw new Error("INVITATION_ALREADY_USED");
          }

          const newUser = await tx.user.create({
            data: {
              email: cleanEmail,
              passwordHash,
              role: invite.role,
              status: "ACTIVE",
              organizationId: invite.organizationId,
              profile: {
                create: {
                  displayName: displayName.trim(),
                  chameleonColor,
                  chameleonSecondary,
                  chameleonAccent,
                  avatarState: "idle",
                },
              },
              ...(invite.teamId
                ? {
                    teamMemberships: {
                      create: {
                        teamId: invite.teamId,
                        role: invite.role,
                      },
                    },
                  }
                : {}),
            },
            include: {
              profile: true,
              organization: true,
              teamMemberships: { include: { team: true } },
            },
          });

          return newUser;
        });
      } catch (txError: unknown) {
        if (txError instanceof Error && txError.message === "INVITATION_ALREADY_USED") {
          return NextResponse.json(
            { error: "Zaproszenie zostało już wykorzystane" },
            { status: 410 }
          );
        }
        throw txError;
      }

      const sessionPayload: UserSessionPayload = {
        sub: result.id,
        email: result.email,
        orgId: result.organizationId,
        role: result.role as UserRole,
        name: result.profile?.displayName || displayName,
      };

      const accessToken = await signAccessToken(sessionPayload);
      const refreshToken = await signRefreshToken(result.id);
      await setAuthCookies(accessToken, refreshToken);

      return NextResponse.json(
        {
          success: true,
          user: {
            id: result.id,
            email: result.email,
            role: result.role,
            status: result.status,
            organizationId: result.organization.id,
            organizationName: result.organization.name,
            organizationSlug: result.organization.slug,
            profile: result.profile,
            teams: result.teamMemberships.map((tm) => ({
              id: tm.team.id,
              name: tm.team.name,
              role: tm.role,
            })),
          },
        },
        { status: 201 }
      );
    }

    // MODE C: Join Existing Public Organization (Pending founder/admin approval)
    const { joinOrgId, joinMessage } = body;
    if (joinOrgId) {
      const targetOrg = await prismaUnscoped.organization.findUnique({
        where: { id: joinOrgId },
      });

      if (!targetOrg) {
        return NextResponse.json(
          { error: "Wybrana organizacja nie istnieje." },
          { status: 404 }
        );
      }

      if (targetOrg.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Ta organizacja nie została jeszcze zatwierdzona przez administratora." },
          { status: 400 }
        );
      }

      const createdMember = await prismaUnscoped.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: cleanEmail,
            passwordHash,
            role: "TEAM_MEMBER",
            status: "PENDING_APPROVAL",
            organizationId: targetOrg.id,
            profile: {
              create: {
                displayName: displayName.trim(),
                chameleonColor,
                chameleonSecondary,
                chameleonAccent,
                avatarState: "idle",
              },
            },
          },
          include: {
            profile: true,
            organization: true,
            teamMemberships: true,
          },
        });

        await tx.membershipRequest.create({
          data: {
            userId: user.id,
            organizationId: targetOrg.id,
            status: "PENDING",
            message: joinMessage || `Prośba o dołączenie od ${displayName.trim()}`,
          },
        });

        return user;
      });

      const sessionPayload: UserSessionPayload = {
        sub: createdMember.id,
        email: createdMember.email,
        orgId: createdMember.organizationId,
        role: createdMember.role as UserRole,
        name: createdMember.profile?.displayName || displayName,
      };

      const accessToken = await signAccessToken(sessionPayload);
      const refreshToken = await signRefreshToken(createdMember.id);
      await setAuthCookies(accessToken, refreshToken);

      return NextResponse.json(
        {
          success: true,
          pendingApproval: true,
          message: "Konto utworzone. Twój wniosek o dołączenie oczekuje na zatwierdzenie przez założyciela organizacji.",
          user: {
            id: createdMember.id,
            email: createdMember.email,
            role: createdMember.role,
            status: createdMember.status,
            organizationId: targetOrg.id,
            organizationName: targetOrg.name,
            organizationSlug: targetOrg.slug,
            profile: createdMember.profile,
            teams: [],
          },
        },
        { status: 201 }
      );
    }

    // MODE A: Create New Organization
    const isSeedAdmin = cleanEmail === (process.env.SEED_ADMIN_EMAIL || "tyberiusz.wylon@gmail.com").toLowerCase();
    const orgStatus = isSeedAdmin ? "APPROVED" : "PENDING_APPROVAL";
    const userStatus = isSeedAdmin ? "ACTIVE" : "PENDING_APPROVAL";
    const userRole = isSeedAdmin ? "SUPERADMIN" : "ORG_ADMIN";

    const name = (orgName || `${displayName} Team`).trim();
    let baseSlug = (orgSlug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) {
      baseSlug = "team-" + Math.random().toString(36).substring(2, 8);
    }

    // Ensure unique slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (await prismaUnscoped.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const created = await prismaUnscoped.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug: finalSlug,
          isSystemTenant: isSeedAdmin,
          status: orgStatus,
        },
      });

      const team = await tx.team.create({
        data: {
          name: "Główny Zespół",
          organizationId: org.id,
        },
      });

      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: userRole,
          status: userStatus,
          organizationId: org.id,
          profile: {
            create: {
              displayName: displayName.trim(),
              chameleonColor,
              chameleonSecondary,
              chameleonAccent,
              avatarState: "idle",
            },
          },
          teamMemberships: {
            create: {
              teamId: team.id,
              role: userRole,
            },
          },
        },
        include: {
          profile: true,
          organization: true,
          teamMemberships: { include: { team: true } },
        },
      });

      // Update org founderId
      await tx.organization.update({
        where: { id: org.id },
        data: { founderId: user.id },
      });

      return { user, org, team };
    });

    const sessionPayload: UserSessionPayload = {
      sub: created.user.id,
      email: created.user.email,
      orgId: created.org.id,
      role: created.user.role as UserRole,
      name: created.user.profile?.displayName || displayName,
    };

    const accessToken = await signAccessToken(sessionPayload);
    const refreshToken = await signRefreshToken(created.user.id);
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json(
      {
        success: true,
        pendingApproval: !isSeedAdmin,
        message: isSeedAdmin
          ? "Konto administratora utworzone pomyślnie."
          : "Organizacja została utworzona i oczekuje na zatwierdzenie przez Super Administratora.",
        user: {
          id: created.user.id,
          email: created.user.email,
          role: created.user.role,
          status: created.user.status,
          organizationId: created.org.id,
          organizationName: created.org.name,
          organizationSlug: created.org.slug,
          profile: created.user.profile,
          teams: created.user.teamMemberships.map((tm) => ({
            id: tm.team.id,
            name: tm.team.name,
            role: tm.role,
          })),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Błąd serwera podczas rejestracji." },
      { status: 500 }
    );
  }
}
