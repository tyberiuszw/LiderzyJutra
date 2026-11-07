import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";
import { UserRole, UserSessionPayload } from "@/types/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i hasło są wymagane." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await prismaUnscoped.user.findUnique({
      where: { email: cleanEmail },
      include: {
        profile: true,
        organization: true,
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Nieprawidłowy adres e-mail lub hasło." },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(String(password), user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Nieprawidłowy adres e-mail lub hasło." },
        { status: 401 }
      );
    }

    const sessionPayload: UserSessionPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      role: user.role as UserRole,
      name: user.profile?.displayName || user.email.split("@")[0],
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = await signAccessToken(sessionPayload);
    const refreshToken = await signRefreshToken(user.id);
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization.id,
        organizationName: user.organization.name,
        organizationSlug: user.organization.slug,
        mustChangePassword: user.mustChangePassword,
        profile: user.profile,
        teams: user.teamMemberships.map((tm) => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.role,
        })),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Błąd serwera podczas logowania." },
      { status: 500 }
    );
  }
}
