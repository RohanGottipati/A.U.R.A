#!/usr/bin/env bash
# deploy-app.sh - Steps 6 + 7 of the Vultr deployment plan.
#
# Run this ON THE SERVER as the `deploy` user, from inside /home/deploy/aura.
# It:
#   1. Validates .env.local exists
#   2. Runs the SQL migrations against Vultr Managed Postgres
#   3. npm ci + npm run build
#   4. (Re)starts the app under PM2
#   5. Persists PM2 process list
#
# First run also needs you to run the printed `pm2 startup` command as root
# (see the very last step in this script's output) so the app survives reboots.
#
# Usage (on the server, as deploy):
#     cd /home/deploy/aura && bash deploy/scripts/deploy-app.sh

set -euo pipefail

APP_NAME="${APP_NAME:-aura}"
APP_DIR="${APP_DIR:-$(pwd)}"

cd "${APP_DIR}"

if [[ ! -f .env.local ]]; then
  echo "ERROR: ${APP_DIR}/.env.local is missing." >&2
  echo "Copy deploy/.env.production.example to .env.local and fill in real values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

: "${DATABASE_URL:?DATABASE_URL is empty in .env.local}"
: "${APP_BASE_URL:?APP_BASE_URL is empty in .env.local}"

echo "==> Running database migrations against Vultr Managed Postgres"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f migrations/002_floorplan_ai_schema.sql
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f migrations/003_add_image_hash.sql

echo "==> Installing dependencies (npm ci --include=dev)"
# --include=dev forces devDependencies (tailwind, postcss, typescript) to be
# installed even if NODE_ENV=production leaked into the shell. They're needed
# at build time; PM2 will run the built output with NODE_ENV=production.
npm ci --include=dev

# On a 1 GB VPS next build will OOM unless the heap is capped and swap is on
# (bootstrap-server.sh creates a 2 GB swapfile). 1024 MB heap + swap fits.
echo "==> Building Next.js app (NODE_OPTIONS=--max-old-space-size=1024)"
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo "==> (Re)starting under PM2 using ecosystem.config.cjs"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo
echo "==> PM2 status"
pm2 status

echo
echo "Deploy complete. The app should be listening on 127.0.0.1:3000."
echo
echo "If this is the FIRST deploy, run this once as root to make PM2 survive reboots:"
echo
PM2_HOME_HINT="$(pm2 startup systemd -u "$(whoami)" --hp "${HOME}" 2>&1 | grep -E '^sudo ' | tail -n 1 || true)"
if [[ -n "${PM2_HOME_HINT}" ]]; then
  echo "    ${PM2_HOME_HINT}"
else
  echo "    sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp ${HOME}"
fi
echo
echo "Then verify locally:  curl -i http://127.0.0.1:3000/api/health"
