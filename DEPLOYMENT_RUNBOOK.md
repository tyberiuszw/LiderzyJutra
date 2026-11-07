# Deployment Runbook: Team bonding Liderzy Jutra
## Global Cloud Production Hosting & Operations Guide

This runbook provides complete, production-grade instructions for deploying and running **Team bonding Liderzy Jutra** worldwide. The application is built as a single-port unified process that couples Next.js 15 (App Router) and Socket.io on a native Node.js HTTP server (`server.ts`), eliminating cross-origin CORS latency and simplifying cloud operations.

---

## 1. Architecture & Port Mapping

```
                                      Internet / Global Users
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │    Cloudflare / CDN & SSL (HTTPS/WSS) │
                             └───────────────────┬───────────────────┘
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │  Reverse Proxy (Nginx / Caddy / Cloud)│
                             └───────────────────┬───────────────────┘
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │ Docker Container / VPS (:3000)        │
                             │  ┌─────────────────────────────────┐  │
                             │  │ server.ts (Unified HTTP Server) │  │
                             │  │  ├─ Next.js 15 App Router (/app)│  │
                             │  │  └─ Socket.io Engine (/socket.io│  │
                             │  └─────────────────────────────────┘  │
                             └───────────────────┬───────────────────┘
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │  Database (PostgreSQL / LibSQL / DB)  │
                             └───────────────────────────────────────┘
```

- **Unified Single Port**: Standard port `3000` (or configured via `$PORT`). Both HTTP pages, REST APIs, and WebSocket connections (`/socket.io`) terminate at the exact same endpoint.
- **Node.js Runtime**: Node 20 LTS or Node 22 LTS on Alpine / Debian.

---

## 2. Cloud Database Options

### Option A: Supabase (Managed Cloud PostgreSQL - Recommended)
1. Sign in to [Supabase](https://supabase.com) and create a new project.
2. Under **Project Settings > Database**, find your connection string.
3. For connection pooling with transaction support, choose the Session pooler (port 5432) or Direct connection:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
   ```
4. In `prisma/schema.prisma`, update the datasource block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

### Option B: Neon (Serverless PostgreSQL)
1. Create a project at [Neon](https://neon.tech).
2. Copy the pooled connection string:
   ```env
   DATABASE_URL="postgresql://[USER]:[PASSWORD]@[ENDPOINT].neon.tech/neondb?sslmode=require"
   ```
3. Set `provider = "postgresql"` in `prisma/schema.prisma`.

### Option C: AWS RDS / DigitalOcean Managed PostgreSQL
1. Launch a PostgreSQL 16+ instance.
2. Configure security groups allowing inbound traffic on port 5432 from your application container / host IP.
3. Construct the connection string:
   ```env
   DATABASE_URL="postgresql://teambonding_admin:[SECURE_PASSWORD]@pg-host.internal:5432/teambonding?schema=public&sslmode=require"
   ```

### Option D: Turso / SQLite (Zero-Cost / Edge / Small Deployments)
- The default development configuration uses SQLite:
  ```env
  DATABASE_URL="file:./dev.db"
  ```
- If deploying with SQLite on a VPS or container, mount a persistent volume to preserve the database across restarts:
  ```bash
  docker run -d -v /var/data/teambonding:/app/data -e DATABASE_URL="file:/app/data/prod.db" teambonding
  ```

---

## 3. Environment Configuration & Cryptographic Secrets

Create a `.env` file in the project root or configure your cloud provider's Secret Manager with these variables:

| Variable | Description | Required | Example / Default |
|---|---|:---:|---|
| `DATABASE_URL` | Relational database connection string | Yes | `file:./dev.db` or PostgreSQL URI |
| `JWT_ACCESS_SECRET` | 256-bit secret for short-lived access JWTs (15 min) | Yes | 32+ char cryptographic random string |
| `JWT_REFRESH_SECRET` | 256-bit secret for long-lived refresh JWTs (30 days) | Yes | 32+ char cryptographic random string |
| `JWT_SECRET` | Fallback unified secret (if separate not set) | Optional | 32+ char cryptographic random string |
| `SEED_ADMIN_EMAIL` | Platform superadmin bootstrap email | Yes | `tyberiusz.wylon@gmail.com` |
| `SEED_ADMIN_INITIAL_TEMP_PASSWORD` | One-time temporary password for bootstrap user | Optional | `LiderzyJutra2026!Admin` (or auto-generated) |
| `PORT` | Unified HTTP & WebSocket listen port | No | `3000` |
| `HOSTNAME` | Host address binding (use 0.0.0.0 in Docker) | No | `0.0.0.0` |
| `NODE_ENV` | Node runtime environment | Yes | `production` |
| `NEXT_TELEMETRY_DISABLED` | Disables anonymous Next.js telemetry | No | `1` |

### How to Generate Cryptographic Secrets

**On Linux / macOS / Git Bash**:
```bash
openssl rand -base64 32
```

**On Windows PowerShell**:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | [byte[]]))
```

---

## 4. Database Migration & Seed Provisioning

### 1. Push Database Schema
For initial setup or schema updates:
```bash
# Push schema directly to the database
npx prisma db push

# OR if using Prisma migrations workflow
npx prisma migrate deploy
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Idempotent Bootstrap Seed
The seed script provisions:
- The default organization (*Liderzy Jutra*)
- The superadmin account (`tyberiusz.wylon@gmail.com`) with role `SUPERADMIN` and `mustChangePassword: true`
- Default teams (*Zespół Alfa*, *Zespół Beta*)
- Global trilingual word banks and youth integration prompt decks
```bash
npx tsx prisma/seed.ts
```

> **Security Note**: `prisma/seed.ts` is 100% idempotent. If the superadmin user already exists, it skips modification and never overwrites existing passwords.

---

## 5. Docker Container Build & Execution

### 1. Build the Multi-Stage Image
```bash
docker build -t teambonding:latest .
```

### 2. Run Container Locally or on VPS
```bash
docker run -d \
  --name teambonding-prod \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  teambonding:latest
```

### 3. Verify Container Health
```bash
# Check container status
docker ps -f name=teambonding-prod

# Inspect logs
docker logs -f teambonding-prod

# Test HTTP endpoint
curl -I http://localhost:3000/
```

### Docker Compose Multi-Container Stack (App + PostgreSQL)

Save this as `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: teambonding
      POSTGRES_USER: teambonding_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-SuperSecretPgPassword2026!}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U teambonding_user -d teambonding"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://teambonding_user:${DB_PASSWORD:-SuperSecretPgPassword2026!}@postgres:5432/teambonding?schema=public
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL:-tyberiusz.wylon@gmail.com}
      - SEED_ADMIN_INITIAL_TEMP_PASSWORD=${SEED_ADMIN_INITIAL_TEMP_PASSWORD:-}
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NODE_ENV=production
    command: >
      sh -c "npx prisma db push &&
             npx tsx prisma/seed.ts &&
             npm run server"

volumes:
  pgdata:
```

Launch with:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 6. One-Command Cloud Hosting Guides

### Railway (Recommended for Instant Global Hosting)
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login and initialize:
   ```bash
   railway login
   railway init
   ```
3. Add a PostgreSQL plugin via Railway dashboard.
4. Set environment variables (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SEED_ADMIN_EMAIL`).
5. Deploy:
   ```bash
   railway up
   ```
   Railway automatically detects `Dockerfile` and binds port `3000` to your public URL (e.g. `https://teambonding-production.up.railway.app`).

### Render
1. In the Render Dashboard, click **New > Web Service**.
2. Connect your Git repository.
3. Select **Docker** environment.
4. Set **Health Check Path** to `/`.
5. Under **Environment Variables**, supply your database URL and JWT secrets.
6. Click **Create Web Service**.

### Fly.io
1. Install `flyctl`: `curl -L https://fly.io/install.sh | sh`
2. Launch app config:
   ```bash
   fly launch
   ```
3. Set secrets:
   ```bash
   fly secrets set JWT_ACCESS_SECRET="your-access-secret" JWT_REFRESH_SECRET="your-refresh-secret"
   ```
4. Deploy:
   ```bash
   fly deploy
   ```

---

## 7. Production Domain, SSL/TLS & Reverse Proxy

For a production custom domain (e.g. `bonding.liderzyjutra.com`), configure a reverse proxy to terminate TLS and forward WebSocket connections.

### Nginx Configuration
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream teambonding_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name bonding.liderzyjutra.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bonding.liderzyjutra.com;

    # SSL certificates (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/bonding.liderzyjutra.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bonding.liderzyjutra.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client body size limit for prompt and bank uploads
    client_max_body_size 10M;

    # Socket.io WebSocket location
    location /socket.io/ {
        proxy_pass http://teambonding_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Next.js application & API routes
    location / {
        proxy_pass http://teambonding_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy Configuration (Automatic HTTPS)
```caddy
bonding.liderzyjutra.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```

### Cloudflare Configuration Checklist
1. **WebSockets**: Under **Network**, ensure **WebSockets** is toggled **ON**.
2. **SSL/TLS Mode**: Set to **Full (strict)** if origin has valid cert, or **Full**.
3. **Rocket Loader**: Under **Speed > Optimization**, ensure Rocket Loader is **OFF** for `/room/*` to prevent interfering with real-time Canvas and Socket.io event scripts.
4. **Proxy Status**: Keep the orange cloud active for DDoS mitigation and global CDN caching of Next.js static assets (`/_next/static/*`).

---

## 8. Operational Maintenance & Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| Socket.io reconnects repeatedly | WebSocket upgrade header stripped by proxy | Verify `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` in proxy config. |
| Database connection error on startup | Cloud PostgreSQL requires SSL or pooler timeout | Ensure `sslmode=require` is present in `DATABASE_URL` query string. |
| 401 Unauthorized upon admin login | Bootstrap temporary password expired or changed | Check server logs for one-time activation token or reset password via `npx tsx prisma/seed.ts`. |
| Port 3000 already in use | Stale background Node process running | Run `lsof -i :3000` (Linux) or `Get-NetTCPConnection -LocalPort 3000` (Windows) and terminate the PID. |
| Canvas flood fill stuttering on low-end devices | Client running with heavy CPU background load | The 1200x900 non-recursive scanline fill uses `Uint32Array` with `Uint8Array` bitmask; average completion time is <15ms. |

---

## 9. Verification & Smoke Test Checklist

After deployment to any cloud environment:
- [ ] Access `https://your-domain.com/` — verifies landing page, mascot vector graphics, and CSS theming.
- [ ] Switch languages (`PL`, `EN`, `UK`) via the language pill switcher.
- [ ] Log in with `SEED_ADMIN_EMAIL` at `/login`.
- [ ] Access the multi-tenant `/dashboard` — create an organization, invite a team member.
- [ ] Open a Game Room `/room/[code]` in two browser windows.
- [ ] Test "Rysowanie" real-time canvas drawing and guessing synchronization across tabs.
- [ ] Switch activity to each of the 6 Integration Games:
  - *Dwie Prawdy i Kłamstwo*
  - *To czy Tamto*
  - *Wspólna Historia*
  - *Gorące Krzesło*
  - *Quiz Drużynowy*
  - *Bingo Integracyjne*
- [ ] Verify session scoreboard aggregates scores across games.
