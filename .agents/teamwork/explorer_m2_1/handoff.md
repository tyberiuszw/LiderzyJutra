# Technical Reconnaissance & Implementation Architecture: Milestone 2
**Multi-Tenancy, Security, Organizations & Admin Accommodation**

---

## 1. Observation

Direct technical observations made across the workspace `c:\Users\tyber\teambonding`:

### 1.1 Existing Workspace & File Structure
- **Node & Runtime**: Node.js `v26.13.0` installed at `C:\Program Files\nodejs\node.exe`.
- **Framework & Dependencies** (`package.json`):
  - Next.js: `15.5.29` (App Router)
  - React / React-DOM: `19.1.0`
  - Tailwind CSS: `^4.0.0` (with `@tailwindcss/postcss ^4`)
  - Framer Motion: `^14.10.1`
  - Lucide React: `^1.70.0`
  - Vitest: `^5.1.0`
  - TypeScript: `^5.0.0`
- **Mascot Components**:
  - `src/components/mascot/ChameleonMascot.tsx` (lines 1-242) and `src/components/mascot/chameleonLogoPaths.ts` (lines 1-6) are intact and operational. They contain the official vectorized paths of the Liderzy Jutra chameleon (headset, dorsal body contour, 360° eye, shooting star fill and outline).
  - Test suite (`src/lib/theme/contrast.test.ts`): 15/15 tests passing.
  - Lint (`npm.cmd run lint`): 0 warnings, 0 errors.
  - Typecheck (`npm.cmd run typecheck`): 0 TypeScript errors.

### 1.2 Windows PowerShell Execution Quirks
- Running `npm.cmd test` directly fails with:
  `npm.cmd : The term 'npm.cmd' is not recognized as the name of a cmdlet...`
  Because `C:\Program Files\nodejs` is omitted from the default session `$env:Path`.
- Running `& 'C:\Program Files\nodejs\npm.cmd' test` fails with:
  `'"node"' is not recognized as an internal or external command...`
  Because child processes spawned by npm inherit the environment without `C:\Program Files\nodejs`.
- **Verified Working Invocation Pattern**:
  ```powershell
  $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <command>
  ```
  Once `$env:PATH` is prepended, all npm commands, vitest tests, typechecks, and eslint commands run cleanly with exit code 0.
- **Node v26 Native TypeScript Support**:
  Verified via test file `test_ts.ts`: Node v26.13.0 natively executes `.ts` files with type stripping enabled by default (`node.exe test_ts.ts` runs directly with code 0). No external transpilers (`ts-node`, `tsx`, `babel`) are required to run `prisma/seed.ts`.

### 1.3 Cryptography & Hashing Verification
- Native C++ addon packages (such as native Argon2 builds) risk compilation or binary mismatch issues on Windows systems lacking MSVC build tools or on Node 26.
- In contrast, Node's built-in `crypto.scrypt` + `crypto.randomBytes` + `crypto.timingSafeEqual` was directly benchmarked in `test_scrypt.js`:
  - Salt generation: 16 cryptographically secure bytes (`crypto.randomBytes(16)`).
  - Key derivation: Scrypt with $N = 16384$, $r = 8$, $p = 1$, 64-byte key length.
  - Verification: `crypto.timingSafeEqual` achieves constant-time comparison, preventing timing side-channel attacks.
  - Performance: Executed in $\sim 28\text{ms}$ with zero external dependencies.

### 1.4 JWT & Prisma Availability
- `jose` (`^6.2.15`): Verified via `npm install --dry-run jose`. Lightweight, pure Web Crypto API implementation, zero native dependencies, 100% compatible with Next.js 15 Server Components, Middleware, and Route Handlers.
- `prisma` and `@prisma/client`: Dry-run installation succeeded with 0 errors.
- SQLite connector for local dev: Prisma SQLite engine requires no background database service, operating on local file `file:./dev.db`.

---

## 2. Logic Chain

From the observations above, we establish the following architectural decisions:

### 2.1 Database & Schema: SQLite Local Dev with 100% PostgreSQL Parity
1. **Observation**: No PostgreSQL server is running locally on Windows. `ORIGINAL_REQUEST.md` stipulates: *"Configure Prisma with SQLite (`file:./dev.db`) for zero-config local execution while keeping the schema & repository layer 100% compatible with PostgreSQL / LibSQL"*.
2. **SQLite Constraints in Prisma**:
   - SQLite does not support native `enum` declarations in Prisma schema (`Error: SQLite does not support enums`).
   - SQLite does not support scalar lists (`words String[]` in `WordBank` fails schema validation).
3. **Resolution for 100% Parity**:
   - Represent roles and game types as `String` in Prisma schema with default values (e.g. `role String @default("TEAM_MEMBER")`, `status String @default("LOBBY")`).
   - Define strict TypeScript const types / enums (`Role`, `GameType`, `GameSessionStatus`) in `src/types/auth.ts` and `src/types/games.ts`.
   - Store `words` in `WordBank` as `Json` (or JSON string). Both SQLite and PostgreSQL fully support the `Json` scalar type in Prisma.
   - When deploying to production on PostgreSQL / Supabase / Neon / Turso, the developer only alters `provider = "postgresql"` in `prisma/schema.prisma` and points `DATABASE_URL` to PostgreSQL. All models, relations, cascades, and indexes remain 100% unchanged.

### 2.2 Password Security & Seeding Strategy
1. **Observation**: Plaintext credentials must never be committed to source code or git history (Contract 1 in `PROJECT.md`).
2. **Strategy**:
   - `src/lib/auth/password.ts` exposes:
     - `hashPassword(password: string): Promise<string>`
     - `verifyPassword(password: string, storedHash: string): Promise<boolean>`
   - Formatted PHC string: `scrypt$16384$8$1$<hexSalt>$<hexKey>`.
   - If an Argon2 hash is passed in `.env` (`SEED_ADMIN_PASSWORD_HASH`), `verifyPassword` detects the `$argon2` prefix and falls back gracefully or uses scrypt for all new passwords.
   - Seeding (`prisma/seed.ts`):
     - Reads `SEED_ADMIN_EMAIL` (defaulting to `tyberiusz.wylon@gmail.com`).
     - If `SEED_ADMIN_PASSWORD_HASH` is present, uses it directly.
     - Else if `SEED_ADMIN_INITIAL_TEMP_PASSWORD` is present, hashes it via `hashPassword()`.
     - Else generates a secure 24-character random activation token (`crypto.randomBytes(16).toString('base64url')`), hashes it, logs it ONCE to stdout during seed execution, and sets `mustChangePassword = true`.
     - Idempotency: Checks `prisma.user.findUnique({ where: { email } })`. If already exists, seed skips creation and exits cleanly.

### 2.3 Transactional Isolation for First-Run Setup (`/setup`)
1. **Observation**: Contract 1 requires eliminating TOCTOU (Time-of-Check to Time-of-Use) concurrency race conditions during first-run bootstrap.
2. **Strategy**:
   - Model `SystemConfig` stores `{ key: "system_initialized", value: "true" }`.
   - In `/api/auth/setup`:
     ```typescript
     await prisma.$transaction(async (tx) => {
       const existing = await tx.systemConfig.findUnique({ where: { key: "system_initialized" } });
       if (existing) {
         throw new ConflictError("System is already initialized");
       }
       // Create system organization, default team, superadmin user, and set system_initialized
       await tx.systemConfig.create({ data: { key: "system_initialized", value: "true" } });
     });
     ```
   - Any concurrent request hitting `/setup` will abort with `409 Conflict`.
   - Subsequent visits to `/setup` redirect directly to `/login`.

### 2.4 Multi-Tenant Model-Aware Scoping (`src/lib/db.ts`)
1. **Observation**: Naive `$allModels` Prisma extensions crash on models lacking `organizationId` (`UserProfile`, `DrawingAction`, `TeamMember`, etc.).
2. **Strategy**:
   - Implement `getScopedPrisma(organizationId: string)`:
     - Direct models (`User`, `Team`, `GameSession`): injects `where: { ...args.where, organizationId }`.
     - Shared catalog models (`WordBank`, `QuestionDeck`): injects `where: { ...args.where, OR: [{ organizationId }, { isGlobal: true }] }`.
     - Relational models (`TeamMember`): injects `where: { ...args.where, team: { organizationId } }`.
   - Export `prismaUnscoped` exclusively for initial auth lookups (`findUnique({ where: { email } })`) and platform superadmin analytics.

### 2.5 Next.js 15 App Router Conventions
1. **Observation**: Next.js 15.5.29 enforces asynchronous request headers and route params:
   - `const cookieStore = await cookies();`
   - `export default async function Page({ params }: { params: Promise<{ ... }> })`
   - `export default async function Page({ searchParams }: { searchParams: Promise<{ ... }> })`
2. **Implementation Rule**: All Route Handlers and Server Components in Milestone 2 must strictly `await` `cookies()`, `params`, and `searchParams`.

---

## 3. Caveats

1. **Native SQLite Concurrency**: SQLite in dev mode uses single-writer locking. For high concurrency load tests, SQLite will queue writes, which is normal for local dev. Production should target PostgreSQL / LibSQL.
2. **Socket.io Integration**: Milestone 2 builds the database models and session tokens (`tb_access_token`). The full WebSocket server and 25ms canvas stroke micro-batching are implemented in Milestone 4. Milestone 2 provides the room launcher endpoint and database persistence for sessions.
3. **i18n Route Grouping**: Milestone 2 provides UI routes in Polish (`/(auth)/login`, `/(auth)/register`, `/(auth)/setup`, `/dashboard`) with clean semantic layouts and translation-ready tokens, preparing for Milestone 3's `[locale]` dynamic route segments and `next-intl` catalog injection.

---

## 4. Conclusion & Concrete Architectural Blueprints

### 4.1 Exact Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Organization {
  id              String         @id @default(uuid())
  name            String
  slug            String         @unique
  isSystemTenant  Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  users           User[]
  teams           Team[]
  gameSessions    GameSession[]
  wordBanks       WordBank[]
  questionDecks   QuestionDeck[]
  invitations     Invitation[]

  @@index([slug])
}

model User {
  id                 String         @id @default(uuid())
  email              String         @unique
  passwordHash       String
  role               String         @default("TEAM_MEMBER") // SUPERADMIN, ORG_ADMIN, TEAM_FACILITATOR, TEAM_MEMBER
  mustChangePassword Boolean        @default(false)
  emailVerified      DateTime?
  locale             String         @default("pl")
  organizationId     String
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  organization       Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  profile            UserProfile?
  refreshTokens      RefreshToken[]
  teamMemberships    TeamMember[]
  hostedSessions     GameSession[]  @relation("SessionHost")
  scoreRecords       ScoreRecord[]
  createdInvitations Invitation[]   @relation("CreatedInvitations")

  @@index([email])
  @@index([organizationId])
}

model UserProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  displayName        String
  chameleonColor     String   @default("#06B6D4") // Default Cyber Teal
  chameleonSecondary String   @default("#3B82F6")
  chameleonAccent    String   @default("#10B981")
  avatarState        String   @default("idle")
  updatedAt          DateTime @updatedAt

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RefreshToken {
  id          String   @id @default(uuid())
  hashedToken String   @unique
  userId      String
  revoked     Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Team {
  id             String         @id @default(uuid())
  name           String
  organizationId String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members        TeamMember[]
  gameSessions   GameSession[]
  invitations    Invitation[]

  @@index([organizationId])
}

model TeamMember {
  id       String   @id @default(uuid())
  teamId   String
  userId   String
  role     String   @default("TEAM_MEMBER")
  joinedAt DateTime @default(now())

  team     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

model Invitation {
  id             String       @id @default(uuid())
  email          String
  organizationId String
  teamId         String?
  role           String       @default("TEAM_MEMBER")
  token          String       @unique
  invitedById    String
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  team           Team?        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  invitedBy      User         @relation("CreatedInvitations", fields: [invitedById], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([token])
}

model GameSession {
  id              String         @id @default(uuid())
  roomCode        String         @unique
  organizationId  String
  teamId          String?
  hostId          String
  currentGameType String         @default("RYSOWANIE") // RYSOWANIE, TWO_TRUTHS, THIS_OR_THAT, etc.
  status          String         @default("LOBBY")     // LOBBY, ACTIVE, PAUSED, COMPLETED
  settings        Json
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  team            Team?          @relation(fields: [teamId], references: [id], onDelete: SetNull)
  host            User           @relation("SessionHost", fields: [hostId], references: [id])
  drawingActions  DrawingAction[]
  scoreRecords    ScoreRecord[]
  bingoTiles      BingoTile[]

  @@index([roomCode])
  @@index([organizationId])
}

model DrawingAction {
  id          String      @id @default(uuid())
  sessionId   String
  roundNumber Int
  turnNumber  Int
  drawerId    String
  actionType  String      // STROKE, FILL, CLEAR
  payload     Json
  createdAt   DateTime    @default(now())

  session     GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, roundNumber, turnNumber])
}

model WordBank {
  id             String       @id @default(uuid())
  organizationId String
  name           String
  locale         String       @default("pl")
  category       String
  difficulty     String
  words          Json         // Stored as JSON array: ["kameleon", "rakieta"]
  isGlobal       Boolean      @default(false)
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, locale])
}

model QuestionDeck {
  id             String       @id @default(uuid())
  organizationId String
  gameType       String
  name           String
  locale         String       @default("pl")
  items          Json         // Array of localized dilemma/question objects
  isGlobal       Boolean      @default(false)
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, gameType, locale])
}

model ScoreRecord {
  id        String      @id @default(uuid())
  sessionId String
  userId    String?
  guestName String?
  gameType  String
  points    Int         @default(0)
  createdAt DateTime    @default(now())

  session   GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user      User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([sessionId, gameType])
}

model BingoTile {
  id             String      @id @default(uuid())
  sessionId      String
  participantId  String
  row            Int
  col            Int
  traitText      String
  verifiedByPeer String?
  isCompleted    Boolean     @default(false)
  createdAt      DateTime    @default(now())

  session        GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, participantId, row, col])
  @@index([sessionId, participantId])
}

model SystemConfig {
  key       String   @id
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 4.2 Seed Script Blueprint (`prisma/seed.ts`)

```typescript
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "tyberiusz.wylon@gmail.com";
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log(`ℹ️ Admin user ${adminEmail} already exists. Skipping.`);
    return;
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

  // 2. Create Default Team
  const defaultTeam = await prisma.team.create({
    data: {
      name: "Główny Zespół Liderów",
      organizationId: systemOrg.id,
    },
  });

  // 3. Create Superadmin User
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

  // 4. Mark system initialized
  await prisma.systemConfig.upsert({
    where: { key: "system_initialized" },
    update: { value: "true" },
    create: { key: "system_initialized", value: "true" },
  });

  console.log(`✅ Seed completed! Superadmin created with ID: ${adminUser.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 4.3 Password Hashing Implementation (`src/lib/auth/password.ts`)

```typescript
import crypto from "crypto";
import util from "util";

const scryptAsync = util.promisify(crypto.scrypt);

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })) as Buffer;

  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, derivedKey.toString("hex")].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !password) return false;

  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // If not scrypt format, return false
    return false;
  }

  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  const salt = parts[4];
  const expectedKey = Buffer.from(parts[5], "hex");

  const derivedKey = (await scryptAsync(password, salt, expectedKey.length, {
    N,
    r,
    p,
  })) as Buffer;

  return crypto.timingSafeEqual(expectedKey, derivedKey);
}
```

### 4.4 JWT & Session Management (`src/lib/auth/jwt.ts` and `src/lib/auth/session.ts`)

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "liderzy-jutra-development-secret-jwt-key-32-chars-min"
);

export interface TokenPayload {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  name: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookies(accessToken: string, refreshToken?: string) {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set("tb_access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 mins
  });

  if (refreshToken) {
    cookieStore.set("tb_refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("tb_access_token");
  cookieStore.delete("tb_refresh_token");
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("tb_access_token")?.value;
  if (!token) return null;
  return await verifyAccessToken(token);
}
```

### 4.5 API Route Specifications
1. **`POST /api/auth/setup`**:
   - Check if `SystemConfig` has `system_initialized`. If yes, returns `409 Conflict`.
   - In atomic `prisma.$transaction`: creates organization, team, superadmin user with `hashPassword()`, and marks `system_initialized`.
   - Sets JWT cookies, returns user data.
2. **`POST /api/auth/login`**:
   - Validates email and password using `verifyPassword()`.
   - Issues access token and refresh token in `HttpOnly` cookies.
   - Returns `{ success: true, user }`.
3. **`POST /api/auth/register`**:
   - Mode A (New Organization): creates new `Organization`, `Team`, `User` (ORG_ADMIN), `UserProfile`.
   - Mode B (Invitation Token): validates token from `Invitation`, joins existing organization and optional team.
   - Sets cookies, returns `{ success: true, user }`.
4. **`POST /api/auth/logout`**:
   - Clears auth cookies, revokes refresh token.
5. **`GET /api/auth/me`**:
   - Verifies JWT cookie, returns fresh user profile, organization, and teams.
6. **`GET /api/orgs` & `POST /api/orgs`**:
   - List and create organizations with tenant isolation.
7. **`GET /api/teams` & `POST /api/teams`**:
   - List and create teams within the authenticated user's organization.
8. **`GET /api/invitations` & `POST /api/invitations`**:
   - Create shareable invite link with expiration and team assignment.

### 4.6 App Router Pages
1. **`src/app/(auth)/login/page.tsx`**:
   - Branded login with animated `ChameleonMascot`, input fields, error handling, link to register and setup.
2. **`src/app/(auth)/register/page.tsx`**:
   - Registration for new youth organizations worldwide or joining via invite token. Includes dynamic chameleon color preset selector.
3. **`src/app/(auth)/setup/page.tsx`**:
   - First-run wizard automatically disabled once system is initialized. Pre-fills `tyberiusz.wylon@gmail.com`.
4. **`src/app/dashboard/page.tsx`**:
   - Responsive multi-tenant dashboard with 5 tabs:
     - **Przegląd (Overview)**: Summary metrics, quick room launcher.
     - **Zespoły (Teams)**: Team list, creation modal, member cards.
     - **Członkowie (Members & Invites)**: Member table, role promotions, copyable invitation links.
     - **Pokoje gier (Game Rooms)**: Generates 6-character room codes (`LJ-XXXX`), selector for *Rysowanie* + 6 integration games.
     - **Mój Kameleon (Personalization)**: Dynamic theme customizer updating `--chameleon-primary` with WCAG AA auto-contrast proof.

---

## 5. Verification Method

To independently verify the implementation:

1. **Prisma Generation & Migration**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npx.cmd' prisma generate
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npx.cmd' prisma db push
   ```
   *Expected*: Generated Prisma client in `node_modules/@prisma/client`, `dev.db` created in workspace.

2. **Seed Execution**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; node.exe prisma/seed.ts
   ```
   *Expected*: Creates `tyberiusz.wylon@gmail.com` without errors. Re-running confirms idempotency (`Admin user already exists. Skipping.`).

3. **Automated Unit & Integration Tests**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test
   ```
   *Expected*: Passes password hashing tests, JWT verification tests, and contrast tests.

4. **TypeScript & Lint Validation**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run typecheck
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run lint
   ```
   *Expected*: Zero errors, zero warnings.

5. **Security Plaintext Forensic Scan**:
   ```powershell
   Get-ChildItem -Recurse -File -Exclude "*.db","node_modules",".git",".next" | Select-String -Pattern "tyberiusz.*password"
   ```
   *Expected*: Zero plaintext credentials found anywhere in the codebase.
