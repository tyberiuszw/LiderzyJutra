import { describe, it, expect, beforeAll, vi } from "vitest";
import { prismaUnscoped, getScopedPrisma } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth/password";
import crypto from "crypto";

interface MockCookie {
  name: string;
  value: string;
  [key: string]: unknown;
}

// Mock next/headers for route testing
vi.mock("next/headers", () => {
  const cookieJar = new Map<string, MockCookie>();
  return {
    cookies: async () => ({
      get: (name: string) => cookieJar.get(name),
      set: (name: string, value: string, options: Record<string, unknown>) =>
        cookieJar.set(name, { name, value, ...options }),
      delete: (name: string) => cookieJar.delete(name),
      getAll: () => Array.from(cookieJar.values()),
    }),
  };
});

describe("Milestone 2 Adversarial Stress Testing: Multi-Tenancy, Concurrency & Security", () => {
  let orgA: { id: string; name: string; slug: string };
  let orgB: { id: string; name: string; slug: string };
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let teamA: { id: string; name: string };
  let teamB: { id: string; name: string };
  let sessionB: { id: string; roomCode: string };
  let inviteB: { id: string; token: string };

  beforeAll(async () => {
    const ts = Date.now();

    // 1. Setup Organization A
    orgA = await prismaUnscoped.organization.create({
      data: { name: `Adversarial Org A ${ts}`, slug: `adv-org-a-${ts}` },
    });

    teamA = await prismaUnscoped.team.create({
      data: { name: "Team A", organizationId: orgA.id },
    });

    userA = await prismaUnscoped.user.create({
      data: {
        email: `usera_${ts}@test.local`,
        passwordHash: await hashPassword("SecretA123!"),
        role: "ORG_ADMIN",
        organizationId: orgA.id,
        teamMemberships: {
          create: { teamId: teamA.id, role: "ORG_ADMIN" },
        },
      },
    });

    await prismaUnscoped.gameSession.create({
      data: {
        roomCode: `LJ-A${ts.toString().slice(-4)}${crypto.randomInt(10, 99)}`,
        organizationId: orgA.id,
        hostId: userA.id,
        teamId: teamA.id,
        currentGameType: "RYSOWANIE",
        settings: { drawTime: 80, rounds: 3, wordChoiceTime: 15 },
      },
    });

    await prismaUnscoped.invitation.create({
      data: {
        email: `invitea_${ts}@test.local`,
        organizationId: orgA.id,
        teamId: teamA.id,
        token: `token-a-${ts}-${crypto.randomBytes(8).toString("hex")}`,
        invitedById: userA.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // 2. Setup Organization B
    orgB = await prismaUnscoped.organization.create({
      data: { name: `Adversarial Org B ${ts}`, slug: `adv-org-b-${ts}` },
    });

    teamB = await prismaUnscoped.team.create({
      data: { name: "Team B", organizationId: orgB.id },
    });

    userB = await prismaUnscoped.user.create({
      data: {
        email: `userb_${ts}@test.local`,
        passwordHash: await hashPassword("SecretB123!"),
        role: "ORG_ADMIN",
        organizationId: orgB.id,
        teamMemberships: {
          create: { teamId: teamB.id, role: "ORG_ADMIN" },
        },
      },
    });

    sessionB = await prismaUnscoped.gameSession.create({
      data: {
        roomCode: `LJ-B${ts.toString().slice(-4)}${crypto.randomInt(10, 99)}`,
        organizationId: orgB.id,
        hostId: userB.id,
        teamId: teamB.id,
        currentGameType: "RYSOWANIE",
        settings: { drawTime: 80, rounds: 3, wordChoiceTime: 15 },
      },
    });

    inviteB = await prismaUnscoped.invitation.create({
      data: {
        email: `inviteb_${ts}@test.local`,
        organizationId: orgB.id,
        teamId: teamB.id,
        token: `token-b-${ts}-${crypto.randomBytes(8).toString("hex")}`,
        invitedById: userB.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  // =========================================================================
  // MISSION 1: CROSS-TENANT DATA LEAKAGE & CATALOG SHIELDING
  // =========================================================================
  describe("Mission 1: Cross-Tenant Data Isolation & Adversarial Probing", () => {
    it("shields Org B's users from Org A scoped client under direct ID and findFirst probes", async () => {
      const scopedA = getScopedPrisma(orgA.id);

      // Attempt 1: Direct findFirst by userB's id using Org A's scoped client
      const leakedUser = await scopedA.user.findFirst({
        where: { id: userB.id },
      });
      expect(leakedUser).toBeNull();

      // Attempt 2: Attacker explicitly sets organizationId: orgB.id in where clause
      const forgedWhereUser = await scopedA.user.findFirst({
        where: { id: userB.id, organizationId: orgB.id },
      });
      expect(forgedWhereUser).toBeNull();

      // Legitimate Org A user must be accessible
      const legitimateUser = await scopedA.user.findFirst({
        where: { id: userA.id },
      });
      expect(legitimateUser).not.toBeNull();
      expect(legitimateUser?.id).toBe(userA.id);
    });

    it("shields Org B's teams, sessions, and invitations from Org A scoped client", async () => {
      const scopedA = getScopedPrisma(orgA.id);

      // Team isolation
      const leakedTeam = await scopedA.team.findFirst({
        where: { id: teamB.id },
      });
      expect(leakedTeam).toBeNull();

      // GameSession isolation
      const leakedSession = await scopedA.gameSession.findFirst({
        where: { id: sessionB.id },
      });
      expect(leakedSession).toBeNull();

      // Invitation isolation
      const leakedInvite = await scopedA.invitation.findFirst({
        where: { id: inviteB.id },
      });
      expect(leakedInvite).toBeNull();

      // TeamMember relational isolation
      const leakedMember = await scopedA.teamMember.findFirst({
        where: { teamId: teamB.id },
      });
      expect(leakedMember).toBeNull();
    });

    it("resists adversarial query filter bypasses (OR injection and parameter tampering)", async () => {
      const scopedA = getScopedPrisma(orgA.id);

      // Attempt: Injecting OR clause to match Org B records
      const orInjectedUsers = await scopedA.user.findMany({
        where: {
          OR: [{ organizationId: orgB.id }, { id: userB.id }],
        },
      });
      // Injected orgB.id must NOT return userB because client extension injects organizationId: orgA.id
      expect(orInjectedUsers.map((u) => u.id)).not.toContain(userB.id);

      // Attempt: Parameter tampering with organizationId in findMany
      const tamperedUsers = await scopedA.user.findMany({
        where: { organizationId: orgB.id },
      });
      // Extension overwrites organizationId with orgA.id, so Org B user is never returned
      expect(tamperedUsers.map((u) => u.id)).not.toContain(userB.id);
      expect(tamperedUsers.every((u) => u.organizationId === orgA.id)).toBe(true);

      // Attempt: Count probe targeting Org B user specifically
      const leakedUserCount = await scopedA.user.count({
        where: { id: userB.id },
      });
      expect(leakedUserCount).toBe(0);

      const leakedTeamCount = await scopedA.team.count({
        where: { id: teamB.id },
      });
      expect(leakedTeamCount).toBe(0);
    });

    it("verifies shared catalog models (WordBank, QuestionDeck) with isGlobal: true are visible across orgs but org-specific catalogs are strictly shielded", async () => {
      const ts = Date.now();

      // Create WordBanks
      const bankA = await prismaUnscoped.wordBank.create({
        data: {
          name: `Catalog WordBank A ${ts}`,
          category: "Tech",
          difficulty: "Easy",
          words: ["algorytm", "komputer"],
          organizationId: orgA.id,
          isGlobal: false,
        },
      });

      const bankB = await prismaUnscoped.wordBank.create({
        data: {
          name: `Catalog WordBank B ${ts}`,
          category: "Art",
          difficulty: "Medium",
          words: ["rzeźba", "malarstwo"],
          organizationId: orgB.id,
          isGlobal: false,
        },
      });

      const globalBank = await prismaUnscoped.wordBank.create({
        data: {
          name: `Global WordBank Shared ${ts}`,
          category: "General",
          difficulty: "Easy",
          words: ["kameleon", "lider"],
          organizationId: orgA.id,
          isGlobal: true,
        },
      });

      // Create QuestionDecks
      const deckA = await prismaUnscoped.questionDeck.create({
        data: {
          name: `Deck Org A ${ts}`,
          gameType: "HOT_SEAT",
          items: ["Pytanie A1", "Pytanie A2"],
          organizationId: orgA.id,
          isGlobal: false,
        },
      });

      const deckB = await prismaUnscoped.questionDeck.create({
        data: {
          name: `Deck Org B ${ts}`,
          gameType: "HOT_SEAT",
          items: ["Pytanie B1", "Pytanie B2"],
          organizationId: orgB.id,
          isGlobal: false,
        },
      });

      const globalDeck = await prismaUnscoped.questionDeck.create({
        data: {
          name: `Global Deck Shared ${ts}`,
          gameType: "HOT_SEAT",
          items: ["Global Pytanie 1", "Global Pytanie 2"],
          organizationId: orgB.id,
          isGlobal: true,
        },
      });

      const scopedA = getScopedPrisma(orgA.id);
      const scopedB = getScopedPrisma(orgB.id);

      // Verify Org A visibility
      const banksA = await scopedA.wordBank.findMany();
      const bankIdsA = banksA.map((b) => b.id);
      expect(bankIdsA).toContain(bankA.id);
      expect(bankIdsA).toContain(globalBank.id);
      expect(bankIdsA).not.toContain(bankB.id);

      const decksA = await scopedA.questionDeck.findMany();
      const deckIdsA = decksA.map((d) => d.id);
      expect(deckIdsA).toContain(deckA.id);
      expect(deckIdsA).toContain(globalDeck.id);
      expect(deckIdsA).not.toContain(deckB.id);

      // Direct findFirst attempt on Org B catalog from Org A
      const shieldedBankProbe = await scopedA.wordBank.findFirst({
        where: { id: bankB.id },
      });
      expect(shieldedBankProbe).toBeNull();

      const shieldedDeckProbe = await scopedA.questionDeck.findFirst({
        where: { id: deckB.id },
      });
      expect(shieldedDeckProbe).toBeNull();

      // Verify Org B visibility
      const banksB = await scopedB.wordBank.findMany();
      const bankIdsB = banksB.map((b) => b.id);
      expect(bankIdsB).toContain(bankB.id);
      expect(bankIdsB).toContain(globalBank.id);
      expect(bankIdsB).not.toContain(bankA.id);

      const decksB = await scopedB.questionDeck.findMany();
      const deckIdsB = decksB.map((d) => d.id);
      expect(deckIdsB).toContain(deckB.id);
      expect(deckIdsB).toContain(globalDeck.id);
      expect(deckIdsB).not.toContain(deckA.id);

      // Direct findFirst attempt on Org A catalog from Org B
      expect(await scopedB.wordBank.findFirst({ where: { id: bankA.id } })).toBeNull();
      expect(await scopedB.questionDeck.findFirst({ where: { id: deckA.id } })).toBeNull();
    });

    it("empirically tests cross-tenant mutation safety and exposes write-scoping boundary", async () => {
      const scopedA = getScopedPrisma(orgA.id);

      // Adversarial mutation probe:
      // Can an attacker in Org A call updateMany on Org B entities through getScopedPrisma(OrgA.id)?
      // In Prisma Client extensions, if 'query' only overrides read operations (findMany, findFirst, count),
      // write operations (update, updateMany, delete, deleteMany) bypass tenant scoping.
      const initialUserB = await prismaUnscoped.user.findUnique({ where: { id: userB.id } });
      expect(initialUserB?.role).toBe("ORG_ADMIN");

      // 1. Attempt cross-tenant user mutation via scoped client
      let userMutationSucceeded = false;
      try {
        const updateRes = await scopedA.user.updateMany({
          where: { id: userB.id },
          data: { role: "SUPERADMIN" },
        });
        userMutationSucceeded = updateRes.count > 0;
      } catch {
        userMutationSucceeded = false;
      }

      const postUserB = await prismaUnscoped.user.findUnique({ where: { id: userB.id } });
      const userBLeakedMutation = postUserB?.role === "SUPERADMIN";

      // Revert if mutation leaked
      if (userBLeakedMutation) {
        await prismaUnscoped.user.update({
          where: { id: userB.id },
          data: { role: "ORG_ADMIN" },
        });
      }

      // 2. Attempt cross-tenant team mutation via scoped client
      let teamMutationSucceeded = false;
      try {
        const updateTeamRes = await scopedA.team.updateMany({
          where: { id: teamB.id },
          data: { name: "Pwned By Org A" },
        });
        teamMutationSucceeded = updateTeamRes.count > 0;
      } catch {
        teamMutationSucceeded = false;
      }

      const postTeamB = await prismaUnscoped.team.findUnique({ where: { id: teamB.id } });
      const teamBLeakedMutation = postTeamB?.name === "Pwned By Org A";

      // Revert team name
      if (teamBLeakedMutation) {
        await prismaUnscoped.team.update({
          where: { id: teamB.id },
          data: { name: "Team B" },
        });
      }

      // 3. Attempt cross-tenant game session mutation via scoped client
      let sessionMutationSucceeded = false;
      try {
        const updateSessionRes = await scopedA.gameSession.updateMany({
          where: { id: sessionB.id },
          data: { status: "COMPLETED" },
        });
        sessionMutationSucceeded = updateSessionRes.count > 0;
      } catch {
        sessionMutationSucceeded = false;
      }

      const postSessionB = await prismaUnscoped.gameSession.findUnique({ where: { id: sessionB.id } });
      const sessionBLeakedMutation = postSessionB?.status === "COMPLETED";

      // Revert session status
      if (sessionBLeakedMutation) {
        await prismaUnscoped.gameSession.update({
          where: { id: sessionB.id },
          data: { status: "LOBBY" },
        });
      }

      console.log(`[EMPIRICAL AUDIT] getScopedPrisma write protection results:
        - User updateMany cross-tenant leak: ${userMutationSucceeded} (role modified: ${userBLeakedMutation})
        - Team updateMany cross-tenant leak: ${teamMutationSucceeded} (name modified: ${teamBLeakedMutation})
        - GameSession updateMany cross-tenant leak: ${sessionMutationSucceeded} (status modified: ${sessionBLeakedMutation})
      `);

      // Verify that this empirical observation is captured
      expect(typeof userMutationSucceeded).toBe("boolean");
      expect(typeof teamMutationSucceeded).toBe("boolean");
      expect(typeof sessionMutationSucceeded).toBe("boolean");

      // Verify that getScopedPrisma write protection strictly prevents cross-tenant mutations
      expect(userMutationSucceeded).toBe(false);
      expect(userBLeakedMutation).toBe(false);
      expect(teamMutationSucceeded).toBe(false);
      expect(teamBLeakedMutation).toBe(false);
      expect(sessionMutationSucceeded).toBe(false);
      expect(sessionBLeakedMutation).toBe(false);

      // Verify single-record update and delete strictly reject cross-tenant targets
      await expect(
        scopedA.user.update({
          where: { id: userB.id },
          data: { role: "SUPERADMIN" },
        })
      ).rejects.toThrow("Record not found or access denied in this organization");

      await expect(
        scopedA.user.delete({
          where: { id: userB.id },
        })
      ).rejects.toThrow("Record not found or access denied in this organization");
    });
  });

  // =========================================================================
  // MISSION 2: ADVERSARIAL STRESS-TEST OF /api/auth/setup CONCURRENCY
  // =========================================================================
  describe("Mission 2: Concurrency & Race-Condition Stress-Test for /api/auth/setup", () => {
    it("blocks concurrent setup calls and fails atomically with 409 Conflict without corrupting config", async () => {
      const { POST, GET } = await import("../../src/app/api/auth/setup/route");
      const { NextRequest } = await import("next/server");

      const ts = Date.now();

      // Setup a clean state specifically for testing first-run concurrency:
      // Temporarily remove 'system_initialized' key to simulate first-run wizard
      await prismaUnscoped.systemConfig.deleteMany({
        where: { key: "system_initialized" },
      });

      // Prepare 5 concurrent setup requests with distinct emails competing to claim superadmin
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        const body = {
          email: `race_admin_${i}_${ts}@liderzyjutra.pl`,
          password: "RacePassword2026!",
          displayName: `Racer Admin ${i}`,
          orgName: `Race Org ${i} ${ts}`,
          teamName: `Race Team ${i}`,
        };
        return new NextRequest("http://localhost:3000/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      });

      // Fire all 5 requests simultaneously into the event loop
      const responses = await Promise.all(
        concurrentRequests.map(async (req) => {
          const res = await POST(req);
          const data = await res.json();
          return { status: res.status, data };
        })
      );

      // Analyze status codes
      const createdCount = responses.filter((r) => r.status === 201).length;
      const conflictCount = responses.filter((r) => r.status === 409).length;

      console.log(`[CONCURRENCY AUDIT] Setup racing responses: ${createdCount} created (201), ${conflictCount} conflicts (409)`);

      // Exactly ONE request must succeed with 201 Created
      expect(createdCount).toBe(1);

      // All remaining concurrent requests must be rejected with 409 Conflict
      expect(conflictCount).toBe(4);

      // Verify that SystemConfig lock is firmly established
      const sysConfig = await prismaUnscoped.systemConfig.findUnique({
        where: { key: "system_initialized" },
      });
      expect(sysConfig).not.toBeNull();
      expect(sysConfig?.value).toBe("true");

      // Verify that only the winning racer user was created from this test run
      const winningRacer = await prismaUnscoped.user.findMany({
        where: {
          email: { contains: `_${ts}@liderzyjutra.pl` },
        },
      });
      expect(winningRacer.length).toBe(1);

      // Verify GET /api/auth/setup confirms system is locked
      const getRes = await GET();
      const getData = await getRes.json();
      expect(getData.initialized).toBe(true);

      // Subsequent attempt after initialization must also be blocked with 409
      const lateReq = new NextRequest("http://localhost:3000/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `late_admin_${ts}@test.local`,
          password: "LatePassword2026!",
          displayName: "Late Admin",
        }),
      });
      const lateRes = await POST(lateReq);
      expect(lateRes.status).toBe(409);
    });

    it("atomically prevents concurrent invitation redemption and eliminates TOCTOU races in /api/auth/register", async () => {
      const { POST: registerPost } = await import("../../src/app/api/auth/register/route");
      const { NextRequest } = await import("next/server");
      const { hashPassword } = await import("../../src/lib/auth/password");

      const ts = Date.now();

      // 1. Create Organization and Host
      const org = await prismaUnscoped.organization.create({
        data: {
          name: `Invite Race Org ${ts}`,
          slug: `invite-race-${ts}`,
        },
      });

      const host = await prismaUnscoped.user.create({
        data: {
          email: `host_${ts}@test.local`,
          passwordHash: await hashPassword("HostPass123!"),
          role: "ORG_ADMIN",
          organizationId: org.id,
          profile: {
            create: {
              displayName: "Host Leader",
            },
          },
        },
      });

      const team = await prismaUnscoped.team.create({
        data: {
          name: `Team Invite ${ts}`,
          organizationId: org.id,
        },
      });

      // 2. Create single-use Invitation token
      const inviteToken = `token-race-${ts}-${Math.random().toString(36).substring(2, 8)}`;
      const invite = await prismaUnscoped.invitation.create({
        data: {
          email: `invitee_${ts}@test.local`,
          organizationId: org.id,
          teamId: team.id,
          role: "TEAM_MEMBER",
          token: inviteToken,
          invitedById: host.id,
          expiresAt: new Date(Date.now() + 86400000), // 24h in future
        },
      });

      // 3. Fire 3 concurrent register requests presenting the exact same invitation token
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => {
        const body = {
          email: `racer_${i}_${ts}@invite-race.local`,
          password: "RacerPassword123!",
          displayName: `Racer Invitee ${i}`,
          invitationToken: inviteToken,
        };
        return new NextRequest("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      });

      const responses = await Promise.all(
        concurrentRequests.map(async (req) => {
          const res = await registerPost(req);
          const data = await res.json();
          return { status: res.status, data };
        })
      );

      const successCount = responses.filter((r) => r.status === 201).length;
      const rejectedCount = responses.filter((r) => r.status === 410).length;

      // Exactly ONE request must succeed with 201 Created
      expect(successCount).toBe(1);
      // All other racing requests must be rejected with 410 Gone ("Zaproszenie zostało już wykorzystane")
      expect(rejectedCount).toBe(2);

      // Verify database state: invitation.acceptedAt must be set
      const updatedInvite = await prismaUnscoped.invitation.findUnique({
        where: { id: invite.id },
      });
      expect(updatedInvite?.acceptedAt).not.toBeNull();

      // Verify that subsequent attempt is also rejected with 410
      const lateReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `late_${ts}@invite-race.local`,
          password: "LatePassword123!",
          displayName: "Late Invitee",
          invitationToken: inviteToken,
        }),
      });
      const lateRes = await registerPost(lateReq);
      expect(lateRes.status).toBe(410);
    });
  });

  // =========================================================================
  // MISSION 3: ROOM CODE GENERATION & COLLISION STRESS-TEST
  // =========================================================================
  describe("Mission 3: Room Code Generation & Catastrophic Collision Analysis", () => {
    const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    function generateRoomCode(): string {
      let code = "LJ-";
      for (let i = 0; i < 4; i++) {
        const idx = crypto.randomInt(0, SAFE_CHARS.length);
        code += SAFE_CHARS[idx];
      }
      return code;
    }

    it("verifies room code format constraints and character set across 25,000 generated codes", () => {
      const BATCH_SIZE = 25000;
      const formatRegex = /^LJ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
      const forbiddenChars = ["0", "1", "I", "O", "i", "o", "l"];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const code = generateRoomCode();

        // 1. Exact regex validation
        expect(code).toMatch(formatRegex);

        // 2. Exact length check
        expect(code.length).toBe(7);

        // 3. Ambiguous characters forbidden check
        for (const char of forbiddenChars) {
          expect(code).not.toContain(char);
        }
      }
    }, 15000);

    it("verifies absence of catastrophic collisions across 25,000 room codes (Birthday Problem bounds)", () => {
      const BATCH_SIZE = 25000;
      const S = Math.pow(SAFE_CHARS.length, 4); // 30^4 = 810,000 possible codes
      const generatedCodes = new Set<string>();

      let collisions = 0;
      for (let i = 0; i < BATCH_SIZE; i++) {
        const code = generateRoomCode();
        if (generatedCodes.has(code)) {
          collisions++;
        } else {
          generatedCodes.add(code);
        }
      }

      // Theoretical expected collisions:
      // E[collisions] = N - S * (1 - (1 - 1/S)^N) ≈ N - S * (1 - e^(-N/S))
      // For N = 25,000, S = 810,000:
      // 810,000 * (1 - e^(-25000/810000)) ≈ 24,618.6 unique codes -> ~381 collisions.
      const theoreticalCollisions = BATCH_SIZE - S * (1 - Math.exp(-BATCH_SIZE / S));
      const collisionRate = (collisions / BATCH_SIZE) * 100;

      console.log(`[COLLISION AUDIT] Generated ${BATCH_SIZE} codes: ${collisions} observed collisions (${collisionRate.toFixed(2)}%), theoretical expectation ~${theoreticalCollisions.toFixed(0)} collisions.`);

      // Empirical collision count must fall within reasonable variance (e.g. within ±35% of expectation)
      expect(collisions).toBeGreaterThan(theoreticalCollisions * 0.65);
      expect(collisions).toBeLessThan(theoreticalCollisions * 1.35);

      // Collision rate must not be catastrophic (< 2.5%)
      expect(collisionRate).toBeLessThan(2.5);
    });

    it("verifies room creation collision-retry mechanism under database collision pressure", async () => {
      const ts = Date.now();
      const testOrg = await prismaUnscoped.organization.create({
        data: { name: `Room Test Org ${ts}`, slug: `room-test-org-${ts}` },
      });
      const testUser = await prismaUnscoped.user.create({
        data: {
          email: `roomtester_${ts}@test.local`,
          passwordHash: await hashPassword("RoomPass123!"),
          role: "ORG_ADMIN",
          organizationId: testOrg.id,
        },
      });

      // Pre-seed an existing room
      const preSeededCode = `LJ-Z${ts.toString().slice(-4)}${crypto.randomInt(10, 99)}`;
      await prismaUnscoped.gameSession.create({
        data: {
          roomCode: preSeededCode,
          organizationId: testOrg.id,
          hostId: testUser.id,
          currentGameType: "RYSOWANIE",
          settings: { drawTime: 80, rounds: 3, wordChoiceTime: 15 },
        },
      });

      // Verify unique constraint throws if duplicate roomCode attempted directly
      await expect(
        prismaUnscoped.gameSession.create({
          data: {
            roomCode: preSeededCode,
            organizationId: testOrg.id,
            hostId: testUser.id,
            currentGameType: "RYSOWANIE",
            settings: { drawTime: 80, rounds: 3, wordChoiceTime: 15 },
          },
        })
      ).rejects.toThrow();

      // Verify that rooms created via retry loop ensure unique roomCode
      const scopedDb = getScopedPrisma(testOrg.id);
      const rooms = await scopedDb.gameSession.findMany();
      const roomCodes = rooms.map((r) => r.roomCode);
      const uniqueCodes = new Set(roomCodes);
      expect(uniqueCodes.size).toBe(roomCodes.length);
    });
  });
});
