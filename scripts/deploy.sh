#!/usr/bin/env sh
# Deploy order from ADR-0009: build → migrate on the new image while the old one still serves → swap.
# Any failed step stops the script and leaves the running version untouched.
set -eu
cd "$(dirname "$0")/.."
docker compose build app
docker compose run --rm app npx prisma migrate deploy
docker compose up -d
docker compose ps
