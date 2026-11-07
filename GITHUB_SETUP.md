# Instrukcja konfiguracji GitHub i wdrożenia produkcyjnego (Deployment Guide)
**Liderzy Jutra - Aplikacja Team Building & Integracji** (`liderzyjutra.com`)

---

## 1. Inicjalizacja repozytorium Git i pierwsze wypchnięcie (Push) do GitHub

Jeśli repozytorium nie zostało jeszcze połączone z GitHub:

```bash
# 1. Zainicjuj repozytorium (jeśli jeszcze nie zainicjowane)
git init

# 2. Dodaj wszystkie pliki
git add .

# 3. Wykonaj początkowy commit
git commit -m "feat: complete Liderzy Jutra team building platform with 10 activities and real-time engine"

# 4. Ustaw główną gałąź na 'main'
git branch -M main

# 5. Utwórz nowe repozytorium na GitHub (np. liderzy-jutra-team-building) i połącz zdalnie:
git remote add origin https://github.com/<TWOJA_NAZWA_UZYTKOWNIKA>/<NAZWA_REPOZYTORIUM>.git

# 6. Wypchnij kod do GitHuba
git push -u origin main
```

---

## 2. Architektura wdrożenia (Wymagania WebSockets / Socket.io)

Platforma wykorzystuje proces zintegrowany (`server.ts`), który łączy **Next.js 15 App Router** z silnikiem **Socket.io** na pojedynczym porcie HTTP/WS.

> [!IMPORTANT]
> Standardowe środowiska serverless (takie jak darmowe Vercel Functions) mają limit czasu wykonania i nie wspierają ciągłych połączeń WebSocket.
> **Rekomendowane platformy wdrożeniowe z pełnym wsparciem WebSockets:**
> - **Railway** (zalecane: 1-click deploy z GitHub, obsługa Node.js & Docker)
> - **Render** (Web Service z persistent Node.js)
> - **Fly.io**
> - **Google Cloud Run** (z włączonym WebSocket / HTTP/2)
> - **Własny VPS** (Docker / Coolify / Dokku / PM2)

---

## 3. Zmienne środowiskowe (`.env.production`)

Skonfiguruj następujące zmienne w panelu hostingu:

```env
PORT=3000
NODE_ENV=production
HOSTNAME=0.0.0.0

# Baza danych (PostgreSQL np. Supabase / Neon / Railway Postgres)
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# Klucze JWT (wygeneruj unikalne silne ciągi znaków)
JWT_ACCESS_SECRET="wygeneruj-bardzo-dlugi-i-bezpieczny-losowy-ciag-znakow"
JWT_REFRESH_SECRET="wygeneruj-inny-bardzo-dlugi-bezpieczny-losowy-ciag-znakow"

# Super Admin (właściciel platformy Liderzy Jutra)
SEED_ADMIN_EMAIL="tyberiusz.wylon@gmail.com"
SEED_ADMIN_INITIAL_TEMP_PASSWORD="twoje-silne-haslo-tymczasowe"
```

---

## 4. Opcje wdrożenia krok po kroku

### Opcja A: Railway (Rekomendowane & Najszybsze)
1. Zaloguj się na [railway.app](https://railway.app).
2. Kliknij **"New Project"** -> **"Deploy from GitHub repo"**.
3. Wybierz repozytorium z aplikacją.
4. W zakładce **Variables** wprowadź zmienne z sekcji powyżej.
5. Dodaj usługę bazy danych **PostgreSQL** w projekcie Railway i przypisz jej URL do `DATABASE_URL`.
6. Railway automatycznie wykryje polecenie startowe `"npm run start"` (`tsx server.ts`) i udostępni publiczny adres HTTPS/WSS.

### Opcja B: Render
1. Zaloguj się na [render.com](https://render.com).
2. Utwórz **"Web Service"** powiązany z repozytorium GitHub.
3. Środowisko: **Node**.
4. Build Command: `npm install && npx prisma generate && npx prisma db push && npm run build`
5. Start Command: `npm run start`
6. Dodaj zmienne środowiskowe.

### Opcja C: Docker & Docker Compose
W projekcie znajduje się konfiguracja wieloetapowego kontenera. Aby uruchomić lokalnie lub na VPS:
```bash
docker build -t liderzy-jutra-app .
docker run -p 3000:3000 --env-file .env.production liderzy-jutra-app
```
