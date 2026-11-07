# Milestone 3 Handoff Report: Trilingual i18n (PL, EN, UK) & Content Banks

**Author**: Explorer 1 (`explorer_m3_1`)  
**Date**: 2026-11-06  
**Status**: Investigation Complete — Ready for Implementation  
**Working Directory**: `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m3_1\`  
**Target Milestone**: Milestone 3 (F08, F09, Contract 4)

---

## 1. Observation

### 1.1 Internationalization Environment & Tooling
- **`package.json` inspection** (lines 13–24):
  `next: 15.5.29`, `react: 19.1.0`. The package `next-intl` is **not installed** in `dependencies` or `devDependencies`.
- **Dry-run installation check**:
  Command: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' install --dry-run next-intl`
  Output: `next-intl@4.14.9` resolves and installs 26 packages cleanly with zero peer dependency conflicts under React 19.
- **Current App Router Route Structure**:
  Inspection of `src/app/`:
  - `src/app/layout.tsx` (lines 17–29): Currently hardcoded `<html lang="pl">` with `ThemeProvider`.
  - `src/app/page.tsx` (lines 14–97): Landing portal with hardcoded Polish text.
  - `src/app/(auth)/login/page.tsx`: Full login UI with hardcoded Polish labels.
  - `src/app/(auth)/register/page.tsx`: Multi-tenant registration UI with hardcoded Polish labels.
  - `src/app/(auth)/setup/page.tsx`: Superadmin bootstrap UI with hardcoded Polish labels.
  - `src/app/dashboard/page.tsx`: 882 lines of multi-tenant dashboard UI with hardcoded Polish labels.
  - `src/app/api/...`: Authentication and CRUD endpoints expecting root path execution.

### 1.2 Database Schema & Global Asset Tenancy
- **`prisma/schema.prisma` inspection** (lines 166–195):
  - `WordBank` model exists:
    ```prisma
    model WordBank {
      id             String       @id @default(uuid())
      organizationId String
      name           String
      locale         String       @default("pl")
      category       String
      difficulty     String
      words          Json         // Array of strings
      isGlobal       Boolean      @default(false)
      createdAt      DateTime     @default(now())
      organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
      @@index([organizationId, locale])
    }
    ```
  - `QuestionDeck` model exists:
    ```prisma
    model QuestionDeck {
      id             String       @id @default(uuid())
      organizationId String
      gameType       String
      name           String
      locale         String       @default("pl")
      items          Json         // Array of question/dilemma objects
      isGlobal       Boolean      @default(false)
      createdAt      DateTime     @default(now())
      organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
      @@index([organizationId, gameType, locale])
    }
    ```
  - Contract 6 in `PROJECT.md` dictates: `WordBank` and `QuestionDeck` queries inject `where: { OR: [{ organizationId: currentOrgId }, { isGlobal: true }] }`, ensuring all tenants access system-wide global assets.

### 1.3 Linguistic & Algorithmic Empiricism
- **Contract 4 Requirements**:
  1. Ukrainian Cyrillic phoneme preservation: `і` (U+0456), `ї` (U+0457), and `є` (U+0454) must NEVER be stripped or collapsed to `и` or `е` (e.g. `кіт` [cat] $\neq$ `кит` [whale]; `дім` [house] $\neq$ `дим` [smoke]).
  2. Ukrainian apostrophes: Variants `’` (U+2019), `ʼ` (U+02BC), `` ` `` (U+0060), and `'` (U+0027) must evaluate identically (e.g. `м'яч` == `м’яч` == `мяч`).
  3. Ukrainian keyboard convenience: `ґ` (U+0491) $\to$ `г` (U+0433).
  4. Cross-alphabet Cyrillic/Latin homoglyph mapping: `а, е, і, о, р, с, х, у` $\leftrightarrow$ `a, e, i, o, p, c, x, y`.
  5. Polish diacritics tolerance: `ą, ć, ę, ł, ń, ó, ś, ź, ż` fallback to Latin.
  6. Levenshtein near-miss bound: $D_L = 1$ restricted to words of length $L \ge 5$; $D_L = 2$ restricted to $L \ge 7$. Short words ($L \le 4$, e.g. "pies" vs "piec", "cat" vs "cot") must return `isClose: false` to prevent clue leakage.
- **Empirical Execution of `test_fuzzy.mjs`**:
  Executed prototype using Node.js v26.13.0:
  - `кіт` vs `кит`: `isExact: false, isClose: false, distance: 1` ($L=3 < 5$, so no clue leaked).
  - `м’яч` vs `м'яч`: `isExact: true`.
  - `żółw` vs `zolw`: `isExact: true` via diacritic fallback.
  - Mixed Cyrillic `kаmеlеоn` vs Latin `kameleon`: `isExact: true` via homoglyph normalizer.
  - `drzewo` vs `drzewa` ($L=6$, dist=1): `isClose: true`.
  - `pies` vs `piec` ($L=4$, dist=1): `isClose: false`.
- **Empirical Execution of `test_profanity.mjs`**:
  Executed prototype across PL, EN, UK vulgar stems with leetspeak, spacing, and homoglyphs:
  - Sanitization masks vulgarities with `🦎🦎🦎` or `***`.
  - Homoglyph normalization caught mixed-script bypass (e.g., "ти мудак").
  - Validation returns localized youth safeguarding messages.

---

## 2. Logic Chain

1. **Routing Architecture Decision**:
   - *Premise*: Next.js 15 App Router dynamic parameters are asynchronous `Promise` objects. If all existing routes (`(auth)/*`, `dashboard/page.tsx`, etc.) are moved into `src/app/[locale]/...`, every server component and page parameter signature must be rewritten to `await params`, internal links like `/dashboard` or `/login` require prefix updates or complex middleware rewrites, and API routes require exclusion rules.
   - *Inference*: A **flat route architecture** with cookie/header persistence (`NEXT_LOCALE` / `tb_locale`), combined with a lightweight, reactive `I18nProvider` that loads canonical `messages/{pl,en,uk}.json` catalogs, delivers:
     1. Zero route breakage and zero migration risk for existing M2 routes and tests.
     2. Sub-millisecond client-side language switching without page reloads or layout unmounting.
     3. Full compatibility with Server Components via `cookies().get('NEXT_LOCALE')`.
     4. Clean integration with `next-intl` (if installed) or a zero-dependency type-safe catalog loader.

2. **Catalog Parity Enforcement**:
   - *Premise*: UI inconsistency occurs if keys present in `messages/pl.json` are missing in `messages/en.json` or `messages/uk.json`.
   - *Inference*: We establish a single shared TypeScript interface `Messages` derived from `pl.json`. A Vitest unit test will traverse all nested key paths across `pl.json`, `en.json`, and `uk.json`, asserting an exact 1:1 key parity check.

3. **Content Bank Storage & Seeding**:
   - *Premise*: Game sessions require drawing words and prompt banks locally available for instant offline/online play, plus dynamic tenant customization in the database.
   - *Inference*:
     - File catalogs in `messages/content/words.{pl,en,uk}.json` and `messages/content/icebreakers.{pl,en,uk}.json` provide version-controlled, fast JSON access.
     - Database seed script `prisma/seed.ts` populates `WordBank` and `QuestionDeck` with `isGlobal: true` and `organizationId: systemOrg.id`.
     - Contract 6 multi-tenant query extension automatically exposes these global rows to every organization without manual data duplication.

4. **Fuzzy Guess Matcher & Youth Profanity Filter Isolation**:
   - *Premise*: Game room WebSockets and chat endpoints require instantaneous validation of guesses and chats without external network latency.
   - *Inference*: Implement standalone, pure TypeScript modules:
     - `src/lib/game/fuzzy-matcher.ts`
     - `src/lib/game/profanity-filter.ts`
     Both have zero external dependencies, run in sub-millisecond time, and are 100% testable via Vitest.

---

## 3. Caveats

1. **Pre-existing Adversarial Test Failure in M2**:
   - In `tests/unit/adversarial-jwt.test.ts` (line 41), mutating the final character of a base64url-encoded HMAC signature from `'a'` to `'b'` failed to invalidate the signature because in base64url, the 43rd character contains 2 unused padding bits (zeroes); mutating the lower 2 bits does not change the decoded 32-byte hash. This is an M2 test implementation artifact, not a bug in the token verifier, but it should be noted.
2. **Next.js 15 Client/Server Message Hydration**:
   - When using `NextIntlClientProvider` or `I18nProvider`, the initial HTML must render using the cookie locale (defaulting to `'pl'`) to prevent SSR hydration mismatches. The `html` tag `lang` attribute should be dynamically set from the cookie.
3. **Mascot SVG Immutability**:
   - In strict compliance with system constraints, `src/components/mascot/chameleonLogoPaths.ts` and `src/components/mascot/ChameleonMascot.tsx` were neither modified nor altered.

---

## 4. Conclusion & Technical Blueprints

Milestone 3 is completely designed and specified. Below are the exact architectural blueprints, complete translation key catalogs, data schemas, and code specifications.

### Blueprint A: Trilingual Catalogs (`messages/`)

#### 1. `messages/pl.json`
```json
{
  "common": {
    "appName": "Team Bonding",
    "appSubtitle": "Liderzy Jutra",
    "loading": "Ładowanie...",
    "save": "Zapisz",
    "cancel": "Anuluj",
    "confirm": "Potwierdź",
    "delete": "Usuń",
    "edit": "Edytuj",
    "close": "Zamknij",
    "back": "Wróć",
    "next": "Dalej",
    "copy": "Kopiuj",
    "copied": "Skopiowano!",
    "or": "lub",
    "and": "i",
    "errorGeneric": "Wystąpił nieoczekiwany błąd.",
    "serverError": "Wystąpił błąd połączenia z serwerem."
  },
  "nav": {
    "home": "Strona główna",
    "dashboard": "Panel",
    "rooms": "Pokoje",
    "login": "Zaloguj się",
    "register": "Zarejestruj się",
    "logout": "Wyloguj",
    "themeLight": "Motyw jasny",
    "themeDark": "Motyw ciemny",
    "switchLanguage": "Zmień język"
  },
  "home": {
    "heroTitle": "Integracja online,",
    "heroTitleHighlight": "gdy nie możecie spotkać się na żywo.",
    "heroDescription": "Gry i aktywności dla zespołów młodzieżowych. Rysowanie, pytania integracyjne, bezpieczna multi-tenancy i więcej.",
    "startAction": "Zaczynamy",
    "registerTeamAction": "Zarejestruj zespół",
    "colorPickerTitle": "Kolor kameleona",
    "colorPickerDescription": "Wybierz kolor. Zmieni też akcenty w całej aplikacji.",
    "mascotStatesTitle": "Stany kameleona",
    "states": {
      "idle": "Spokój",
      "drawing": "Rysuje",
      "thinking": "Myśli",
      "celebrate": "Świętuje",
      "urgent": "Pośpiech"
    }
  },
  "auth": {
    "loginTitle": "Witaj w zespole!",
    "loginSubtitle": "Zaloguj się do platformy Team Bonding Liderzy Jutra",
    "emailLabel": "Adres e-mail",
    "emailPlaceholder": "twoj.email@liderzyjutra.pl",
    "passwordLabel": "Hasło",
    "passwordPlaceholder": "••••••••",
    "loginButton": "Zaloguj się",
    "loggingIn": "Logowanie...",
    "loginFailed": "Logowanie nie powiodło się.",
    "noAccount": "Nie masz jeszcze konta?",
    "registerLink": "Zarejestruj swój zespół",
    "registerOrgTitle": "Zarejestruj organizację",
    "joinTeamTitle": "Dołącz do zespołu",
    "registerOrgSubtitle": "Twórz pokoje gier, zapraszaj uczestników i buduj zgrany zespół",
    "joinTeamSubtitle": "Zostałeś zaproszony do wspólnej integracji w Liderach Jutra",
    "inviteTokenNotice": "Dołączasz za pośrednictwem tokenu zaproszenia",
    "displayNameLabel": "Twoje imię / Nick",
    "displayNamePlaceholder": "np. Aleksander",
    "orgNameLabel": "Nazwa organizacji / Koła",
    "orgNamePlaceholder": "np. Samorząd Uczniowski LO 1",
    "chameleonStyleLabel": "Styl Twojego Kameleona",
    "registerButton": "Utwórz konto i organizację",
    "joinButton": "Dołącz do zespołu",
    "registering": "Tworzenie konta...",
    "haveAccount": "Masz już konto?",
    "setupTitle": "Pierwsza konfiguracja platformy",
    "setupSubtitle": "Inicjalizacja konta Superadministratora dla Liderów Jutra",
    "setupWarning": "Ten formularz jest dostępny wyłącznie podczas pierwszego uruchomienia systemu i zostanie trwale zablokowany po utworzeniu konta.",
    "setupButton": "Zainicjalizuj system",
    "settingUp": "Konfigurowanie systemu...",
    "setupSuccess": "System został pomyślnie skonfigurowany!"
  },
  "dashboard": {
    "tabs": {
      "overview": "Przegląd",
      "teams": "Zespoły",
      "members": "Członkowie",
      "rooms": "Pokoje gier",
      "chameleon": "Mój Kameleon"
    },
    "welcome": "Cześć, {name}!",
    "roleSuperadmin": "Superadministrator",
    "roleOrgAdmin": "Administrator Organizacji",
    "roleFacilitator": "Facylitator",
    "roleMember": "Uczestnik",
    "statTeams": "Zespoły",
    "statMembers": "Członkowie",
    "statRooms": "Aktywne pokoje",
    "quickActions": "Szybkie akcje",
    "createTeamAction": "Nowy zespół",
    "inviteMemberAction": "Zaproś osobę",
    "launchRoomAction": "Uruchom pokój",
    "teamsTitle": "Zarządzanie Zespołami",
    "teamsSubtitle": "Twórz i organizuj podzespoły w ramach Twojej organizacji",
    "newTeamButton": "Dodaj zespół",
    "teamNameLabel": "Nazwa nowego zespołu",
    "teamNamePlaceholder": "np. Zespół Projektowy AI",
    "createTeamSubmit": "Utwórz zespół",
    "creatingTeam": "Tworzenie...",
    "membersTitle": "Członkowie i Zaproszenia",
    "membersSubtitle": "Zarządzaj dostępem i generuj linki z zaproszeniami",
    "inviteMemberButton": "Zaproś uczestnika",
    "inviteModalTitle": "Nowe zaproszenie",
    "inviteEmailLabel": "Adres e-mail zapraszanego",
    "inviteRoleLabel": "Rola w organizacji",
    "inviteTeamLabel": "Przypisz do zespołu (opcjonalnie)",
    "noTeamSelect": "Brak (ogólne zaproszenie)",
    "generateInviteSubmit": "Wygeneruj zaproszenie",
    "generatingInvite": "Generowanie...",
    "inviteLinkGenerated": "Link do zaproszenia gotowy!",
    "copyInviteLink": "Kopiuj link do zaproszenia",
    "roomsTitle": "Pokoje Gier i Aktywności",
    "roomsSubtitle": "Uruchamiaj sesje integracyjne i dołączaj do trwających gier",
    "launchRoomButton": "Uruchom nową sesję",
    "selectActivityLabel": "Wybierz aktywność",
    "assignTeamLabel": "Przypisz do zespołu",
    "launchRoomSubmit": "Uruchom pokój",
    "launchingRoom": "Uruchamianie...",
    "activeRoomsTitle": "Trwające sesje",
    "noActiveRooms": "Brak aktywnych pokoi. Uruchom pierwszy powyżej!",
    "roomCodeLabel": "Kod pokoju",
    "roomHostLabel": "Prowadzący",
    "joinRoomButton": "Dołącz do gry",
    "chameleonTabTitle": "Personalizacja Twojego Kameleona",
    "chameleonTabSubtitle": "Twój kameleon reprezentuje Cię we wszystkich pokojach gier"
  },
  "rooms": {
    "lobbyTitle": "Poczekalnia gry",
    "roomCode": "Kod pokoju: {code}",
    "copyCode": "Kopiuj kod",
    "shareLink": "Udostępnij link",
    "waitingForHost": "Oczekiwanie na uruchomienie gry przez prowadzącego...",
    "startGame": "Rozpocznij grę",
    "playersInRoom": "Uczestnicy w pokoju ({count})",
    "leaveRoom": "Opuść pokój",
    "settingsTitle": "Ustawienia pokoju",
    "drawTimeLabel": "Czas na rysowanie (sekundy)",
    "roundsLabel": "Liczba rund",
    "customWordsLabel": "Własne słowa (oddzielone przecinkami)",
    "chatPlaceholder": "Wpisz swoją odpowiedź lub wiadomość...",
    "send": "Wyślij",
    "solversMaskNotice": "Zgadłeś hasło! Twój czat jest teraz widoczny tylko dla osób, które też zgadły.",
    "isCloseAlert": "{name} jest bardzo blisko!",
    "guessedCorrectlyAlert": "{name} zgadł hasło! (+{points} pkt)",
    "drawerPointsAlert": "{name} otrzymuje punkty za rysowanie! (+{points} pkt)",
    "roundProgress": "Runda {current} z {total}",
    "timeLeft": "{seconds}s",
    "podiumTitle": "Wyniki Gry!",
    "firstPlace": "1. Miejsce",
    "secondPlace": "2. Miejsce",
    "thirdPlace": "3. Miejsce",
    "finalPoints": "{points} pkt",
    "playAgain": "Zagraj ponownie",
    "backToDashboard": "Wróć do panelu"
  },
  "activities": {
    "rysowanie": {
      "name": "Rysowanie (Skribbl)",
      "desc": "Kalambury online w czasie rzeczywistym z podpowiedziami literowymi",
      "chooseWordPrompt": "Wybierz słowo do narysowania:",
      "drawingTurnPrompt": "Twoja kolej na rysowanie!",
      "guessTurnPrompt": "Zgadnij, co rysuje {drawer}!",
      "wordToDraw": "Twoje hasło: {word}",
      "hints": "Podpowiedź: {hint}",
      "toolBrush": "Pędzel",
      "toolEraser": "Gumka",
      "toolFill": "Wypełnienie",
      "toolClear": "Wyczyść",
      "toolUndo": "Cofnij"
    },
    "two_truths": {
      "name": "Dwie prawdy i kłamstwo",
      "desc": "Zgadywanie sekretów i blefowanie w zespole",
      "submitPrompt": "Wpisz 2 prawdziwe fakty o sobie i 1 kłamstwo",
      "fact1": "Fakt 1",
      "fact2": "Fakt 2",
      "fact3": "Fakt 3",
      "markLiePrompt": "Które z powyższych to kłamstwo?",
      "votePrompt": "Zgadnij, które stwierdzenie {name} jest KŁAMSTWEM!",
      "bluffScore": "Punkty za blef: {points}",
      "revealTitle": "Odkrycie kart!"
    },
    "this_or_that": {
      "name": "To czy Tamto",
      "desc": "Dylematy integracyjne z natychmiastowym podziałem procentowym",
      "votePrompt": "Wybierz swoją odpowiedź!",
      "votedCount": "Głosów: {count}",
      "outlierBadge": "Jedyny Wybraniec 🦄"
    },
    "story_chain": {
      "name": "Wspólna Historia",
      "desc": "Kreatywne budowanie opowieści słowo po słowie lub zdanie po zdaniu",
      "currentTurnPrompt": "Teraz pisze: {name}",
      "wildcardAlert": "ZWROT AKCJI!",
      "fullStoryTitle": "Nasza Wspólna Opowieść",
      "exportMarkdown": "Eksportuj do Markdown"
    },
    "hot_seat": {
      "name": "Gorące Krzesło",
      "desc": "Pytania do lidera i członków zespołu z kołem ratunkowym",
      "leaderOnChair": "Na gorącym krześle: {name}",
      "tierFun": "Poziom 1: Zabawa",
      "tierValues": "Poziom 2: Wartości",
      "tierLeadership": "Poziom 3: Przywództwo",
      "passLifeline": "Koło Ratunkowe: PAS",
      "upvote": "Głosuj na to pytanie"
    },
    "quiz_superlatives": {
      "name": "Quiz Drużynowy",
      "desc": "Kto w drużynie...? Głosowanie i podium superlativów",
      "voteForTeammatePrompt": "Wybierz osobę z zespołu:",
      "winnerTitle": "Tytuł zdobywa: {name}!",
      "hallOfFame": "Księga Pamiątkowa Zespołu"
    },
    "human_bingo": {
      "name": "Bingo Integracyjne",
      "desc": "Interaktywne bingo poznawcze z weryfikacją rówieśniczą",
      "claimTrait": "Zaznacz cechę",
      "verifyPeerPrompt": "Poproś {name} o potwierdzenie!",
      "confirmVerification": "Potwierdzam",
      "bingoFanfare": "BINGO! Gratulacje!"
    }
  },
  "safeguarding": {
    "warning": "Dbajmy o kulturę i przyjazną atmosferę w zespole.",
    "profanityDetected": "Wykryto słowo niezgodne z zasadami kultury społeczności."
  }
}
```

#### 2. `messages/en.json` (100% Parity)
```json
{
  "common": {
    "appName": "Team Bonding",
    "appSubtitle": "Liderzy Jutra",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "copy": "Copy",
    "copied": "Copied!",
    "or": "or",
    "and": "and",
    "errorGeneric": "An unexpected error occurred.",
    "serverError": "Server connection error."
  },
  "nav": {
    "home": "Home",
    "dashboard": "Dashboard",
    "rooms": "Game Rooms",
    "login": "Sign In",
    "register": "Sign Up",
    "logout": "Log Out",
    "themeLight": "Light Theme",
    "themeDark": "Dark Theme",
    "switchLanguage": "Change Language"
  },
  "home": {
    "heroTitle": "Online Team Bonding,",
    "heroTitleHighlight": "when you can't meet in person.",
    "heroDescription": "Games and icebreakers for youth teams. Real-time drawing, integration prompts, secure multi-tenancy, and more.",
    "startAction": "Get Started",
    "registerTeamAction": "Register Team",
    "colorPickerTitle": "Chameleon Color",
    "colorPickerDescription": "Choose a color. It also updates accents across the entire application.",
    "mascotStatesTitle": "Chameleon States",
    "states": {
      "idle": "Calm",
      "drawing": "Drawing",
      "thinking": "Thinking",
      "celebrate": "Celebrating",
      "urgent": "Hurry"
    }
  },
  "auth": {
    "loginTitle": "Welcome to the Team!",
    "loginSubtitle": "Sign in to the Team Bonding Liderzy Jutra platform",
    "emailLabel": "Email address",
    "emailPlaceholder": "your.email@liderzyjutra.org",
    "passwordLabel": "Password",
    "passwordPlaceholder": "••••••••",
    "loginButton": "Sign In",
    "loggingIn": "Signing in...",
    "loginFailed": "Sign in failed.",
    "noAccount": "Don't have an account yet?",
    "registerLink": "Register your team",
    "registerOrgTitle": "Register Organization",
    "joinTeamTitle": "Join Team",
    "registerOrgSubtitle": "Create game rooms, invite members, and build a strong team",
    "joinTeamSubtitle": "You have been invited to bond with Liderzy Jutra",
    "inviteTokenNotice": "Joining via invitation token",
    "displayNameLabel": "Your Name / Nickname",
    "displayNamePlaceholder": "e.g. Alexander",
    "orgNameLabel": "Organization / Club Name",
    "orgNamePlaceholder": "e.g. Youth Leadership Council",
    "chameleonStyleLabel": "Your Chameleon Style",
    "registerButton": "Create Account & Organization",
    "joinButton": "Join Team",
    "registering": "Creating account...",
    "haveAccount": "Already have an account?",
    "setupTitle": "Initial Platform Setup",
    "setupSubtitle": "Initialize Superadministrator account for Liderzy Jutra",
    "setupWarning": "This form is only available during the initial system run and will be permanently locked after account creation.",
    "setupButton": "Initialize System",
    "settingUp": "Configuring system...",
    "setupSuccess": "System configured successfully!"
  },
  "dashboard": {
    "tabs": {
      "overview": "Overview",
      "teams": "Teams",
      "members": "Members",
      "rooms": "Game Rooms",
      "chameleon": "My Chameleon"
    },
    "welcome": "Hello, {name}!",
    "roleSuperadmin": "Superadministrator",
    "roleOrgAdmin": "Organization Admin",
    "roleFacilitator": "Facilitator",
    "roleMember": "Participant",
    "statTeams": "Teams",
    "statMembers": "Members",
    "statRooms": "Active Rooms",
    "quickActions": "Quick Actions",
    "createTeamAction": "New Team",
    "inviteMemberAction": "Invite Member",
    "launchRoomAction": "Launch Room",
    "teamsTitle": "Team Management",
    "teamsSubtitle": "Create and organize sub-teams within your organization",
    "newTeamButton": "Add Team",
    "teamNameLabel": "New team name",
    "teamNamePlaceholder": "e.g. AI Innovation Squad",
    "createTeamSubmit": "Create Team",
    "creatingTeam": "Creating...",
    "membersTitle": "Members & Invitations",
    "membersSubtitle": "Manage access and generate invitation links",
    "inviteMemberButton": "Invite Participant",
    "inviteModalTitle": "New Invitation",
    "inviteEmailLabel": "Invitee email address",
    "inviteRoleLabel": "Role in organization",
    "inviteTeamLabel": "Assign to team (optional)",
    "noTeamSelect": "None (general invitation)",
    "generateInviteSubmit": "Generate Invitation",
    "generatingInvite": "Generating...",
    "inviteLinkGenerated": "Invitation link ready!",
    "copyInviteLink": "Copy invitation link",
    "roomsTitle": "Rooms & Activities",
    "roomsSubtitle": "Launch team bonding sessions and join ongoing games",
    "launchRoomButton": "Launch New Session",
    "selectActivityLabel": "Select activity",
    "assignTeamLabel": "Assign to team",
    "launchRoomSubmit": "Launch Room",
    "launchingRoom": "Launching...",
    "activeRoomsTitle": "Ongoing Sessions",
    "noActiveRooms": "No active rooms yet. Launch the first one above!",
    "roomCodeLabel": "Room Code",
    "roomHostLabel": "Host",
    "joinRoomButton": "Join Game",
    "chameleonTabTitle": "Customize Your Chameleon",
    "chameleonTabSubtitle": "Your chameleon represents you across all game rooms"
  },
  "rooms": {
    "lobbyTitle": "Game Lobby",
    "roomCode": "Room Code: {code}",
    "copyCode": "Copy Code",
    "shareLink": "Share Link",
    "waitingForHost": "Waiting for host to start the game...",
    "startGame": "Start Game",
    "playersInRoom": "Players in room ({count})",
    "leaveRoom": "Leave Room",
    "settingsTitle": "Room Settings",
    "drawTimeLabel": "Drawing Time (seconds)",
    "roundsLabel": "Number of Rounds",
    "customWordsLabel": "Custom words (comma separated)",
    "chatPlaceholder": "Type your guess or message...",
    "send": "Send",
    "solversMaskNotice": "You guessed the word! Your chat is now visible only to solvers.",
    "isCloseAlert": "{name} is very close!",
    "guessedCorrectlyAlert": "{name} guessed the word! (+{points} pts)",
    "drawerPointsAlert": "{name} earned points for drawing! (+{points} pts)",
    "roundProgress": "Round {current} of {total}",
    "timeLeft": "{seconds}s",
    "podiumTitle": "Game Results!",
    "firstPlace": "1st Place",
    "secondPlace": "2nd Place",
    "thirdPlace": "3rd Place",
    "finalPoints": "{points} pts",
    "playAgain": "Play Again",
    "backToDashboard": "Back to Dashboard"
  },
  "activities": {
    "rysowanie": {
      "name": "Drawing (Skribbl)",
      "desc": "Real-time multiplayer drawing and guessing with letter hints",
      "chooseWordPrompt": "Choose a word to draw:",
      "drawingTurnPrompt": "Your turn to draw!",
      "guessTurnPrompt": "Guess what {drawer} is drawing!",
      "wordToDraw": "Your word: {word}",
      "hints": "Hint: {hint}",
      "toolBrush": "Brush",
      "toolEraser": "Eraser",
      "toolFill": "Fill Bucket",
      "toolClear": "Clear Canvas",
      "toolUndo": "Undo"
    },
    "two_truths": {
      "name": "Two Truths & A Lie",
      "desc": "Guess secrets and master bluffing with your team",
      "submitPrompt": "Submit 2 true facts about yourself and 1 lie",
      "fact1": "Fact 1",
      "fact2": "Fact 2",
      "fact3": "Fact 3",
      "markLiePrompt": "Which one of these is the lie?",
      "votePrompt": "Guess which statement by {name} is the LIE!",
      "bluffScore": "Bluff bonus: {points}",
      "revealTitle": "The Big Reveal!"
    },
    "this_or_that": {
      "name": "This or That",
      "desc": "Instant dilemma voting with live split statistics",
      "votePrompt": "Pick your choice!",
      "votedCount": "Votes: {count}",
      "outlierBadge": "The Lone Chosen One 🦄"
    },
    "story_chain": {
      "name": "Collaborative Story Chain",
      "desc": "Creative storytelling word-by-word or sentence-by-sentence",
      "currentTurnPrompt": "Currently writing: {name}",
      "wildcardAlert": "PLOT TWIST WILDCARD!",
      "fullStoryTitle": "Our Collective Story",
      "exportMarkdown": "Export to Markdown"
    },
    "hot_seat": {
      "name": "Hot Seat",
      "desc": "Q&A with leaders and teammates with a psychological safety pass",
      "leaderOnChair": "On the hot seat: {name}",
      "tierFun": "Level 1: Fun & Icebreaker",
      "tierValues": "Level 2: Values & Stories",
      "tierLeadership": "Level 3: Leadership & Reflection",
      "passLifeline": "Lifeline: PASS",
      "upvote": "Upvote question"
    },
    "quiz_superlatives": {
      "name": "Team Superlatives",
      "desc": "Who on the team...? Peer award voting and podium celebration",
      "voteForTeammatePrompt": "Vote for a teammate:",
      "winnerTitle": "Award goes to: {name}!",
      "hallOfFame": "Team Hall of Fame"
    },
    "human_bingo": {
      "name": "Human Bingo",
      "desc": "Interactive networking bingo with peer verification",
      "claimTrait": "Claim Trait",
      "verifyPeerPrompt": "Ask {name} to verify this trait!",
      "confirmVerification": "Confirm",
      "bingoFanfare": "BINGO! Congratulations!"
    }
  },
  "safeguarding": {
    "warning": "Please keep our team space positive, safe, and respectful.",
    "profanityDetected": "Inappropriate word detected according to community safety guidelines."
  }
}
```

#### 3. `messages/uk.json` (100% Parity with Ukrainian Orthography & Phoneme Preservation)
```json
{
  "common": {
    "appName": "Team Bonding",
    "appSubtitle": "Liderzy Jutra",
    "loading": "Завантаження...",
    "save": "Зберегти",
    "cancel": "Скасувати",
    "confirm": "Підтвердити",
    "delete": "Видалити",
    "edit": "Редагувати",
    "close": "Закрити",
    "back": "Назад",
    "next": "Далі",
    "copy": "Копіювати",
    "copied": "Скопійовано!",
    "or": "або",
    "and": "і",
    "errorGeneric": "Виникла неочікувана помилка.",
    "serverError": "Помилка з'єднання із сервером."
  },
  "nav": {
    "home": "Головна",
    "dashboard": "Панель",
    "rooms": "Кімнати",
    "login": "Увійти",
    "register": "Зареєструватися",
    "logout": "Вийти",
    "themeLight": "Світла тема",
    "themeDark": "Темна тема",
    "switchLanguage": "Змінити мову"
  },
  "home": {
    "heroTitle": "Онлайн-інтеграція,",
    "heroTitleHighlight": "коли немає змоги зустрітися наживо.",
    "heroDescription": "Ігри та активності для молодіжних команд. Малювання, командні питання, безпечний мульти-тенант простір тощо.",
    "startAction": "Почати",
    "registerTeamAction": "Зареєструвати команду",
    "colorPickerTitle": "Колір хамелеона",
    "colorPickerDescription": "Оберіть колір. Він змінить акценти в усьому застосунку.",
    "mascotStatesTitle": "Стани хамелеона",
    "states": {
      "idle": "Спокій",
      "drawing": "Малює",
      "thinking": "Думає",
      "celebrate": "Святкує",
      "urgent": "Поспіх"
    }
  },
  "auth": {
    "loginTitle": "Ласкаво просимо до команди!",
    "loginSubtitle": "Увійдіть до платформи Team Bonding Liderzy Jutra",
    "emailLabel": "Електронна пошта",
    "emailPlaceholder": "vash.email@liderzyjutra.org",
    "passwordLabel": "Пароль",
    "passwordPlaceholder": "••••••••",
    "loginButton": "Увійти",
    "loggingIn": "Вхід...",
    "loginFailed": "Не вдалося увійти.",
    "noAccount": "Ще не маєте акаунту?",
    "registerLink": "Зареєструйте свою команду",
    "registerOrgTitle": "Зареєструвати організацію",
    "joinTeamTitle": "Приєднатися до команди",
    "registerOrgSubtitle": "Створюйте кімнати, запрошуйте учасників та будуйте сильну команду",
    "joinTeamSubtitle": "Вас запрошено до спільної взаємодії в Liderzy Jutra",
    "inviteTokenNotice": "Приєднання за токеном запрошення",
    "displayNameLabel": "Ваше ім'я / Псевдонім",
    "displayNamePlaceholder": "напр. Олександр",
    "orgNameLabel": "Назва організації / клубу",
    "orgNamePlaceholder": "напр. Учнівське самоврядування",
    "chameleonStyleLabel": "Стиль вашого хамелеона",
    "registerButton": "Створити акаунт та організацію",
    "joinButton": "Приєднатися до команди",
    "registering": "Створення акаунту...",
    "haveAccount": "Вже маєте акаунт?",
    "setupTitle": "Первинне налаштування платформи",
    "setupSubtitle": "Ініціалізація акаунту суперадміністратора Liderzy Jutra",
    "setupWarning": "Ця форма доступна виключно під час першого запуску системи і буде назавжди заблокована після створення акаунту.",
    "setupButton": "Ініціалізувати систему",
    "settingUp": "Налаштування системи...",
    "setupSuccess": "Систему успішно налаштовано!"
  },
  "dashboard": {
    "tabs": {
      "overview": "Огляд",
      "teams": "Команди",
      "members": "Учасники",
      "rooms": "Кімнати ігор",
      "chameleon": "Мій Хамелеон"
    },
    "welcome": "Привіт, {name}!",
    "roleSuperadmin": "Суперадміністратор",
    "roleOrgAdmin": "Адміністратор організації",
    "roleFacilitator": "Фасилітатор",
    "roleMember": "Учасник",
    "statTeams": "Команди",
    "statMembers": "Учасники",
    "statRooms": "Активні кімнати",
    "quickActions": "Швидкі дії",
    "createTeamAction": "Нова команда",
    "inviteMemberAction": "Запросити учасника",
    "launchRoomAction": "Створити кімнату",
    "teamsTitle": "Керування командами",
    "teamsSubtitle": "Створюйте та організовуйте підгрупи у вашій організації",
    "newTeamButton": "Додати команду",
    "teamNameLabel": "Назва нової команди",
    "teamNamePlaceholder": "напр. Команда проєктів ШІ",
    "createTeamSubmit": "Створити команду",
    "creatingTeam": "Створення...",
    "membersTitle": "Учасники та запрошення",
    "membersSubtitle": "Керуйте доступом та генеруйте посилання із запрошеннями",
    "inviteMemberButton": "Запросити учасника",
    "inviteModalTitle": "Нове запрошення",
    "inviteEmailLabel": "Електронна пошта запрошеного",
    "inviteRoleLabel": "Роль в організації",
    "inviteTeamLabel": "Призначити до команди (необов'язково)",
    "noTeamSelect": "Немає (загальне запрошення)",
    "generateInviteSubmit": "Згенерувати запрошення",
    "generatingInvite": "Генерація...",
    "inviteLinkGenerated": "Посилання на запрошення готове!",
    "copyInviteLink": "Скопіювати посилання",
    "roomsTitle": "Кімнати та активності",
    "roomsSubtitle": "Запускайте інтеграційні сесії та приєднуйтесь до ігор",
    "launchRoomButton": "Запустити нову сесію",
    "selectActivityLabel": "Оберіть активність",
    "assignTeamLabel": "Призначити до команди",
    "launchRoomSubmit": "Запустити кімнату",
    "launchingRoom": "Запуск...",
    "activeRoomsTitle": "Поточні сесії",
    "noActiveRooms": "Наразі немає активних кімнат. Створіть першу вище!",
    "roomCodeLabel": "Код кімнати",
    "roomHostLabel": "Ведучий",
    "joinRoomButton": "Приєднатися до гри",
    "chameleonTabTitle": "Персоналізація вашого хамелеона",
    "chameleonTabSubtitle": "Ваш хамелеон представляє вас у всіх ігрових кімнатах"
  },
  "rooms": {
    "lobbyTitle": "Кімната очікування",
    "roomCode": "Код кімнати: {code}",
    "copyCode": "Скопіювати код",
    "shareLink": "Поділитися посиланням",
    "waitingForHost": "Очікування старту гри ведучим...",
    "startGame": "Розпочати гру",
    "playersInRoom": "Учасників у кімнаті ({count})",
    "leaveRoom": "Покинути кімнату",
    "settingsTitle": "Налаштування кімнати",
    "drawTimeLabel": "Час на малювання (секунди)",
    "roundsLabel": "Кількість раундів",
    "customWordsLabel": "Власні слова (через кому)",
    "chatPlaceholder": "Введіть відповідь або повідомлення...",
    "send": "Надіслати",
    "solversMaskNotice": "Ви відгадали слово! Тепер ваші повідомлення видно тільки тим, хто теж відгадав.",
    "isCloseAlert": "{name} дуже близько!",
    "guessedCorrectlyAlert": "{name} відгадав(ла) слово! (+{points} балів)",
    "drawerPointsAlert": "{name} отримує бали за малювання! (+{points} балів)",
    "roundProgress": "Раунд {current} з {total}",
    "timeLeft": "{seconds}с",
    "podiumTitle": "Результати гри!",
    "firstPlace": "1-е місце",
    "secondPlace": "2-е місце",
    "thirdPlace": "3-є місце",
    "finalPoints": "{points} балів",
    "playAgain": "Грати знову",
    "backToDashboard": "Повернутися до панелі"
  },
  "activities": {
    "rysowanie": {
      "name": "Малювання (Skribbl)",
      "desc": "Онлайн-шаради в реальному часі з підказками літер",
      "chooseWordPrompt": "Оберіть слово для малювання:",
      "drawingTurnPrompt": "Ваша черга малювати!",
      "guessTurnPrompt": "Вгадайте, що малює {drawer}!",
      "wordToDraw": "Ваше слово: {word}",
      "hints": "Підказка: {hint}",
      "toolBrush": "Пензель",
      "toolEraser": "Гумка",
      "toolFill": "Заливка",
      "toolClear": "Очистити полотно",
      "toolUndo": "Скасувати"
    },
    "two_truths": {
      "name": "Дві правди і брехня",
      "desc": "Вгадування секретів та блеф у команді",
      "submitPrompt": "Введіть 2 правдивих факти про себе та 1 брехню",
      "fact1": "Факт 1",
      "fact2": "Факт 2",
      "fact3": "Факт 3",
      "markLiePrompt": "Яке з тверджень є брехнею?",
      "votePrompt": "Вгадайте, яке твердження від {name} є БРЕХНЕЮ!",
      "bluffScore": "Бали за блеф: {points}",
      "revealTitle": "Розкриття карт!"
    },
    "this_or_that": {
      "name": "Те чи Інше",
      "desc": "Дилеми для команди з миттєвою статистикою голосування",
      "votePrompt": "Оберіть ваш варіант!",
      "votedCount": "Голосів: {count}",
      "outlierBadge": "Єдиний обранець 🦄"
    },
    "story_chain": {
      "name": "Спільна Історія",
      "desc": "Креативне складання історії слово за словом або речення за реченням",
      "currentTurnPrompt": "Зараз пише: {name}",
      "wildcardAlert": "НЕОЧІКУВАНИЙ ПОВОРОТ СЮЖЕТУ!",
      "fullStoryTitle": "Наша Спільна Оповідь",
      "exportMarkdown": "Експортувати в Markdown"
    },
    "hot_seat": {
      "name": "Гаряче Крісло",
      "desc": "Запитання до лідера та учасників із можливістю безпечного пасу",
      "leaderOnChair": "На гарячому кріслі: {name}",
      "tierFun": "Рівень 1: Розваги",
      "tierValues": "Рівень 2: Цінності",
      "tierLeadership": "Рівень 3: Лідерство",
      "passLifeline": "Рятівне коло: ПАС",
      "upvote": "Підтримати запитання"
    },
    "quiz_superlatives": {
      "name": "Командний Квіз",
      "desc": "Хто в команді...? Голосування за номінації та п'єдестал переможців",
      "voteForTeammatePrompt": "Оберіть людину з команди:",
      "winnerTitle": "Титул отримує: {name}!",
      "hallOfFame": "Пам'ятна книга команди"
    },
    "human_bingo": {
      "name": "Інтеграційне Бінго",
      "desc": "Інтерактивне бінго знайомства з підтвердженням від колег",
      "claimTrait": "Обрати рису",
      "verifyPeerPrompt": "Попросіть {name} підтвердити це!",
      "confirmVerification": "Підтверджую",
      "bingoFanfare": "БІНГО! Вітаємо!"
    }
  },
  "safeguarding": {
    "warning": "Дбаймо про культуру спілкування та дружню атмосферу в команді.",
    "profanityDetected": "Виявлено слово, що не відповідає правилам спільноти."
  }
}
```

---

### Blueprint B: High-Performance Trilingual i18n Client Provider & Language Switcher

#### `src/components/i18n/I18nProvider.tsx`
```tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import plMessages from "../../../messages/pl.json";
import enMessages from "../../../messages/en.json";
import ukMessages from "../../../messages/uk.json";

export type Locale = "pl" | "en" | "uk";
export const SUPPORTED_LOCALES: Locale[] = ["pl", "en", "uk"];
export const DEFAULT_LOCALE: Locale = "pl";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof plMessages>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const catalogs: Record<Locale, any> = {
  pl: plMessages,
  en: enMessages,
  uk: ukMessages,
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolvePath(obj: any, path: string): string | undefined {
  const segments = path.split(".");
  let current = obj;
  for (const seg of segments) {
    if (current && typeof current === "object" && seg in current) {
      current = current[seg];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Read from cookie or localStorage on initial mount
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const savedCookie = match ? match[1] : null;
    const savedLocal = localStorage.getItem("tb_locale");
    const active = (savedCookie || savedLocal) as Locale;
    if (active && SUPPORTED_LOCALES.includes(active)) {
      setLocaleState(active);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    localStorage.setItem("tb_locale", newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Search current locale
      let val = resolvePath(catalogs[locale], key);
      // 2. Resilient fallback to Polish
      if (val === undefined && locale !== "pl") {
        val = resolvePath(catalogs.pl, key);
      }
      // 3. Fallback to key itself
      if (val === undefined) {
        return key;
      }
      // 4. Interpolate parameters {name}, {count}, etc.
      if (params) {
        return val.replace(/\{(\w+)\}/g, (_, k) =>
          params[k] !== undefined ? String(params[k]) : `{${k}}`
        );
      }
      return val;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
```

#### `src/components/i18n/LanguageSwitcher.tsx`
```tsx
"use client";

import { useI18n, type Locale } from "./I18nProvider";

const LANGUAGES: { id: Locale; label: string; flag: string }[] = [
  { id: "pl", label: "PL", flag: "🇵🇱" },
  { id: "en", label: "EN", flag: "🇬🇧" },
  { id: "uk", label: "UK", flag: "🇺🇦" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="inline-flex items-center rounded-full border border-line bg-card p-1 shadow-[var(--shadow-sm)]"
    >
      {LANGUAGES.map((lang) => {
        const active = locale === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => setLocale(lang.id)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
              active
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:text-ink hover:bg-surface"
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

---

### Blueprint C: Localized Word Banks for "Rysowanie" (`words.{pl,en,uk}.json`)

The files `messages/content/words.{pl,en,uk}.json` contain categorized dictionaries for drawing:
- **`messages/content/words.pl.json`**:
```json
[
  {
    "category": "animals",
    "difficulty": "EASY",
    "words": ["kot", "pies", "ptak", "ryba", "koń", "żaba", "lew", "wilk", "kura", "słoń", "małpa", "kameleon", "motyl", "pingwin", "żyrafa"]
  },
  {
    "category": "everyday",
    "difficulty": "EASY",
    "words": ["dom", "auto", "okno", "drzwi", "zegar", "but", "chleb", "woda", "las", "stół", "plecak", "okulary", "książka", "lampa", "parasol"]
  },
  {
    "category": "actions",
    "difficulty": "MEDIUM",
    "words": ["taniec", "pływanie", "bieganie", "gotowanie", "czytanie", "spanie", "malowanie", "śpiewanie", "wspinaczka", "żonglerka"]
  },
  {
    "category": "tech",
    "difficulty": "MEDIUM",
    "words": ["rakieta", "laptop", "smartfon", "gitara", "satelita", "bateria", "mikrofon", "klawiatura", "dron", "słuchawki", "teleskop"]
  },
  {
    "category": "leadership",
    "difficulty": "HARD",
    "words": ["burza mózgów", "współpraca", "kompas", "inicjatywa", "dialog", "porozumienie", "odpowiedzialność", "synergia", "prezentacja"]
  },
  {
    "category": "ai_future",
    "difficulty": "HARD",
    "words": ["sztuczna inteligencja", "algorytm", "cyberbezpieczeństwo", "robotyka", "innowacja", "przyszłość", "sieć neuronowa", "awatar"]
  }
]
```

- **`messages/content/words.en.json`**:
```json
[
  {
    "category": "animals",
    "difficulty": "EASY",
    "words": ["cat", "dog", "bird", "fish", "horse", "frog", "lion", "wolf", "hen", "elephant", "monkey", "chameleon", "butterfly", "penguin", "giraffe"]
  },
  {
    "category": "everyday",
    "difficulty": "EASY",
    "words": ["house", "car", "window", "door", "clock", "shoe", "bread", "water", "forest", "table", "backpack", "glasses", "book", "lamp", "umbrella"]
  },
  {
    "category": "actions",
    "difficulty": "MEDIUM",
    "words": ["dancing", "swimming", "running", "cooking", "reading", "sleeping", "painting", "singing", "climbing", "juggling"]
  },
  {
    "category": "tech",
    "difficulty": "MEDIUM",
    "words": ["rocket", "laptop", "smartphone", "guitar", "satellite", "battery", "microphone", "keyboard", "drone", "headphones", "telescope"]
  },
  {
    "category": "leadership",
    "difficulty": "HARD",
    "words": ["brainstorming", "collaboration", "compass", "initiative", "dialogue", "consensus", "responsibility", "synergy", "presentation"]
  },
  {
    "category": "ai_future",
    "difficulty": "HARD",
    "words": ["artificial intelligence", "algorithm", "cybersecurity", "robotics", "innovation", "future", "neural network", "avatar"]
  }
]
```

- **`messages/content/words.uk.json`**:
```json
[
  {
    "category": "animals",
    "difficulty": "EASY",
    "words": ["кіт", "пес", "птах", "риба", "кінь", "жаба", "лев", "вовк", "курка", "слон", "мавпа", "хамелеон", "метелик", "пінгвін", "жирафа"]
  },
  {
    "category": "everyday",
    "difficulty": "EASY",
    "words": ["дім", "авто", "вікно", "двері", "годинник", "черевик", "хліб", "вода", "ліс", "стіл", "рюкзак", "окуляри", "книга", "лампа", "парасоля"]
  },
  {
    "category": "actions",
    "difficulty": "MEDIUM",
    "words": ["танці", "плавання", "біг", "кулінарія", "читання", "сон", "малювання", "спів", "скелелазіння", "жонглювання"]
  },
  {
    "category": "tech",
    "difficulty": "MEDIUM",
    "words": ["ракета", "ноутбук", "смартфон", "гітара", "супутник", "батарея", "мікрофон", "клавіатура", "дрон", "навушники", "телескоп"]
  },
  {
    "category": "leadership",
    "difficulty": "HARD",
    "words": ["мозковий штурм", "співпраця", "компас", "ініціатива", "діалог", "взаєморозуміння", "відповідальність", "синергія", "презентація"]
  },
  {
    "category": "ai_future",
    "difficulty": "HARD",
    "words": ["штучний інтелект", "алгоритм", "кібербезпека", "робототехніка", "інновація", "майбутнє", "нейромережа", "аватар"]
  }
]
```

---

### Blueprint D: Youth Integration Prompt Banks (`icebreakers.{pl,en,uk}.json`)

`messages/content/icebreakers.{pl,en,uk}.json` stores prompt decks for all 6 games:
1. `two_truths`: Inspiration themes (hobbies, travel, school, talents).
2. `this_or_that`: Dilemma pairs across Tech & AI, Leadership, Daily Life, Absurd & Comedy.
3. `story_chain`: Starters (Sci-Fi 2045, Night Hackathon, Chameleon Expedition) and Wildcards.
4. `hot_seat`: Tier 1 (Fun/Icebreaker), Tier 2 (Values & Stories), Tier 3 (Leadership & Reflection).
5. `quiz_superlatives`: 20+ award nominations.
6. `human_bingo`: 60 interactive traits with peer verification across 5 domains.

---

### Blueprint E: Fuzzy Guess Matcher (`src/lib/game/fuzzy-matcher.ts`)

```typescript
/**
 * Fuzzy Matcher Engine for "Rysowanie" (skribbl.io mechanics)
 * Enforces Contract 4:
 * - Ukrainian Cyrillic phoneme preservation (і, ї, є are never conflated with и, е)
 * - Ukrainian apostrophe normalization (U+0027, U+2019, U+02BC, U+0060)
 * - Ukrainian keyboard convenience (ґ -> г)
 * - Cross-alphabet Latin/Cyrillic homoglyph resolution (а, е, і, о, р, с, х, у <-> a, e, i, o, p, c, x, y)
 * - Polish diacritic tolerance (fallback after exact check)
 * - Levenshtein threshold: D_L = 1 restricted to length L >= 5; D_L = 2 restricted to length L >= 7.
 */

const CYRILLIC_TO_LATIN_HOMOGLYPHS: Record<string, string> = {
  "\u0430": "a", // Cyrillic small a
  "\u0435": "e", // Cyrillic small ie
  "\u0456": "i", // Cyrillic small byelorussian-ukrainian i
  "\u043E": "o", // Cyrillic small o
  "\u0440": "p", // Cyrillic small er
  "\u0441": "c", // Cyrillic small es
  "\u0445": "x", // Cyrillic small ha
  "\u0443": "y", // Cyrillic small u
};

const POLISH_DIACRITICS: Record<string, string> = {
  "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n",
  "ó": "o", "ś": "s", "ź": "z", "ż": "z",
};

export interface MatchResult {
  isExact: boolean;
  isClose: boolean;
  distance: number;
  matchedViaDiacriticFallback?: boolean;
  matchedViaHomoglyph?: boolean;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[n];
}

export function normalizeUkrainianApostrophes(str: string): string {
  return str.replace(/[\u2019\u02BC\u0060\u0027]/g, "'");
}

export function normalizeUkrainianKeyboard(str: string): string {
  return str.replace(/\u0491/g, "\u0433");
}

export function stripPolishDiacritics(str: string): string {
  let res = "";
  for (const ch of str) {
    res += POLISH_DIACRITICS[ch] || ch;
  }
  return res;
}

export function normalizeHomoglyphs(str: string): string {
  let res = "";
  for (const ch of str) {
    res += CYRILLIC_TO_LATIN_HOMOGLYPHS[ch] || ch;
  }
  return res;
}

export function matchGuess(rawTarget: string, rawGuess: string): MatchResult {
  let target = rawTarget.trim().toLowerCase().normalize("NFKC");
  let guess = rawGuess.trim().toLowerCase().normalize("NFKC");

  target = normalizeUkrainianKeyboard(normalizeUkrainianApostrophes(target));
  guess = normalizeUkrainianKeyboard(normalizeUkrainianApostrophes(guess));

  // 1. Direct exact match
  if (target === guess) {
    return { isExact: true, isClose: false, distance: 0 };
  }

  // 2. Ukrainian apostrophe-less match (м'яч vs мяч)
  const targetNoApos = target.replace(/'/g, "");
  const guessNoApos = guess.replace(/'/g, "");
  if (targetNoApos === guessNoApos) {
    return { isExact: true, isClose: false, distance: 0 };
  }

  // 3. Polish diacritics fallback (żółw vs zolw)
  const targetNoPl = stripPolishDiacritics(target);
  const guessNoPl = stripPolishDiacritics(guess);
  if (targetNoPl === guessNoPl) {
    return { isExact: true, isClose: false, distance: 0, matchedViaDiacriticFallback: true };
  }

  // 4. Cross-alphabet homoglyph matching
  const targetHomoglyph = normalizeHomoglyphs(targetNoPl);
  const guessHomoglyph = normalizeHomoglyphs(guessNoPl);
  if (targetHomoglyph === guessHomoglyph) {
    return { isExact: true, isClose: false, distance: 0, matchedViaHomoglyph: true };
  }

  // 5. Levenshtein near-miss calculation
  const dist = levenshteinDistance(targetNoPl, guessNoPl);
  const L = target.length;
  let isClose = false;

  // Contract 4: D_L = 1 only if L >= 5; D_L = 2 only if L >= 7
  if (dist === 1 && L >= 5) {
    isClose = true;
  } else if (dist === 2 && L >= 7) {
    isClose = true;
  }

  return { isExact: false, isClose, distance: dist };
}
```

---

### Blueprint F: Trilingual Youth Safeguarding Profanity Filter (`src/lib/game/profanity-filter.ts`)

```typescript
/**
 * Trilingual Youth Safeguarding Profanity Filter (PL, EN, UK)
 * Protects youth participants (ages 13-21) across public chat, guesses, and custom prompt submissions.
 */

const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "3": "e", "4": "a",
  "@": "a", "5": "s", "$": "s", "7": "t", "8": "b",
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  "\u0430": "a", "\u0435": "e", "\u0456": "i", "\u043E": "o",
  "\u0440": "p", "\u0441": "c", "\u0445": "x", "\u0443": "y",
};

function normalizeHomoglyphs(str: string): string {
  let res = "";
  for (const ch of str) {
    res += CYRILLIC_TO_LATIN[ch] || ch;
  }
  return res;
}

const PROFANITY_PATTERNS: RegExp[] = [
  // Polish vulgar roots
  /k+[uou]+r+w+/i,
  /c+h+u+j+/i,
  /h+u+j+/i,
  /j+e+b+[a-ząćęłńóśźż]*/i,
  /p+i+e+r+d+o+l+[a-ząćęłńóśźż]*/i,
  /p+i+z+d+[a-ząćęłńóśźż]*/i,
  /s+k+u+r+w+[a-ząćęłńóśźż]*/i,
  /s+z+m+a+t+[a-ząćęłńóśźż]*/i,
  /c+w+e+l+[a-ząćęłńóśźż]*/i,
  /d+u+p+e+k+/i,

  // English vulgar roots
  /f+u+c+k+[a-z]*/i,
  /s+h+i+t+[a-z]*/i,
  /b+i+t+c+h+[a-z]*/i,
  /a+s+s+h+o+l+e+[a-z]*/i,
  /c+u+n+t+[a-z]*/i,
  /d+i+c+k+[a-z]*/i,
  /b+a+s+t+a+r+d+[a-z]*/i,
  /w+h+o+r+e+[a-z]*/i,

  // Ukrainian vulgar roots (homoglyph-normalized)
  /x+y+й+[а-яіїєґa-z]*/i,
  /б+л+я+[дть]+[а-яіїєґa-z]*/i,
  /є+б+[а-яіїєґa-z]*/i,
  /ї+б+[а-яіїєґa-z]*/i,
  /п+и+з+д+[а-яіїєґa-z]*/i,
  /м+y+д+a+к+[а-яіїєґa-z]*/i,
  /г+a+н+д+o+н+[а-яіїєґa-z]*/i,
  /c+y+к+a+[а-яіїєґa-z]*/i,
];

function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  let mapped = "";
  for (const ch of normalized) {
    mapped += LEET_MAP[ch] || ch;
  }
  return normalizeHomoglyphs(mapped);
}

export function containsProfanity(rawText: string): boolean {
  if (!rawText || typeof rawText !== "string") return false;

  const text = rawText.trim();
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  const leetText = normalizeText(text);
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(leetText)) return true;
  }

  const compactText = leetText.replace(/[\s\.\-_,*]+/g, "");
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(compactText)) return true;
  }

  return false;
}

export function cleanText(rawText: string, maskType: "asterisk" | "chameleon" = "chameleon"): string {
  if (!rawText) return "";
  const mask = maskType === "chameleon" ? "🦎🦎🦎" : "***";

  const words = rawText.split(/(\s+|[.,!?;:()]+)/);
  const cleaned = words.map((word) => {
    if (containsProfanity(word)) {
      return mask;
    }
    return word;
  });

  return cleaned.join("");
}

const LOCALIZED_WARNINGS: Record<string, string> = {
  pl: "Dbajmy o kulturę i przyjazną atmosferę w zespole.",
  en: "Please keep our team space positive, safe, and respectful.",
  uk: "Дбаймо про культуру спілкування та дружню атмосферу в команді.",
};

export function validateSubmission(rawText: string, locale = "pl"): { isValid: boolean; error?: string } {
  if (containsProfanity(rawText)) {
    const error = LOCALIZED_WARNINGS[locale] || LOCALIZED_WARNINGS.pl;
    return { isValid: false, error };
  }
  return { isValid: true };
}
```

---

## 5. Verification Method

### 5.1 Test Execution Commands
The implementer can independently run the following test commands on Windows PowerShell:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
& 'C:\Program Files\nodejs\npm.cmd' test
```

### 5.2 Unit Test Blueprint for Verification
The implementer should add the following 3 dedicated test suites in `tests/unit/`:
1. `tests/unit/fuzzy-matcher.test.ts`:
   - Exact match assertions for PL, EN, UK.
   - Ukrainian phoneme preservation: `кіт` $\neq$ `кит`, `дім` $\neq$ `дим`.
   - Apostrophe variants: `м’яч` == `м'яч` == `мяч`.
   - Homoglyph cross-alphabet typing.
   - Polish diacritic fallback: `żółw` == `zolw`.
   - Length-bounded Levenshtein threshold: $D_L=1$ returns `isClose: false` when length $\le 4$; returns `isClose: true` when length $\ge 5$.
2. `tests/unit/profanity-filter.test.ts`:
   - Rejection of vulgar roots in PL, EN, UK.
   - Leetspeak and punctuation bypass evasion checks.
   - Mask replacement with `🦎🦎🦎` and `***`.
   - Localized educational warnings.
3. `tests/unit/i18n-parity.test.ts`:
   - Automated recursive key traversal asserting that every path in `pl.json` exists in `en.json` and `uk.json` with identical depth and non-empty string values.

### 5.3 Invalidation Conditions
- Any removal or conflation of Ukrainian phonemes (`і, ї, є` $\to$ `и, е`).
- Any clue leakage where words of length $\le 4$ trigger an "is close!" near-miss broadcast.
- Any modification of `chameleonLogoPaths.ts` or `ChameleonMascot.tsx`.
