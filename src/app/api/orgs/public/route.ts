import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";

export async function GET() {
  try {
    const orgs = await prismaUnscoped.organization.findMany({
      where: {
        status: "APPROVED",
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        founderId: true,
        isSystemTenant: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            teams: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    console.error("Public orgs fetch error:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać listy organizacji." },
      { status: 500 }
    );
  }
}
