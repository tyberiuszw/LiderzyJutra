import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prismaUnscoped } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    // Only SUPERADMIN can see all organizations; otherwise tenant-isolated to user's org
    const isSuperAdmin = session.role === "SUPERADMIN";
    const where = isSuperAdmin ? {} : { id: session.orgId };

    const organizations = await prismaUnscoped.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            teams: true,
            gameSessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ organizations });
  } catch (err) {
    console.error("List orgs error:", err);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    if (session.role !== "SUPERADMIN" && session.role !== "ORG_ADMIN") {
      return NextResponse.json(
        { error: "Brak uprawnień do tworzenia organizacji." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nazwa organizacji jest wymagana." }, { status: 400 });
    }

    let finalSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!finalSlug) {
      finalSlug = "org-" + Math.random().toString(36).substring(2, 8);
    }

    const existing = await prismaUnscoped.organization.findUnique({
      where: { slug: finalSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organizacja o tym identyfikatorze (slug) już istnieje." },
        { status: 409 }
      );
    }

    const org = await prismaUnscoped.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: name.trim(),
          slug: finalSlug,
          isSystemTenant: false,
        },
      });

      // Automatically create a default team
      await tx.team.create({
        data: {
          name: "Główny Zespół",
          organizationId: newOrg.id,
        },
      });

      return newOrg;
    });

    return NextResponse.json({ success: true, organization: org }, { status: 201 });
  } catch (err) {
    console.error("Create org error:", err);
    return NextResponse.json({ error: "Błąd podczas tworzenia organizacji." }, { status: 500 });
  }
}
