#!/usr/bin/env bash
# bootstrap-server.sh - Step 3 of the Vultr deployment plan.
#
# Run this ONCE, as root, on a fresh Ubuntu 24.04 LTS Vultr Cloud Compute VPS.
# It creates a `deploy` user, locks down SSH/UFW, and installs Node 20, PM2,
# Nginx, git, and the psql client used to apply migrations.
#
# Usage (from your laptop):
#     scp deploy/scripts/bootstrap-server.sh root@<VPS_IP>:/root/
#     ssh root@<VPS_IP> 'bash /root/bootstrap-server.sh'

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "bootstrap-server.sh must be run as root" >&2
  exit 1
fi

echo "==> Creating ${DEPLOY_USER} user (if missing)"
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
usermod -aG sudo "${DEPLOY_USER}"

echo "==> Mirroring root's authorized_keys to ${DEPLOY_USER}"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
if [[ -f /root/.ssh/authorized_keys ]]; then
  install -m 600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
    /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

echo "==> Allowing passwordless sudo for ${DEPLOY_USER} (needed for pm2 startup + nginx reloads)"
echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-${DEPLOY_USER}"
chmod 440 "/etc/sudoers.d/90-${DEPLOY_USER}"

echo "==> Configuring UFW (SSH + HTTP)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable

echo "==> Ensuring swap exists (required on the 1 GB plan to survive next build)"
SWAPFILE="/swapfile"
SWAP_SIZE_MB="${SWAP_SIZE_MB:-2048}"
if swapon --show=NAME --noheadings | grep -q .; then
  echo "    swap already enabled, skipping"
else
  fallocate -l "${SWAP_SIZE_MB}M" "${SWAPFILE}" || \
    dd if=/dev/zero of="${SWAPFILE}" bs=1M count="${SWAP_SIZE_MB}" status=progress
  chmod 600 "${SWAPFILE}"
  mkswap "${SWAPFILE}"
  swapon "${SWAPFILE}"
  if ! grep -q "^${SWAPFILE} " /etc/fstab; then
    echo "${SWAPFILE} none swap sw 0 0" >> /etc/fstab
  fi
  # Reduce swappiness so swap is only used under real memory pressure (build).
  sysctl -w vm.swappiness=10 >/dev/null
  if ! grep -q "^vm.swappiness" /etc/sysctl.conf; then
    echo "vm.swappiness=10" >> /etc/sysctl.conf
  fi
fi
free -h

echo "==> apt update + upgrade"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

echo "==> Installing Node 20.x from NodeSource"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v20"; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Installing nginx, git, build tools, postgresql client"
apt-get install -y nginx git build-essential postgresql-client-16

echo "==> Installing PM2 globally"
npm install -g pm2

echo "==> Versions"
node -v
npm -v
pm2 -v
nginx -v
psql --version

echo
echo "Bootstrap complete."
echo "Next: copy the project to /home/${DEPLOY_USER}/aura and run deploy/scripts/deploy-app.sh"
