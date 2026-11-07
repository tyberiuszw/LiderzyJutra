import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prismaUnscoped } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    const org = await prismaUnscoped.organization.findUnique({
      where: { id: session.orgId },
    });

    const isAuthorized =
      session.role === "SUPERADMIN" ||
      session.role === "ORG_ADMIN" ||
      org?.founderId === session.sub;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Brak uprawnień do przeglądania wniosków o dołączenie." },
        { status: 403 }
      );
    }

    const requests = await prismaUnscoped.membershipRequest.findMany({
      where: {
        organizationId: session.orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                chameleonColor: true,
                chameleonSecondary: true,
                chameleonAccent: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Fetch membership requests error:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać wniosków o dołączenie." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Wymagane logowanie." }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, action } = body; // action: "APPROVE" | "REJECT"

    if (!requestId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Niepoprawne parametry żądania." },
        { status: 400 }
      );
    }

    const request = await prismaUnscoped.membershipRequest.findUnique({
      where: { id: requestId },
      include: { organization: true },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Wniosek nie został znaleziony." },
        { status: 404 }
      );
    }

    const isAuthorized =
      session.role === "SUPERADMIN" ||
      (session.orgId === request.organizationId &&
        (session.role === "ORG_ADMIN" || request.organization.founderId === session.sub));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Brak uprawnień do zatwierdzania wniosków dla tej organizacji." },
        { status: 403 }
      );
    }

    if (action === "APPROVE") {
      await prismaUnscoped.$transaction(async (tx) => {
        // 1. Update request status
        await tx.membershipRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            reviewedById: session.sub,
          },
        });

        // 2. Activate user
        await tx.user.update({
          where: { id: request.userId },
          data: {
            status: "ACTIVE",
            organizationId: request.organizationId,
          },
        });

        // 3. Ensure membership in default team if available
        const defaultTeam = await tx.team.findFirst({
          where: { organizationId: request.organizationId },
        });

        if (defaultTeam) {
          const existingMembership = await tx.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: defaultTeam.id,
                userId: request.userId,
              },
            },
          });

          if (!existingMembership) {
            await tx.teamMember.create({
              data: {
                teamId: defaultTeam.id,
                userId: request.userId,
                role: "TEAM_MEMBER",
              },
            });
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Wniosek został zaakceptowany, a użytkownik aktywowany.",
      });
    } else {
      // REJECT
      await prismaUnscoped.membershipRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedById: session.sub,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Wniosek został odrzucony.",
      });
    }
  } catch (error) {
    console.error("Review membership request error:", error);
    return NextResponse.json(
      { error: "Nie udało się przetworzyć wniosku." },
      { status: 500 }
    );
  }
}
