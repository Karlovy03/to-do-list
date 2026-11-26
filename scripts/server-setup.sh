#!/usr/bin/env sh
# One-time setup of a fresh Ubuntu server (e.g. Google Cloud e2-micro, 1 GB RAM).
# Run once with sudo from the repository folder: sudo ./scripts/server-setup.sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo ./scripts/server-setup.sh" >&2
  exit 1
fi

# 2 GB swap: building the image needs more memory than the 1 GB the free VM has
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Docker Engine + Compose plugin from Docker's official install script
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

# let the user who called sudo run docker without sudo (takes effect after re-login)
if [ -n "${SUDO_USER:-}" ] && getent group docker >/dev/null; then
  usermod -aG docker "$SUDO_USER"
fi

timedatectl set-timezone Europe/Kyiv 2>/dev/null || true

echo "Done. Close this SSH window and open it again, then continue with README (step .env)."
