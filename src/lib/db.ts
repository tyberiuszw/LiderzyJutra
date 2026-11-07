import { PrismaClient } from "@prisma/client";

declare global {
  var __prismaClient: PrismaClient | undefined;
}

export const prismaUnscoped =
  global.__prismaClient ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient = prismaUnscoped;
}

/**
 * Returns a model-aware tenant-scoped Prisma client extension.
 * Guarantees that queries are strictly confined to the given organizationId.
 *
 * Direct models: User, Team, GameSession, Invitation enforce organizationId.
 * Shared catalogs: WordBank, QuestionDeck include both tenant-specific and isGlobal: true assets.
 * Relational models: TeamMember enforces tenancy through team.organizationId.
 */
export function getScopedPrisma(organizationId: string) {
  if (!organizationId) {
    throw new Error("Cannot create scoped Prisma client without an organizationId");
  }

  return prismaUnscoped.$extends({
    query: {
      user: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.user.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.user.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
      team: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.team.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.team.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
      teamMember: {
        async findMany({ args, query }) {
          args.where = { ...args.where, team: { organizationId } };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, team: { organizationId } };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, team: { organizationId } };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, team: { organizationId } };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, team: { organizationId } };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.teamMember.findFirst({
            where: { ...args.where, team: { organizationId } },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.teamMember.findFirst({
            where: { ...args.where, team: { organizationId } },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
      gameSession: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.gameSession.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.gameSession.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
      invitation: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.invitation.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.invitation.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
      wordBank: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            OR: [{ organizationId }, { isGlobal: true }],
          };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = {
            ...args.where,
            OR: [{ organizationId }, { isGlobal: true }],
          };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.wordBank.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.wordBank.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
      questionDeck: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            OR: [{ organizationId }, { isGlobal: true }],
          };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = {
            ...args.where,
            OR: [{ organizationId }, { isGlobal: true }],
          };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, organizationId };
          return query(args);
        },
        async update({ args, query }) {
          const existing = await prismaUnscoped.questionDeck.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
        async delete({ args, query }) {
          const existing = await prismaUnscoped.questionDeck.findFirst({
            where: { ...args.where, organizationId },
          });
          if (!existing) {
            throw new Error("Record not found or access denied in this organization");
          }
          return query(args);
        },
      },
    },
  });
}
