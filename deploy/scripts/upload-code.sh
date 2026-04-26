#!/usr/bin/env bash
# upload-code.sh - Step 4 of the Vultr deployment plan.
#
# Run this from your LAPTOP (not the server). It rsyncs the project to the VPS
# while excluding node_modules, .next, and .git so transfers stay small.
#
# Usage:
#     VPS_IP=203.0.113.10 ./deploy/scripts/upload-code.sh
#
# Optional:
#     DEPLOY_USER=deploy   APP_DIR=/home/deploy/aura

set -euo pipefail

: "${VPS_IP:?Set VPS_IP=<your vultr public ip> before running}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/home/${DEPLOY_USER}/aura}"

echo "==> Ensuring ${APP_DIR} exists on ${VPS_IP}"
ssh "${DEPLOY_USER}@${VPS_IP}" "mkdir -p '${APP_DIR}'"

echo "==> Rsyncing project to ${DEPLOY_USER}@${VPS_IP}:${APP_DIR}"
rsync -az --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='.next-*/' \
  --exclude='.env.local' \
  --exclude='.env*.local' \
  --exclude='*.tsbuildinfo' \
  --exclude='legacy/' \
  ./ "${DEPLOY_USER}@${VPS_IP}:${APP_DIR}/"

echo
echo "Upload complete. Next:"
echo "  1) scp your production env file to ${APP_DIR}/.env.local"
echo "     scp deploy/.env.production.example ${DEPLOY_USER}@${VPS_IP}:${APP_DIR}/.env.local"
echo "     (then edit it on the server)"
echo "  2) ssh ${DEPLOY_USER}@${VPS_IP} 'cd ${APP_DIR} && bash deploy/scripts/deploy-app.sh'"
