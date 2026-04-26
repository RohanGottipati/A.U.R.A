#!/usr/bin/env bash
# install-nginx.sh - Step 8 of the Vultr deployment plan.
#
# Run this ON THE SERVER as the `deploy` user (uses sudo). It installs
# deploy/nginx/aura.conf into /etc/nginx/sites-available/aura, enables it,
# disables the default site, validates, and reloads nginx.
#
# Usage (on the server):
#     cd /home/deploy/aura && bash deploy/scripts/install-nginx.sh

set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)/nginx/aura.conf"
DST_AVAIL="/etc/nginx/sites-available/aura"
DST_ENABLED="/etc/nginx/sites-enabled/aura"

if [[ ! -f "${SRC}" ]]; then
  echo "ERROR: ${SRC} not found" >&2
  exit 1
fi

echo "==> Installing ${SRC} -> ${DST_AVAIL}"
sudo install -m 644 "${SRC}" "${DST_AVAIL}"

echo "==> Enabling site"
sudo ln -sf "${DST_AVAIL}" "${DST_ENABLED}"

echo "==> Removing default site"
sudo rm -f /etc/nginx/sites-enabled/default

echo "==> nginx -t"
sudo nginx -t

echo "==> Reloading nginx"
sudo systemctl reload nginx

echo
echo "Nginx is now reverse-proxying :80 -> 127.0.0.1:3000"
echo "Smoke test from your laptop:  curl -i http://<VPS_IP>/api/health"
