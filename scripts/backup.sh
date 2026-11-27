#!/usr/bin/env sh
# Daily backup: pg_dump → backups/kontrol-<date>.sql.gz (keeps the last KEEP_DAYS days)
# and the files of «Шаблони» → backups/files/ (ADR-0023).
# If BACKUP_BUCKET is set in .env (e.g. gs://my-bucket/kontrol), both are also copied off the VM —
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

# Template files never change once stored (a replaced file gets a new key), so only new ones are copied.
# Files of deleted templates stay in the mirror: an older database dump may still point to them.
mkdir -p backups/files
docker compose exec -T app sh -c 'ls -1 /app/files | grep -E "^[a-f0-9]{32}$" || true' | sort > backups/files.list
ls -1 backups/files | sort > backups/files.have
comm -23 backups/files.list backups/files.have > backups/files.new
if [ -s backups/files.new ]; then
  docker compose exec -T app tar -C /app/files -cf - -T - < backups/files.new | tar -C backups/files -xf -
fi
echo "template files: $(wc -l < backups/files.new) new, $(ls -1 backups/files | wc -l) in the mirror"
rm -f backups/files.list backups/files.have backups/files.new

if [ -n "$BUCKET" ]; then
  gsutil -q cp "$file" "$BUCKET/"
  gsutil -q -m rsync -r backups/files "$BUCKET/files"
fi
echo "backup ok: $file"
