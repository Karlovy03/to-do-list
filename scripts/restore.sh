#!/usr/bin/env sh
# Restores the database from a backup made by scripts/backup.sh, then the files of «Шаблони» from backups/files/.
# The app is stopped while the database is replaced.
# Usage: ./scripts/restore.sh backups/kontrol-2026-11-26_0317.sql.gz
set -eu
cd "$(dirname "$0")/.."
file="${1:?usage: ./scripts/restore.sh <backup.sql.gz>}"
gzip -t "$file"
printf 'All current data will be replaced by %s. Type YES to continue: ' "$file"
read -r answer
[ "$answer" = "YES" ] || { echo "cancelled"; exit 1; }
docker compose stop app
gzip -dc "$file" | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U kontrol kontrol
docker compose start app
# files go in through the app container, so they belong to its user (node), as uploads do
if [ -d backups/files ] && [ -n "$(ls -A backups/files)" ]; then
  tar -C backups/files -cf - . | docker compose exec -T app tar -C /app/files -xf -
  echo "template files restored: $(ls -1 backups/files | wc -l)"
fi
echo "restored from $file"
