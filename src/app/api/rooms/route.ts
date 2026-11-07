import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getScopedPrisma, prismaUnscoped } from "@/lib/db";
import crypto from "crypto";

const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let code = "LJ-";
  for (let i = 0; i < 4; i++) {
    const idx = crypto.randomInt(0, SAFE_CHARS.length);
    code += SAFE_CHARS[idx];
  }
  return code;
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    const scopedDb = getScopedPrisma(session.orgId);
    const rooms = await scopedDb.gameSession.findMany({
      include: {
        host: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        team: true,
        _count: {
          select: {
            scoreRecords: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("List rooms error:", err);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    // Verify user and organization are approved (Superadmin is exempt)
    if (session.role !== "SUPERADMIN") {
      const user = await prismaUnscoped.user.findUnique({
        where: { id: session.sub },
        include: { organization: true },
      });
      if (!user || user.status !== "ACTIVE" || user.organization?.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Tylko zatwierdzeni członkowie organizacji mogą tworzyć pokoje gier." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { gameType = "RYSOWANIE", teamId, settings = {} } = body;

    // Ensure unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prismaUnscoped.gameSession.findUnique({
        where: { roomCode },
      });
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    const room = await prismaUnscoped.gameSession.create({
      data: {
        roomCode,
        organizationId: session.orgId,
        hostId: session.sub,
        teamId: teamId || null,
        currentGameType: gameType,
        status: "LOBBY",
        settings: settings || {
          drawTime: 80,
          rounds: 3,
          wordChoiceTime: 15,
        },
      },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, room }, { status: 201 });
  } catch (err) {
    console.error("Create room error:", err);
    return NextResponse.json({ error: "Błąd podczas tworzenia pokoju gry." }, { status: 500 });
  }
}
