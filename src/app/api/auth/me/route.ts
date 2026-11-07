import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prismaUnscoped } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Brak aktywnej sesji." }, { status: 401 });
    }

    const user = await prismaUnscoped.user.findUnique({
      where: { id: session.sub },
      include: {
        profile: true,
        organization: true,
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Użytkownik nie istnieje." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          isSystemTenant: user.organization.isSystemTenant,
          status: user.organization.status,
          founderId: user.organization.founderId,
        },
        profile: user.profile,
        teams: user.teamMemberships.map((tm) => ({
          id: tm.team.id,
          name: tm.team.name,
          role: tm.role,
        })),
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Brak aktywnej sesji." }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, chameleonColor, chameleonSecondary, chameleonAccent, avatarState } = body;

    const updatedProfile = await prismaUnscoped.userProfile.upsert({
      where: { userId: session.sub },
      update: {
        ...(displayName ? { displayName: displayName.trim() } : {}),
        ...(chameleonColor ? { chameleonColor } : {}),
        ...(chameleonSecondary ? { chameleonSecondary } : {}),
        ...(chameleonAccent ? { chameleonAccent } : {}),
        ...(avatarState ? { avatarState } : {}),
      },
      create: {
        userId: session.sub,
        displayName: displayName?.trim() || session.name || "Lider",
        chameleonColor: chameleonColor || "#06B6D4",
        chameleonSecondary: chameleonSecondary || "#3B82F6",
        chameleonAccent: chameleonAccent || "#10B981",
        avatarState: avatarState || "idle",
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Nie udało się zaktualizować profilu." }, { status: 500 });
  }
}
