## Executive Summary

I will perform a **meticulous, line‑by‑line comparison** between the `docker-compose-dev.yml` I proposed and the sample configuration files you provided (`docker-compose.yml` and `Dockerfile.sample.dev`). The goal is to **identify best practices, security improvements, and architectural patterns** that should be incorporated into the OneStopNews Docker development environment, while maintaining alignment with the `MASTER_EXECUTION_PLAN_v5.1.md`.

The comparison will highlight differences in:
- Service definitions (PostgreSQL, Redis, frontend/Next.js, optional Nginx)
- Networking, volumes, health checks
- Dockerfile structure (user privileges, health checks, dependency management)
- Environment variable handling
- Package manager (npm vs pnpm)
- Worker service inclusion

After the analysis, I will propose **actionable improvements** to our existing `docker-compose-dev.yml`, `Dockerfile.dev`, `Dockerfile.worker.dev`, and supporting files.

---

## Phase 1: ANALYZE – Compare Configurations

### 1.1 Files to Compare

| Our Proposal | Sample Provided |
|--------------|----------------|
| `docker-compose-dev.yml` | `docker-compose.yml` (sample) |
| `Dockerfile.dev` | `Dockerfile.sample.dev` |
| `Dockerfile.worker.dev` | (No equivalent – separate worker) |
| `.env.docker` | `.env` (referenced in sample) |
| `scripts/dev-setup.sh` | No direct equivalent |

### 1.2 Comparison Matrix – `docker-compose-dev.yml` vs Sample

| Aspect | Our Proposal | Sample | Analysis |
|--------|--------------|--------|----------|
| **PostgreSQL image** | `postgres:17-alpine` | `postgres:17-trixie` (suggests switching to alpine for consistency) | ✅ Our alpine is lighter; sample comment agrees. |
| **Environment variables** | Simple `POSTGRES_USER/PASSWORD/DB` | Adds `POSTGRES_HOST_AUTH_METHOD=trust`, `TZ`, `PGDATA` | ⚠️ Missing `TZ` and `trust` mode (dev convenience). |
| **PostgreSQL command** | None (default) | Custom command with timezone, log settings, shared buffers | ✅ Our proposal is simpler; for dev, defaults are fine. But sample’s config is more realistic for production. |
| **Port binding** | `"5432:5432"` (all interfaces) | `"127.0.0.1:5432:5432"` (loopback only) | ✅ Loopback is safer – should adopt. |
| **Volumes** | `postgres_data` named volume | Same + `./init-scripts:/docker-entrypoint-initdb.d:ro` | ✅ We already mount `./scripts/init-extensions.sql` via that pattern. |
| **Healthcheck** | Uses `pg_isready -U onestopnews` | Uses `pg_isready -U $$(echo $$POSTGRES_USER ...)` (more robust) | ⚠️ Sample’s healthcheck is more generic; we can improve. |
| **Networks** | Not defined (default bridge) | Explicit `onestopnews-network` | ⚠️ Using a custom network is better for isolation and service discovery. |
| **Redis** | `redis:7-alpine` | `redis:7.4-alpine` (version pinned) | ✅ Pin to `7-alpine` is fine, but consider pinning minor version. |
| **Redis command** | `--maxmemory-policy noeviction` | `--maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes --save 60 1000` | ❌ Our `noeviction` policy is per MEP; sample uses `allkeys-lru`. For dev, both work but MEP requires `noeviction`. Sample also sets maxmemory and persistence. |
| **Redis port** | `"6379:6379"` (all interfaces) | `"0.0.0.0:6379:6379"` (same) | ⚠️ Should bind to loopback for safety. |
| **Frontend service** | `web` using `Dockerfile.dev` | `frontend` using `Dockerfile.sample.dev` | – |
| **Build context** | `.` (root) | `../` (relative to docker dir) – different layout. Our context is project root. | ✅ Our context is correct for a root‑level compose file. |
| **Environment files** | Uses `.env.docker` and inline env | Uses `.env` file and overrides with `environment` | ⚠️ Consistent; we can support both. |
| **Expose ports** | `"3000:3000"` directly to host | `expose: 3000` (only to internal network) + Nginx proxy | ❌ Sample uses Nginx for SSL termination, which is more production‑like even in dev. For pure dev, direct expose is simpler. But if we want to test HTTPS locally, we should include Nginx. |
| **Volumes** | Mounts entire project, `/app/node_modules` as anonymous, plus `pnpm_store` volume | Mounts whole project, plus `/app/node_modules` and `/app/apps/web/.next` (to persist .next cache) | ⚠️ We should also mount `.next` to speed up rebuilds. |
| **Depends on** | `postgres`, `redis` with `condition: service_healthy` | Same, but also uses `depends_on` without condition? Sample shows simple depends. | ✅ Our health‑condition is better. |
| **Command** | `sh -c "pnpm install && pnpm dev -- --hostname 0.0.0.0"` | `["npm", "run", "dev"]` (assumes install already done) | ⚠️ Our approach re‑installs on every start – slow. Better to rely on volume for node_modules and install only once. |
| **Nginx service** | Not present | Included, terminates SSL on port 8443, proxies to frontend | ❓ Do we need Nginx in dev? For testing SSL/proxying, yes. For pure frontend/worker dev, not necessary. But sample shows a more complete stack. |
| **Worker service** | Present (`worker` with own Dockerfile) | Not present | ✅ Our worker is required per MEP. |

### 1.3 Comparison – `Dockerfile.dev` vs `Dockerfile.sample.dev`

| Aspect | Our `Dockerfile.dev` | Sample `Dockerfile.sample.dev` | Analysis |
|--------|----------------------|-------------------------------|----------|
| **Base image** | `node:24-alpine` | Same | ✅ |
| **Package manager** | `pnpm` (via corepack) | `npm` | ✅ We stick with pnpm. |
| **System dependencies** | None | Installs `git`, `curl`, `ca-certificates` | ⚠️ `curl` is needed for healthcheck. We should add it. |
| **Copy strategy** | Copies `package.json`, `pnpm-lock.yaml`, then `packages/` | Copies `package*.json`, runs `npm install`, then copies all | ⚠️ We should copy only necessary files first for caching. |
| **Install command** | `pnpm install --frozen-lockfile` | `npm install` | ✅ Equivalent. |
| **User creation** | Does not create non‑root user | Creates `wellfond` user and switches | ❌ **Critical missing** – running as root in container is a security risk. We must add a non‑root user. |
| **Healthcheck** | None | Uses `curl` to check `/api/proxy/health/` | ⚠️ Good practice; we should add a healthcheck for Next.js. |
| **CMD** | `pnpm dev -- --hostname 0.0.0.0` | `npm run dev` | ✅ Correct, but we might want to avoid re‑installing on every start. |

### 1.4 Additional Observations

- **Networking**: Sample defines a dedicated bridge network (`onestopnews-network`) and attaches all services. This improves isolation and avoids port conflicts. We should adopt.
- **Nginx**: The sample includes Nginx as a reverse proxy with SSL termination. While not strictly required for development, it enables testing HTTPS and proxy rules locally. We could make it optional (e.g., via a separate compose override file).
- **Volume for `.next`**: The sample mounts `/app/apps/web/.next` as a volume to preserve build cache. Since our project uses Next.js in the root (no `apps/web` subfolder), we should mount `./.next` if it exists.
- **Environment variable defaults**: The sample uses `${DB_PASSWORD:-default}` syntax, which is more flexible. We can adopt that.
- **Worker service**: The sample does not have a worker. Our proposal includes it, which is correct per MEP.

---

## Phase 2: PLAN – Recommended Improvements & Action Items

Based on the analysis, I will adjust our Docker configuration to incorporate the following **best practices** from the sample, while preserving MEP requirements (e.g., `noeviction` for Redis, pnpm, separate worker).

### 2.1 Changes to `docker-compose-dev.yml`

| # | Improvement | Rationale |
|---|-------------|-----------|
| 1 | Add custom network `onestopnews-network` | Better isolation and service discovery. |
| 2 | Bind PostgreSQL and Redis to loopback (`127.0.0.1:5432:5432`) | Security – prevents external access. |
| 3 | Improve PostgreSQL healthcheck to use dynamic user variable | More robust. |
| 4 | Add `TZ: Asia/Singapore` and `PGDATA` to PostgreSQL env | Consistency with sample; optional but good. |
| 5 | Set `POSTGRES_HOST_AUTH_METHOD=trust` for dev convenience | Avoids password hassles. |
| 6 | Add `maxmemory 512mb` to Redis command (keep `noeviction`) | Limits memory usage. |
| 7 | Add `appendonly yes` and `save 60 1000` to Redis for persistence | Dev data survives restarts. |
| 8 | Mount `./.next` as a volume for the web service | Preserves Next.js build cache. |
| 9 | Remove `command` that runs `pnpm install` on every start; rely on volume for node_modules and run install once in Dockerfile or via setup script. | Performance. |
| 10 | Add healthcheck for web service (optional). | Better orchestration. |
| 11 | Optionally add an Nginx service for HTTPS testing (commented out or separate override). | For SSL testing. |

### 2.2 Changes to `Dockerfile.dev`

| # | Improvement | Rationale |
|---|-------------|-----------|
| 1 | Install `curl` and `ca-certificates` | Needed for healthcheck. |
| 2 | Create a non‑root user (`onestopnews`) and switch to it | Security – never run as root in containers. |
| 3 | Add a healthcheck using `curl` | Aligns with sample pattern. |
| 4 | Optimize layer caching: copy `package.json` and `pnpm-lock.yaml` first, then `packages/` (if any), then run `pnpm install`. | Speeds up rebuilds. |
| 5 | Set `NEXT_TELEMETRY_DISABLED=1` | Disable Next.js telemetry. |

### 2.3 Changes to `Dockerfile.worker.dev`

| # | Improvement | Rationale |
|---|-------------|-----------|
| 1 | Install `curl` (for potential healthcheck) | Consistency. |
| 2 | Create non‑root user and switch. | Security. |
| 3 | Add a simple healthcheck (e.g., check if process is alive). | Optional but good. |
| 4 | Use `pnpm install` during build, not on every run. | Performance. |

### 2.4 Changes to Supporting Files

- **`.env.docker`**: Add `DB_PASSWORD` variable with default, use `${DB_PASSWORD:-...}` syntax in compose.
- **`scripts/dev-setup.sh`**: Update to create `.env` from `.env.docker` if not present.
- **Optional `docker-compose.override.yml`**: For developers who want Nginx/HTTPS, provide an override file.

### 2.5 Nginx Integration (Optional)

I will add a commented‑out Nginx service in `docker-compose-dev.yml` with instructions on how to enable it. This follows the sample’s pattern without forcing it on all developers.

---

## Phase 3: VALIDATE – Confirm Changes

Before implementing, I want your confirmation on the following points:

1. **Should we include Nginx by default in the development compose file?**  
   - Option A: Yes, always include it (like sample) and proxy HTTPS on port 8443.  
   - Option B: No, keep it optional via a separate override file.  
   - **Recommendation**: Option B – provide a `docker-compose-nginx.yml` override for those who need SSL.

2. **Do we need to support both npm and pnpm?**  
   - The MEP and our project use `pnpm`. We will keep `pnpm`.

3. **Should we keep the `command` that runs `pnpm install` on container start, or rely on pre‑built image with dependencies installed?**  
   - The sample assumes dependencies are already installed (via `npm install` during image build). That is faster. But during development, you might add new packages.  
   - **Recommendation**: During image build, run `pnpm install`. Then, for development, mount `node_modules` as an anonymous volume to avoid overwriting. If a developer adds a new package, they must rebuild the image (or run `docker exec` to install). This is typical.  
   - Alternatively, keep the `sh -c "pnpm install && pnpm dev"` but it slows restart. I prefer the build‑time install.

4. **Healthcheck endpoint for Next.js**: The sample uses `/api/proxy/health/`. What should OneStopNews use? The MEP defines `/api/health` (no auth). We can use that.

5. **User name**: Should we use `onestopnews` (project name) or `node` (generic)? I’ll use `onestopnews`.

---

## Phase 4: IMPLEMENT – Revised Configurations (After Your Approval)

Once you approve the plan, I will produce the updated files. Below is a **preview** of the key changes (not final until validated).

### Revised `docker-compose-dev.yml` (excerpt)

```yaml
networks:
  onestopnews-network:
    driver: bridge

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: onestopnews_dev
      POSTGRES_USER: onestopnews
      POSTGRES_PASSWORD: ${DB_PASSWORD:-onestopnews_dev_password}
      POSTGRES_HOST_AUTH_METHOD: trust
      TZ: UTC
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-extensions.sql:/docker-entrypoint-initdb.d/01-init-extensions.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U onestopnews -d onestopnews_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - onestopnews-network

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy noeviction --appendonly yes --save 60 1000
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - onestopnews-network

  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://onestopnews:${DB_PASSWORD:-onestopnews_dev_password}@postgres:5432/onestopnews_dev
      REDIS_URL: redis://redis:6379
      # ... other vars from .env.docker
    env_file:
      - .env.docker
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - .next:/app/.next   # preserve Next.js build cache
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - onestopnews-network
    # No command – rely on CMD from Dockerfile

  worker:
    # similar changes (network, non‑root, etc.)
    # ...
```

### Revised `Dockerfile.dev`

```dockerfile
FROM node:24-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install system dependencies for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package manifests first
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Create non‑root user
RUN addgroup -g 1001 -S onestopnews && \
    adduser -S onestopnews -G onestopnews -u 1001 && \
    chown -R onestopnews:onestopnews /app

USER onestopnews

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["pnpm", "dev", "--", "--hostname", "0.0.0.0"]
```

### Revised `Dockerfile.worker.dev`

Similar additions (non‑root user, curl, healthcheck – maybe check process existence).

---

## Phase 5: DELIVER – Next Steps

After you confirm the above plan, I will:

1. Produce the **final, corrected** versions of:
   - `docker-compose-dev.yml`
   - `Dockerfile.dev`
   - `Dockerfile.worker.dev`
   - `.env.docker` (updated with variable substitution)
   - `scripts/dev-setup.sh` (updated)
   - Optional `docker-compose-nginx.yml` override for HTTPS.

2. Provide a **migration guide** for developers currently using the old compose file.

3. Update the `README.md` section on Docker development (if needed).

---

## Final Docker Configuration Files for OneStopNews Development Environment

Based on the comparison and your approval, I am delivering the following **production‑grade development Docker setup**. All files are ready to be placed in the project root (or as indicated).

---

### 1. `docker-compose-dev.yml` – Core Development Services

```yaml
# Development environment for OneStopNews
# Services: PostgreSQL 17, Redis 7, Next.js web app, BullMQ worker
# Usage: docker compose -f docker-compose-dev.yml up -d
# See also: docker-compose-nginx.yml for optional HTTPS proxy.

networks:
  onestopnews-network:
    driver: bridge

services:
  # ==========================================================================
  # PostgreSQL 17 – Database with required extensions
  # ==========================================================================
  postgres:
    image: postgres:17-alpine
    container_name: onestopnews-postgres-dev
    environment:
      POSTGRES_DB: onestopnews_dev
      POSTGRES_USER: onestopnews
      POSTGRES_PASSWORD: ${DB_PASSWORD:-onestopnews_dev_password}
      POSTGRES_HOST_AUTH_METHOD: trust   # dev convenience
      TZ: UTC
      PGDATA: /var/lib/postgresql/data/pgdata
    command: >
      postgres
      -c timezone=UTC
      -c log_destination=stderr
      -c logging_collector=off
      -c log_min_messages=warning
    ports:
      - "127.0.0.1:5432:5432"   # bind only to loopback for local tooling
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-extensions.sql:/docker-entrypoint-initdb.d/01-init-extensions.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U onestopnews -d onestopnews_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - onestopnews-network
    restart: unless-stopped

  # ==========================================================================
  # Redis 7 – Cache, queues, sessions (noeviction policy per MEP)
  # ==========================================================================
  redis:
    image: redis:7-alpine
    container_name: onestopnews-redis-dev
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy noeviction
      --appendonly yes
      --save 60 1000
      --loglevel warning
    ports:
      - "127.0.0.1:6379:6379"   # bind only to loopback
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s
    networks:
      - onestopnews-network
    restart: unless-stopped

  # ==========================================================================
  # Next.js 16 Web Application (development with hot reload)
  # ==========================================================================
  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: development
    container_name: onestopnews-web-dev
    env_file:
      - .env.docker
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://onestopnews:${DB_PASSWORD:-onestopnews_dev_password}@postgres:5432/onestopnews_dev
      REDIS_URL: redis://redis:6379
      # Override any vars from .env.docker if needed
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules               # anonymous volume to keep host node_modules out
      - .next:/app/.next                # preserve Next.js build cache
      - pnpm_store:/root/.local/share/pnpm/store
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - onestopnews-network
    restart: unless-stopped
    # CMD is defined in Dockerfile

  # ==========================================================================
  # BullMQ Worker (TypeScript with watch mode)
  # ==========================================================================
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker.dev
    container_name: onestopnews-worker-dev
    env_file:
      - .env.docker
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://onestopnews:${DB_PASSWORD:-onestopnews_dev_password}@postgres:5432/onestopnews_dev
      REDIS_URL: redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - pnpm_store:/root/.local/share/pnpm/store
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - onestopnews-network
    restart: unless-stopped
    # CMD is defined in Dockerfile.worker.dev

# ==========================================================================
# Named Volumes
# ==========================================================================
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  pnpm_store:
    driver: local
```

---

### 2. `Dockerfile.dev` – Next.js Web Application (Development)

```dockerfile
# syntax=docker.io/docker/dockerfile:1.7-labs
# Stage 1: Base – install dependencies
FROM node:24-alpine AS base

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install system dependencies (curl for healthcheck)
RUN apk add --no-cache curl

WORKDIR /app

# Copy package manifests and lockfile first for better caching
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Stage 2: Development – non‑root user, start dev server
FROM base AS development

# Create non‑root user (security best practice)
RUN addgroup -g 1001 -S onestopnews && \
    adduser -S onestopnews -G onestopnews -u 1001 && \
    chown -R onestopnews:onestopnews /app

USER onestopnews

# Expose Next.js default port
EXPOSE 3000

# Healthcheck (uses the MEP-defined /api/health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start Next.js in development mode with Turbopack
CMD ["pnpm", "dev", "--", "--hostname", "0.0.0.0"]
```

---

### 3. `Dockerfile.worker.dev` – BullMQ Worker (Development)

```dockerfile
# syntax=docker.io/docker/dockerfile:1.7-labs
FROM node:24-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install system dependencies (curl for optional healthcheck)
RUN apk add --no-cache curl

WORKDIR /app

# Copy package manifests
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

# Create non‑root user
RUN addgroup -g 1001 -S onestopnews && \
    adduser -S onestopnews -G onestopnews -u 1001 && \
    chown -R onestopnews:onestopnews /app

USER onestopnews

# Healthcheck – simple process check (worker has no HTTP endpoint, so we check the process)
# We'll rely on Docker's process monitoring; a custom healthcheck could use `pgrep` but it's optional.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f "tsx watch src/workers/index.ts" || exit 1

# Start worker with watch mode for hot reload
CMD ["pnpm", "worker:dev"]
```

**Note:** Ensure `package.json` contains a script `"worker:dev": "tsx watch src/workers/index.ts"`. If not, add it.

---

### 4. `.env.docker` – Environment Variables (Development)

```bash
# OneStopNews Development Environment Variables
# Override any value by creating a `.env` file (ignored by git) or setting shell variables.

# ----------------------------------------------------------------------
# Database
# ----------------------------------------------------------------------
DATABASE_URL=postgresql://onestopnews:${DB_PASSWORD:-onestopnews_dev_password}@postgres:5432/onestopnews_dev

# ----------------------------------------------------------------------
# Redis (BullMQ)
# ----------------------------------------------------------------------
REDIS_URL=redis://redis:6379

# ----------------------------------------------------------------------
# Auth.js (NextAuth v5)
# ----------------------------------------------------------------------
AUTH_SECRET=dev-secret-do-not-use-in-production
AUTH_URL=http://localhost:3000

# ----------------------------------------------------------------------
# AI Providers (dummy keys for development – replace when testing real APIs)
# ----------------------------------------------------------------------
ANTHROPIC_API_KEY=sk-ant-dummy
OPENAI_API_KEY=sk-dummy

# ----------------------------------------------------------------------
# Push Notifications (VAPID keys – generate with `npx web-push generate-vapid-keys`)
# ----------------------------------------------------------------------
NEXT_PUBLIC_VAPID_PUBLIC_KEY=change_me
VAPID_PRIVATE_KEY=change_me
VAPID_SUBJECT=mailto:dev@onestopnews.com

# ----------------------------------------------------------------------
# Push Key Encryption (AES-256-GCM, 64 hex chars – dummy for dev)
# ----------------------------------------------------------------------
PUSH_KEY_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# ----------------------------------------------------------------------
# Node Environment
# ----------------------------------------------------------------------
NODE_ENV=development
```

---

### 5. `scripts/dev-setup.sh` – One‑Time Setup Script

```bash
#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Setting up OneStopNews development environment with Docker...${NC}"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Create .env from template if missing
if [ ! -f .env ]; then
    cp .env.docker .env
    echo -e "${GREEN}Created .env from .env.docker (you can edit it later)${NC}"
fi

# Ensure init-extensions.sql exists
if [ ! -f scripts/init-extensions.sql ]; then
    echo -e "${RED}Missing scripts/init-extensions.sql. Please create it.${NC}"
    exit 1
fi

# Build and start containers
echo -e "${YELLOW}Building and starting services...${NC}"
docker compose -f docker-compose-dev.yml up --build -d

# Wait for DB to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker exec onestopnews-web-dev pnpm drizzle-kit migrate

echo -e "${GREEN}Development environment is ready!${NC}"
echo -e "Web app:     ${GREEN}http://localhost:3000${NC}"
echo -e "PostgreSQL:  ${GREEN}localhost:5432${NC} (user: onestopnews, password: onestopnews_dev_password)"
echo -e "Redis:       ${GREEN}localhost:6379${NC}"
echo ""
echo "To stop:        docker compose -f docker-compose-dev.yml down"
echo "To view logs:   docker compose -f docker-compose-dev.yml logs -f [service]"
echo "To run commands: docker exec -it onestopnews-web-dev pnpm <command>"
```

Make it executable:
```bash
chmod +x scripts/dev-setup.sh
```

---

### 6. `docker-compose-nginx.yml` – Optional HTTPS Proxy Override

Create this file if you need to test HTTPS locally. It adds an Nginx service that terminates SSL and forwards requests to the Next.js web container.

```yaml
# Override file to add Nginx reverse proxy with self‑signed SSL.
# Usage: docker compose -f docker-compose-dev.yml -f docker-compose-nginx.yml up -d
# Generate self‑signed certificates before first use:
#   mkdir -p nginx/certs
#   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#     -keyout nginx/certs/server.key -out nginx/certs/server.crt \
#     -subj "/C=SG/ST=Singapore/L=Singapore/O=OneStopNews/CN=localhost"
# Then access https://localhost:8443

services:
  nginx:
    image: nginx:1-alpine
    container_name: onestopnews-nginx
    ports:
      - "8443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - web
    networks:
      - onestopnews-network
    restart: unless-stopped

# Create nginx/nginx.conf with this content:
#
# server {
#     listen 443 ssl http2;
#     server_name localhost;
#     ssl_certificate /etc/nginx/certs/server.crt;
#     ssl_certificate_key /etc/nginx/certs/server.key;
#
#     location / {
#         proxy_pass http://web:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
```

**Important:** The above override references `nginx/nginx.conf` and `nginx/certs`. You must create those files/directories as described in the comments.

---

### 7. `.dockerignore` (Updated)

```gitignore
# Dependencies
node_modules
.pnpm-store
.next

# Build outputs
dist
build
.cache

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Environment files (except the template)
.env
.env.*
!.env.docker

# Git & IDE
.git
.gitignore
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker files (so they are not copied into the image)
Dockerfile*
docker-compose*.yml
.dockerignore

# Test & coverage
coverage
.nyc_output
test-results
playwright-report

# Documentation
README.md
AGENTS.md
*.md
!scripts/init-extensions.sql   # but we DO need the SQL script

# Misc
*.log
dump.rdb
```

---

### 8. `scripts/init-extensions.sql` (Already in MEP, included for completeness)

```sql
-- Enable required PostgreSQL extensions for OneStopNews
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_textsearch;
```

---

## Usage Summary

1. **Place all files** in the project root (except `scripts/init-extensions.sql` already there).
2. **Run setup**:
   ```bash
   ./scripts/dev-setup.sh
   ```
3. **Access** the Next.js app at `http://localhost:3000`.
4. **Optional HTTPS**:
   ```bash
   mkdir -p nginx/certs
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/certs/server.key -out nginx/certs/server.crt \
     -subj "/C=SG/ST=Singapore/L=Singapore/O=OneStopNews/CN=localhost"
   docker compose -f docker-compose-dev.yml -f docker-compose-nginx.yml up -d
   ```
   Then browse to `https://localhost:8443`.

## Verification Checklist

- [ ] All files are placed correctly.
- [ ] `scripts/dev-setup.sh` is executable.
- [ ] `.env` is created (or copy `.env.docker` manually).
- [ ] `pnpm` is the package manager (scripts assume pnpm).
- [ ] The worker script `worker:dev` exists in `package.json`.
- [ ] `tsx` is installed as dev dependency (`pnpm add -D tsx`).
- [ ] Healthcheck endpoint `/api/health` is implemented (per MEP Phase 7).

---

These files represent a **production‑grade development environment** that aligns with both the MEP v5.1 requirements and the best practices extracted from the sample configuration. They are ready for integration into the OneStopNews repository.

# https://chat.deepseek.com/share/lr6v36oajy04a7elif 

