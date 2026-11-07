import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getScopedPrisma, prismaUnscoped } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    const scopedDb = getScopedPrisma(session.orgId);
    const invitations = await scopedDb.invitation.findMany({
      include: {
        team: true,
        invitedBy: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error("List invitations error:", err);
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
        { error: "Brak uprawnień do zapraszania użytkowników." },
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
          { error: "Tylko zatwierdzeni administratorzy zatwierdzonych organizacji mogą wysyłać zaproszenia." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { email, role = "TEAM_MEMBER", teamId, expiresInDays = 7 } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Adres e-mail jest wymagany." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify team belongs to user's org if teamId provided
    if (teamId) {
      const team = await prismaUnscoped.team.findFirst({
        where: { id: teamId, organizationId: session.orgId },
      });
      if (!team) {
        return NextResponse.json({ error: "Wybrany zespół nie istnieje w Twojej organizacji." }, { status: 400 });
      }
    }

    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invitation = await prismaUnscoped.invitation.create({
      data: {
        email: cleanEmail,
        organizationId: session.orgId,
        teamId: teamId || null,
        role: role || "TEAM_MEMBER",
        token,
        invitedById: session.sub,
        expiresAt,
      },
      include: {
        team: true,
      },
    });

    const origin = req.nextUrl.origin || "";
    const inviteUrl = `${origin}/register?invite=${token}`;

    return NextResponse.json(
      {
        success: true,
        invitation,
        inviteUrl,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create invitation error:", err);
    return NextResponse.json({ error: "Błąd podczas tworzenia zaproszenia." }, { status: 500 });
  }
}
