import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getScopedPrisma, prismaUnscoped } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    const scopedDb = getScopedPrisma(session.orgId);
    const teams = await scopedDb.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                profile: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            gameSessions: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ teams });
  } catch (err) {
    console.error("List teams error:", err);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    if (session.role === "TEAM_MEMBER") {
      return NextResponse.json(
        { error: "Brak uprawnień do tworzenia zespołów." },
        { status: 403 }
      );
    }

    // Verify user and organization are approved (Superadmin is exempt)
    if (session.role !== "SUPERADMIN") {
      const user = await prismaUnscoped.user.findUnique({
        where: { id: session.sub },
        include: { organization: true },
      });
      if (!user || user.status !== "ACTIVE" || user.organization?.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Tylko zatwierdzeni administratorzy zatwierdzonych organizacji mogą tworzyć zespoły." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nazwa zespołu jest wymagana." }, { status: 400 });
    }

    const team = await prismaUnscoped.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: name.trim(),
          organizationId: session.orgId,
        },
      });

      // Add creator to the team
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: session.sub,
          role: session.role,
        },
      });

      return newTeam;
    });

    return NextResponse.json({ success: true, team }, { status: 201 });
  } catch (err) {
    console.error("Create team error:", err);
    return NextResponse.json({ error: "Błąd podczas tworzenia zespołu." }, { status: 500 });
  }
}
