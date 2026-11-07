import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function scryptPromise(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptPromise(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, derivedKey.toString("hex")].join("$");
}

function getContentDirPath(): string {
  const rootContent = path.resolve(process.cwd(), "messages/content");
  if (fs.existsSync(rootContent)) return rootContent;
  return path.resolve(__dirname, "../messages/content");
}

async function seedGlobalContentBanks(systemOrgId: string) {
  const contentDir = getContentDirPath();
  const locales = ["pl", "en", "uk"] as const;

  // 1. Seed Word Banks
  for (const loc of locales) {
    const wordsFilePath = path.join(contentDir, `words.${loc}.json`);
    if (fs.existsSync(wordsFilePath)) {
      const wordsData = JSON.parse(fs.readFileSync(wordsFilePath, "utf-8")) as {
        category: string;
        difficulty: string;
        words: string[];
      }[];

      for (const item of wordsData) {
        const existing = await prisma.wordBank.findFirst({
          where: {
            organizationId: systemOrgId,
            locale: loc,
            category: item.category,
            difficulty: item.difficulty,
            isGlobal: true,
          },
        });

        if (!existing) {
          await prisma.wordBank.create({
            data: {
              organizationId: systemOrgId,
              name: `Rysowanie - ${item.category} (${loc.toUpperCase()})`,
              locale: loc,
              category: item.category,
              difficulty: item.difficulty,
              words: item.words,
              isGlobal: true,
            },
          });
        }
      }
    }
  }

  // 2. Seed Question Decks
  const deckNames: Record<string, { pl: string; en: string; uk: string }> = {
    TWO_TRUTHS: {
      pl: "Dwie prawdy i kłamstwo",
      en: "Two Truths & A Lie",
      uk: "Дві правди і брехня",
    },
    THIS_OR_THAT: {
      pl: "To czy Tamto",
      en: "This or That",
      uk: "Те чи Інше",
    },
    STORY_CHAIN: {
      pl: "Wspólna Historia",
      en: "Collaborative Story Chain",
      uk: "Спільна Історія",
    },
    HOT_SEAT: {
      pl: "Gorące Krzesło",
      en: "Hot Seat",
      uk: "Гаряче Крісло",
    },
    QUIZ_SUPERLATIVES: {
      pl: "Quiz Drużynowy",
      en: "Team Superlatives",
      uk: "Командний Квіз",
    },
    HUMAN_BINGO: {
      pl: "Bingo Integracyjne",
      en: "Human Bingo",
      uk: "Інтеграційне Бінго",
    },
  };

  for (const loc of locales) {
    const icebreakersFilePath = path.join(contentDir, `icebreakers.${loc}.json`);
    if (fs.existsSync(icebreakersFilePath)) {
      const ibData = JSON.parse(fs.readFileSync(icebreakersFilePath, "utf-8")) as Record<string, unknown>;

      const decksToSeed = [
        { key: "two_truths", gameType: "TWO_TRUTHS" },
        { key: "this_or_that", gameType: "THIS_OR_THAT" },
        { key: "story_chain", gameType: "STORY_CHAIN" },
        { key: "hot_seat", gameType: "HOT_SEAT" },
        { key: "quiz_superlatives", gameType: "QUIZ_SUPERLATIVES" },
        { key: "human_bingo", gameType: "HUMAN_BINGO" },
      ];

      for (const deck of decksToSeed) {
        const items = ibData[deck.key];
        if (!items) continue;

        const existing = await prisma.questionDeck.findFirst({
          where: {
            organizationId: systemOrgId,
            gameType: deck.gameType,
            locale: loc,
            isGlobal: true,
          },
        });

        if (!existing) {
          const localizedName = deckNames[deck.gameType]?.[loc] || deck.gameType;
          await prisma.questionDeck.create({
            data: {
              organizationId: systemOrgId,
              gameType: deck.gameType,
              name: `${localizedName} (${loc.toUpperCase()})`,
              locale: loc,
              items: items as object,
              isGlobal: true,
            },
          });
        }
      }
    }
  }
}

export async function runSeed() {
  console.log("🌱 Starting database seed...");

  // 1. Create or get System Tenant Organization
  const systemOrg = await prisma.organization.upsert({
    where: { slug: "liderzy-jutra-hq" },
    update: {},
    create: {
      name: "Liderzy Jutra HQ",
      slug: "liderzy-jutra-hq",
      isSystemTenant: true,
    },
  });

  // 2. Seed Global Content Banks (WordBanks & QuestionDecks)
  await seedGlobalContentBanks(systemOrg.id);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "tyberiusz.wylon@gmail.com";
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    await prisma.systemConfig.upsert({
      where: { key: "system_initialized" },
      update: { value: "true" },
      create: { key: "system_initialized", value: "true" },
    });
    console.log(`ℹ️ Admin user ${adminEmail} already exists. Skipping.`);
    return { skipped: true, email: adminEmail, userId: existingUser.id };
  }

  // Determine initial password
  let passwordHash: string;
  let mustChangePassword = false;

  if (process.env.SEED_ADMIN_PASSWORD_HASH) {
    passwordHash = process.env.SEED_ADMIN_PASSWORD_HASH;
  } else if (process.env.SEED_ADMIN_INITIAL_TEMP_PASSWORD) {
    passwordHash = await hashPassword(process.env.SEED_ADMIN_INITIAL_TEMP_PASSWORD);
  } else {
    // Generate secure one-time password
    const tempPassword = crypto.randomBytes(12).toString("base64url");
    passwordHash = await hashPassword(tempPassword);
    mustChangePassword = true;
    console.log("===============================================================");
    console.log(`🔑 INITIAL ADMIN ACTIVATION CREDENTIAL FOR ${adminEmail}:`);
    console.log(`   Temporary Password: ${tempPassword}`);
    console.log("   (Change this password upon first login!)");
    console.log("===============================================================");
  }

  // 3. Create Default Team if not exists
  let defaultTeam = await prisma.team.findFirst({
    where: { organizationId: systemOrg.id, name: "Główny Zespół Liderów" },
  });

  if (!defaultTeam) {
    defaultTeam = await prisma.team.create({
      data: {
        name: "Główny Zespół Liderów",
        organizationId: systemOrg.id,
      },
    });
  }

  // 4. Create Superadmin User
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: "SUPERADMIN",
      mustChangePassword,
      organizationId: systemOrg.id,
      profile: {
        create: {
          displayName: "Tyberiusz Wylon",
          chameleonColor: "#06B6D4",     // Cyber Teal
          chameleonSecondary: "#3B82F6", // Royal Blue
          chameleonAccent: "#10B981",    // Emerald Green
          avatarState: "celebrate",
        },
      },
      teamMemberships: {
        create: {
          teamId: defaultTeam.id,
          role: "SUPERADMIN",
        },
      },
    },
  });

  // 5. Mark system initialized
  await prisma.systemConfig.upsert({
    where: { key: "system_initialized" },
    update: { value: "true" },
    create: { key: "system_initialized", value: "true" },
  });

  console.log(`✅ Seed completed! Superadmin created with ID: ${adminUser.id}`);
  return { skipped: false, email: adminEmail, userId: adminUser.id };
}

if (process.argv[1] && (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"))) {
  runSeed()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
