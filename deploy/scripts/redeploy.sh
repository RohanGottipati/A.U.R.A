#!/usr/bin/env bash
# redeploy.sh - Step 10 of the Vultr deployment plan.
#
# Run this ON THE SERVER as the `deploy` user after pulling new code (or after
# upload-code.sh from your laptop). It does npm ci, build, and pm2 reload with
# zero-downtime.
#
# Usage:
#     cd /home/deploy/aura && bash deploy/scripts/redeploy.sh

set -euo pipefail

APP_NAME="${APP_NAME:-aura}"
APP_DIR="${APP_DIR:-$(pwd)}"

cd "${APP_DIR}"

if [[ ! -f .env.local ]]; then
  echo "ERROR: ${APP_DIR}/.env.local missing." >&2
  exit 1
fi

echo "==> npm ci --include=dev"
npm ci --include=dev

echo "==> npm run build (NODE_OPTIONS=--max-old-space-size=1024 for 1 GB VPS)"
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo "==> pm2 reload ${APP_NAME}"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
pm2 status
