import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prismaUnscoped } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Wymagane uprawnienia Super Administratora." },
        { status: 403 }
      );
    }

    const organizations = await prismaUnscoped.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            teams: true,
            gameSessions: true,
            membershipRequests: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Admin list orgs error:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać listy organizacji." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Wymagane uprawnienia Super Administratora." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { organizationId, status } = body;

    if (!organizationId || !["APPROVED", "REJECTED", "PENDING_APPROVAL"].includes(status)) {
      return NextResponse.json(
        { error: "Niepoprawne parametry." },
        { status: 400 }
      );
    }

    const org = await prismaUnscoped.organization.update({
      where: { id: organizationId },
      data: { status },
    });

    // If approved, also activate founder if pending
    if (status === "APPROVED" && org.founderId) {
      await prismaUnscoped.user.updateMany({
        where: { id: org.founderId, status: "PENDING_APPROVAL" },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json({
      success: true,
      organization: org,
      message: `Status organizacji zmieniony na ${status}.`,
    });
  } catch (error) {
    console.error("Admin update org status error:", error);
    return NextResponse.json(
      { error: "Nie udało się zaktualizować statusu organizacji." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Wymagane uprawnienia Super Administratora." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, slug, isPublic = true } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Nazwa organizacji jest wymagana." },
        { status: 400 }
      );
    }

    let finalSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!finalSlug) {
      finalSlug = "org-" + Date.now();
    }

    const existingSlug = await prismaUnscoped.organization.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "Organizacja o tym identyfikatorze (slug) już istnieje." },
        { status: 409 }
      );
    }

    const org = await prismaUnscoped.organization.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        status: "APPROVED",
        isPublic: Boolean(isPublic),
        teams: {
          create: {
            name: "Główny Zespół",
          },
        },
      },
      include: {
        teams: true,
      },
    });

    return NextResponse.json({
      success: true,
      organization: org,
      message: "Organizacja została utworzona pomyślnie.",
    });
  } catch (error) {
    console.error("Admin create org error:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć organizacji." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Wymagane uprawnienia Super Administratora." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userEmail, userId, organizationId, role = "TEAM_MEMBER" } = body;

    if ((!userEmail && !userId) || !organizationId) {
      return NextResponse.json(
        { error: "Wymagany jest identyfikator lub email użytkownika oraz ID organizacji." },
        { status: 400 }
      );
    }

    const targetOrg = await prismaUnscoped.organization.findUnique({
      where: { id: organizationId },
      include: { teams: true },
    });

    if (!targetOrg) {
      return NextResponse.json(
        { error: "Docelowa organizacja nie istnieje." },
        { status: 404 }
      );
    }

    const targetUser = await prismaUnscoped.user.findFirst({
      where: userId ? { id: userId } : { email: String(userEmail).toLowerCase().trim() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Użytkownik nie został znaleziony." },
        { status: 404 }
      );
    }

    // Atomic transaction: update user org & role, activate user, ensure default team membership
    const updatedUser = await prismaUnscoped.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          organizationId: targetOrg.id,
          role,
          status: "ACTIVE",
        },
        include: {
          profile: true,
          organization: true,
        },
      });

      // Default team membership
      const defaultTeam = targetOrg.teams[0] || await tx.team.create({
        data: {
          name: "Główny Zespół",
          organizationId: targetOrg.id,
        },
      });

      const existingMembership = await tx.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: defaultTeam.id,
            userId: targetUser.id,
          },
        },
      });

      if (!existingMembership) {
        await tx.teamMember.create({
          data: {
            teamId: defaultTeam.id,
            userId: targetUser.id,
            role,
          },
        });
      } else {
        await tx.teamMember.update({
          where: { id: existingMembership.id },
          data: { role },
        });
      }

      return u;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: targetOrg.id,
        organizationName: targetOrg.name,
      },
      message: `Użytkownik ${updatedUser.email} został pomyślnie przypisany do organizacji ${targetOrg.name}.`,
    });
  } catch (error) {
    console.error("Admin assign user error:", error);
    return NextResponse.json(
      { error: "Nie udało się przypisać użytkownika do organizacji." },
      { status: 500 }
    );
  }
}
