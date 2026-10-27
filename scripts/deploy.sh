#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE=/home/ganbaru/hris-github
PROD=/home/ganbaru/hris
PROJECT=hris
BACKUP="/home/ganbaru/hris-backup/deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

cd "$PROD"

echo "===== SAVE CURRENT IMAGES ====="
docker image inspect hris_hris-backend:latest --format '{{.Id}}' > "$BACKUP/backend-image"
docker image inspect hris_hris-frontend:latest --format '{{.Id}}' > "$BACKUP/frontend-image"

echo "===== BACKUP SOURCE ====="
rsync -a be/ "$BACKUP/be/" --exclude=node_modules --exclude=uploads --exclude='.env*'
rsync -a fe/ "$BACKUP/fe/" --exclude=node_modules --exclude=dist --exclude='.env*'

restore_source() {
  rsync -a "$BACKUP/be/" "$PROD/be/"
  rsync -a "$BACKUP/fe/" "$PROD/fe/"
}

rollback() {
  echo "===== ROLLBACK ====="
  restore_source
  docker tag "$(cat "$BACKUP/backend-image")" hris_hris-backend:latest
  docker tag "$(cat "$BACKUP/frontend-image")" hris_hris-frontend:latest
  docker compose -p "$PROJECT" up -d --no-deps --force-recreate hris-backend hris-frontend || true
  echo "Rollback attempted. Verify application health."
}

echo "===== SYNC SOURCE ====="
rsync -a "$SOURCE/be/" "$PROD/be/" \
  --exclude='.env*' --exclude=node_modules --exclude=uploads \
  --exclude=hris_karyawan_import.json \
  --exclude=import_karyawan.js --exclude=test-storage.js

rsync -a "$SOURCE/fe/" "$PROD/fe/" \
  --exclude='.env*' --exclude=node_modules --exclude=dist \
  --exclude=android

echo "===== BUILD ====="
if ! docker compose -p "$PROJECT" build hris-backend hris-frontend; then
  restore_source
  exit 1
fi

echo "===== DEPLOY ====="
if ! docker compose -p "$PROJECT" up -d --no-deps hris-backend hris-frontend; then
  rollback
  exit 1
fi

echo "===== HEALTH CHECK ====="
healthy=false
for i in $(seq 1 20); do
  if docker compose -p "$PROJECT" exec -T hris-backend \
    node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    && curl -fsS -o /dev/null https://hris.so-mak.com/; then
    healthy=true
    break
  fi
  sleep 3
done

if [[ "$healthy" != true ]]; then
  rollback
  exit 1
fi

echo "===== DEPLOY SUCCESS ====="
docker compose -p "$PROJECT" ps
