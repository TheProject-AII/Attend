#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE="/home/ganbaru/hris-github"
PROD="/home/ganbaru/hris"
BACKUP="/home/ganbaru/hris-backup/deploy-$(date +%Y%m%d-%H%M%S)"

cd "$SOURCE"

echo "===== BACKUP SOURCE ====="
mkdir -p "$BACKUP"
rsync -a "$PROD/be/" "$BACKUP/be/" \
  --exclude=node_modules --exclude=uploads --exclude='.env*'
rsync -a "$PROD/fe/" "$BACKUP/fe/" \
  --exclude=node_modules --exclude=dist --exclude='.env*'

echo "===== SYNC BACKEND ====="
rsync -a "$SOURCE/be/" "$PROD/be/" \
  --exclude='.env*' \
  --exclude=node_modules \
  --exclude=uploads \
  --exclude=hris_karyawan_import.json \
  --exclude=import_karyawan.js \
  --exclude=test-storage.js

echo "===== SYNC FRONTEND ====="
rsync -a "$SOURCE/fe/" "$PROD/fe/" \
  --exclude='.env*' \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=android

echo "===== BUILD DOCKER IMAGES ====="
cd "$PROD"

if ! docker compose build hris-backend hris-frontend; then
  echo "ERROR: Build gagal. Mengembalikan source sebelumnya."
  rsync -a "$BACKUP/be/" "$PROD/be/"
  rsync -a "$BACKUP/fe/" "$PROD/fe/"
  exit 1
fi

echo "===== UPDATE CONTAINERS ====="
if ! docker compose up -d --no-deps hris-backend hris-frontend; then
  echo "ERROR: Update container gagal. Memulihkan source."
  rsync -a "$BACKUP/be/" "$PROD/be/"
  rsync -a "$BACKUP/fe/" "$PROD/fe/"
  echo "PERHATIAN: Container perlu diperiksa. Rollback image belum otomatis."
  exit 1
fi

echo "===== DEPLOYMENT SELESAI ====="
docker compose ps
