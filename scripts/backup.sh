#!/usr/bin/env sh
# Daily database backup: pg_dump → backups/kontrol-<date>.sql.gz, keeps the last KEEP_DAYS days.
# If BACKUP_BUCKET is set in .env (e.g. gs://my-bucket/kontrol), the file is also copied off the VM —
# a backup on the same disk does not survive the loss of that disk.
set -eu
cd "$(dirname "$0")/.."
KEEP_DAYS="${KEEP_DAYS:-14}"
BUCKET="$(grep -E '^BACKUP_BUCKET=' .env 2>/dev/null | cut -d= -f2- || true)"
mkdir -p backups
chmod 700 backups
file="backups/kontrol-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose exec -T db pg_dump -U kontrol --clean --if-exists kontrol | gzip > "$file.part"
# an empty or truncated dump must never rotate good copies away
gzip -t "$file.part"
gzip -dc "$file.part" | head -c 100000 | grep -q 'PostgreSQL database dump'
mv "$file.part" "$file"
find backups -name 'kontrol-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
if [ -n "$BUCKET" ]; then
  gsutil -q cp "$file" "$BUCKET/"
fi
echo "backup ok: $file"
