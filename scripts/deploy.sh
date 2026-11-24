
#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE=/home/ganbaru/hris-github
PROD=/home/ganbaru/hris
PROJECT=hris
BACKUP="/home/ganbaru/hris-backup/deploy-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP"
cd "$PROD"

APP_BUILD_NUMBER="${APP_BUILD_NUMBER:-1}"

echo "===== SAVE CURRENT IMAGES ====="
for service in hris-backend hris-frontend hris-face; do
  id=$(docker compose -p "$PROJECT" ps -q "$service")
  test -n "$id" || { echo "Container missing: $service"; exit 1; }
  docker inspect "$id" --format '{{.Image}}' > "$BACKUP/$service-image"
done

echo "===== BACKUP SOURCE AND CONFIG ====="
rsync -a be/ "$BACKUP/be/" --exclude=node_modules --exclude=uploads --exclude='.env*'
rsync -a fe/ "$BACKUP/fe/" --exclude=node_modules --exclude=dist --exclude='.env*'
rsync -a face-service/ "$BACKUP/face-service/" \
  --exclude='.venv' --exclude='__pycache__' --exclude='.env*'

cp "$PROD/config/backend.env" "$BACKUP/backend.env"

restore_source() {
  rsync -a --delete "$BACKUP/be/" "$PROD/be/" \
    --exclude=node_modules --exclude=uploads --exclude='.env*'

  rsync -a --delete "$BACKUP/fe/" "$PROD/fe/" \
    --exclude=node_modules --exclude=dist --exclude='.env*'

  rsync -a --delete "$BACKUP/face-service/" "$PROD/face-service/" \
    --exclude='.venv' --exclude='__pycache__' --exclude='.env*'

  cp "$BACKUP/backend.env" "$PROD/config/backend.env"
}

rollback() {
  echo "===== ROLLBACK ====="
  restore_source

  for service in hris-backend hris-frontend hris-face; do
    docker tag "$(cat "$BACKUP/$service-image")" \
      "${PROJECT}-${service}:latest"
  done

  docker compose -p "$PROJECT" up -d --no-deps --force-recreate \
    hris-backend hris-frontend hris-face || true

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

rsync -a "$SOURCE/face-service/" "$PROD/face-service/" \
  --exclude='.env*' --exclude='.venv' \
  --exclude='__pycache__' --exclude='.deepface'


echo "===== SYNC ANDROID VERSION ====="

ANDROID_VERSION_FILE="$SOURCE/android/version.properties"
BACKEND_ENV="$PROD/config/backend.env"

if [[ ! -f "$ANDROID_VERSION_FILE" ]]; then
  echo "ERROR: Android version.properties not found"
  rollback
  exit 1
fi

ANDROID_VERSION=$(sed -n 's/^VERSION_NAME=//p' "$ANDROID_VERSION_FILE" | tail -n 1)
ANDROID_VERSION_CODE=$(sed -n 's/^VERSION_CODE=//p' "$ANDROID_VERSION_FILE" | tail -n 1)

if [[ -z "$ANDROID_VERSION" || ! "$ANDROID_VERSION_CODE" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Invalid Android version properties"
  rollback
  exit 1
fi

set_env_value() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$BACKEND_ENV"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$BACKEND_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >> "$BACKEND_ENV"
  fi
}

set_env_value "ANDROID_VERSION" "$ANDROID_VERSION"
set_env_value "ANDROID_VERSION_CODE" "$ANDROID_VERSION_CODE"

echo "Android Version: $ANDROID_VERSION"
echo "Android Version Code: $ANDROID_VERSION_CODE"

echo "===== BUILD ====="

APP_VERSION_PWA=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' \
  "$PROD/fe/package.json" | head -n 1)

if [[ -z "$APP_VERSION_PWA" ]]; then
  echo "ERROR: PWA version not found"
  rollback
  exit 1
fi

echo "PWA Version: $APP_VERSION_PWA"
echo "PWA Build: $APP_BUILD_NUMBER"

if ! docker compose -p "$PROJECT" build hris-backend hris-face; then
  rollback
  exit 1
fi

if ! docker compose -p "$PROJECT" build \
  --build-arg "VITE_APP_VERSION=$APP_VERSION_PWA" \
  --build-arg "VITE_APP_BUILD=$APP_BUILD_NUMBER" \
  hris-frontend; then
  rollback
  exit 1
fi

echo "===== DEPLOY ====="

if ! docker compose -p "$PROJECT" up -d --no-deps \
  hris-backend hris-frontend hris-face; then
  rollback
  exit 1
fi

echo "===== HEALTH CHECK ====="

healthy=false

for i in $(seq 1 40); do
  if docker compose -p "$PROJECT" exec -T hris-backend \
    node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    && docker compose -p "$PROJECT" exec -T hris-face \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/openapi.json', timeout=5)" \
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

echo "===== VERIFY ANDROID VERSION ====="

ANDROID_RESULT=$(curl -fsS https://hris.so-mak.com/api/app-version/android)
echo "$ANDROID_RESULT"

echo "===== DEPLOY SUCCESS ====="
docker compose -p "$PROJECT" ps
