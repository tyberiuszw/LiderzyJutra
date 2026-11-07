import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";
import { UserRole, UserSessionPayload } from "@/types/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Fast pre-check outside transaction
    const initialCheck = await prismaUnscoped.systemConfig.findUnique({
      where: { key: "system_initialized" },
    });

    if (initialCheck && initialCheck.value === "true") {
      return NextResponse.json(
        { error: "System is already initialized. Please sign in." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { email, password, displayName, orgName, teamName } = body;

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, password, and display name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const slug = (orgName || "liderzy-jutra-hq")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // 2. Atomic transaction to guard against TOCTOU race condition
    const result = await prismaUnscoped.$transaction(async (tx) => {
      const lockCheck = await tx.systemConfig.findUnique({
        where: { key: "system_initialized" },
      });

      if (lockCheck && lockCheck.value === "true") {
        throw new Error("ALREADY_INITIALIZED");
      }

      // Create or get organization
      let org = await tx.organization.findUnique({ where: { slug } });
      if (!org) {
        org = await tx.organization.create({
          data: {
            name: orgName || "Liderzy Jutra HQ",
            slug: slug || "liderzy-jutra-hq",
            isSystemTenant: true,
          },
        });
      }

      // Create default team
      const team = await tx.team.create({
        data: {
          name: teamName || "Główny Zespół Liderów",
          organizationId: org.id,
        },
      });

      // Create superadmin user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          role: "SUPERADMIN",
          mustChangePassword: false,
          organizationId: org.id,
          profile: {
            create: {
              displayName: displayName.trim(),
              chameleonColor: "#06B6D4",
              chameleonSecondary: "#3B82F6",
              chameleonAccent: "#10B981",
              avatarState: "celebrate",
            },
          },
          teamMemberships: {
            create: {
              teamId: team.id,
              role: "SUPERADMIN",
            },
          },
        },
        include: {
          profile: true,
          organization: true,
          teamMemberships: {
            include: { team: true },
          },
        },
      });

      // Lock system setup
      await tx.systemConfig.upsert({
        where: { key: "system_initialized" },
        update: { value: "true" },
        create: { key: "system_initialized", value: "true" },
      });

      return { user, org, team };
    });

    // 3. Issue session tokens and cookies
    const sessionPayload: UserSessionPayload = {
      sub: result.user.id,
      email: result.user.email,
      orgId: result.org.id,
      role: result.user.role as UserRole,
      name: result.user.profile?.displayName || displayName,
      mustChangePassword: false,
    };

    const accessToken = await signAccessToken(sessionPayload);
    const refreshToken = await signRefreshToken(result.user.id);
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          organizationId: result.org.id,
          organizationName: result.org.name,
          organizationSlug: result.org.slug,
          profile: result.user.profile,
          teams: result.user.teamMemberships.map((tm) => ({
            id: tm.team.id,
            name: tm.team.name,
            role: tm.role,
          })),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "ALREADY_INITIALIZED") {
      return NextResponse.json(
        { error: "System is already initialized." },
        { status: 409 }
      );
    }
    console.error("Setup route error:", err);
    return NextResponse.json(
      { error: "Internal server error during setup." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const initialized = await prismaUnscoped.systemConfig.findUnique({
      where: { key: "system_initialized" },
    });
    return NextResponse.json({
      initialized: initialized?.value === "true",
    });
  } catch (err) {
    console.error("Check setup error:", err);
    return NextResponse.json({ initialized: false });
  }
}
