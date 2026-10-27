#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE="/home/ganbaru/hris-github"
PROD="/home/ganbaru/hris"
BACKUP="/home/ganbaru/hris-backup/deploy-$(date +%Y%m%d-%H%M%S)"
PROJECT="hris"

cd "$SOURCE"

echo "===== VALIDASI ====="
test -d "$SOURCE/.git"
test -f "$PROD/docker-compose.yml"
test -f "$PROD/config/backend.env"

mkdir -p "$BACKUP"

echo "===== BACKUP SOURCE ====="
rsync -a "$PROD/be/" "$BACKUP/be/" \
  --exclude='node_modules/' \
  --exclude='uploads/' \
  --exclude='.env*'

rsync -a "$PROD/fe/" "$BACKUP/fe/" \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.env*'

echo "===== BACKUP DOCKER IMAGES ====="
docker image inspect "${PROJECT}-hris-backend:latest" \
  --format '{{.Id}}' > "$BACKUP/backend-image-id" 2>/dev/null || true

docker image inspect "${PROJECT}-hris-frontend:latest" \
  --format '{{.Id}}' > "$BACKUP/frontend-image-id" 2>/dev/null || true

echo "===== SYNC SOURCE ====="
rsync -a "$SOURCE/be/" "$PROD/be/" \
  --exclude='.env*' \
  --exclude='node_modules/' \
  --exclude='uploads/' \
  --exclude='hris_karyawan_import.json' \
  --exclude='import_karyawan.js' \
  --exclude='test-storage.js'

rsync -a "$SOURCE/fe/" "$PROD/fe/" \
  --exclude='.env*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='android/'

restore_source() {
  echo "===== RESTORE SOURCE ====="
  rsync -a "$BACKUP/be/" "$PROD/be/"
  rsync -a "$BACKUP/fe/" "$PROD/fe/"
}

cd "$PROD"

echo "===== BUILD ====="
if ! docker compose -p "$PROJECT" build hris-backend hris-frontend; then
  restore_source
  echo "DEPLOY GAGAL: Build error"
  exit 1
fi

echo "===== DEPLOY ====="
if ! docker compose -p "$PROJECT" up -d --no-deps hris-backend hris-frontend; then
  restore_source

  echo "===== ROLLBACK IMAGES ====="
  if [[ -s "$BACKUP/backend-image-id" ]]; then
    docker tag "$(cat "$BACKUP/backend-image-id")" "${PROJECT}-hris-backend:latest"
  fi

  if [[ -s "$BACKUP/frontend-image-id" ]]; then
    docker tag "$(cat "$BACKUP/frontend-image-id")" "${PROJECT}-hris-frontend:latest"
  fi

  docker compose -p "$PROJECT" up -d --no-deps hris-backend hris-frontend || true

  echo "DEPLOY GAGAL: Periksa kondisi container."
  exit 1
fi

echo "===== DEPLOY SELESAI ====="
docker compose -p "$PROJECT" ps
