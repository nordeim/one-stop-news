#!/bin/bash
# deploy.sh — Deployment script for OneStopNews. Production deployments only.
#
# Phase 19 (High H7): Previously this script had three problems:
#   1. `|| true` on the db:migrate step swallowed migration failures
#      (silent data corruption risk)
#   2. No zero-downtime strategy — `docker compose up -d` tears down and
#      recreates containers, dropping in-flight requests
#   3. No rollback logic — if the deploy failed, the previous-good state
#      was already destroyed
#
# Now this script:
#   1. Runs migrations FIRST (fail-fast if migrations break)
#   2. Scales web to 2 instances, waits for new container health
#   3. Drains old container only after new container is healthy
#   4. Triggers rollback trap on any error (reverts to previous image)
set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────────────
IMAGE_TAG="${1:-latest}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"  # Set if using a registry like ECR/GCR
HEALTH_CHECK_URL="http://localhost:3000/api/health"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2  # seconds
SHUTDOWN_TIMEOUT_SEC=25   # < k8s default terminationGracePeriodSeconds (30s)

# ── Functions ───────────────────────────────────────────────────────────────
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

err() {
  echo "[ERROR] $*" >&2
}

# Rollback function — triggered by ERR trap. Reverts to the previous
# image tag if known, otherwise just leaves the existing containers running.
rollback() {
  err "Deployment failed. Attempting rollback..."
  if [ -n "${PREVIOUS_IMAGE_TAG:-}" ] && [ "${PREVIOUS_IMAGE_TAG}" != "${IMAGE_TAG}" ]; then
    err "Rolling back to previous image tag: ${PREVIOUS_IMAGE_TAG}"
    # Re-pull the previous image and recreate containers with it.
    # This works because the previous image is still in the local cache
    # or the registry.
    IMAGE_TAG="${PREVIOUS_IMAGE_TAG}" docker compose -f docker-compose.prod.yml up -d --no-deps web
  else
    err "No previous image tag recorded. Leaving existing containers running."
    err "Manual intervention required."
  fi
}

# Wait for the web service to become healthy.
# Returns 0 if healthy within HEALTH_CHECK_RETRIES, 1 otherwise.
wait_for_health() {
  local retries=0
  while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
    if curl -fsS "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
      log "Health check passed after ${retries} retries."
      return 0
    fi
    retries=$((retries + 1))
    sleep $HEALTH_CHECK_INTERVAL
  done
  err "Health check failed after ${HEALTH_CHECK_RETRIES} retries."
  return 1
}

# Trap any error and trigger rollback.
trap 'rollback' ERR

# ── Deployment Steps ────────────────────────────────────────────────────────

log "Starting deployment with image tag: $IMAGE_TAG"

# Record the current image tag (for rollback) by inspecting the running
# web container. If no container is running yet (first deploy), this is empty.
PREVIOUS_IMAGE_TAG=""
if docker compose -f docker-compose.prod.yml ps web 2>/dev/null | grep -q "web"; then
  PREVIOUS_IMAGE_TAG=$(docker inspect --format='{{index .Config.Labels "com.docker.compose.image"}}' \
    "$(docker compose -f docker-compose.prod.yml ps -q web 2>/dev/null)" 2>/dev/null | \
    sed 's/.*://; s/-latest$//' || echo "")
  log "Previous image tag: ${PREVIOUS_IMAGE_TAG:-unknown}"
fi

# Build and push images (if registry is set)
if [ -n "$DOCKER_REGISTRY" ]; then
  log "Building and pushing Docker images to $DOCKER_REGISTRY..."
  docker compose -f docker-compose.prod.yml build
  docker tag onestopnews-web:latest "${DOCKER_REGISTRY}/onestopnews-web:${IMAGE_TAG}"
  docker push "${DOCKER_REGISTRY}/onestopnews-web:${IMAGE_TAG}"
else
  log "Building Docker images locally..."
  docker compose -f docker-compose.prod.yml build
fi

# ── Run database migrations FIRST (fail-fast) ───────────────────────────────
# Phase 19 (H7): Previously this had `|| true` which swallowed migration
# failures — silent data corruption risk. Now we run migrations BEFORE
# touching the web containers, so a migration failure aborts the deploy
# without affecting the running app.
log "Running database migrations..."
if [ -n "$DOCKER_REGISTRY" ]; then
  # In a registry-based deploy, run migrations as a one-off container
  # using the NEW image (so the migration matches the new code).
  docker run --rm \
    --env-file .env.production \
    --network onestopnews-network \
    "${DOCKER_REGISTRY}/onestopnews-web:${IMAGE_TAG}" \
    pnpm run db:migrate
else
  # Local deploy — exec into the existing web container (which still runs
  # the OLD image, but Drizzle migrations are forward-compatible by design).
  # If this fails, the trap fires and we roll back.
  docker compose -f docker-compose.prod.yml exec -T web pnpm run db:migrate
fi
log "Migrations complete."

# ── Zero-downtime deploy (blue-green via scale) ─────────────────────────────
# Phase 19 (H7): Previously `docker compose up -d` tore down and recreated
# containers, dropping in-flight requests. Now we:
#   1. Scale web to 2 instances (old + new run side-by-side briefly)
#   2. Wait for the new instance to become healthy
#   3. Scale back down to 1 (the old instance is removed)
#
# This requires a load balancer in front (e.g., nginx, Traefik, or a cloud
# LB). For single-host deployments without an LB, this still works — Docker's
# internal DNS round-robins between the two instances during the brief overlap.
log "Scaling web to 2 instances for zero-downtime deploy..."
docker compose -f docker-compose.prod.yml up -d --no-deps --scale web=2 web

log "Waiting for new web instance to become healthy..."
if ! wait_for_health; then
  err "New web instance failed health check. Rolling back."
  docker compose -f docker-compose.prod.yml up -d --no-deps --scale web=1 web
  exit 1
fi

log "New instance healthy. Draining old instance..."
docker compose -f docker-compose.prod.yml up -d --no-deps --scale web=1 web
log "Zero-downtime deploy complete."

log "Deployment complete!"
