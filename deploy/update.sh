#!/usr/bin/env bash
# Обновление уже развёрнутого портала: код → сборка → перезапуск.
# Запускать от root: bash /opt/vibecast/deploy/update.sh
set -euo pipefail

APP_DIR=/opt/vibecast
APP_USER=vibecast

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

cd "$APP_DIR"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

log "Забираем свежий код"
git fetch --depth 1 origin main
git reset --hard origin/main

log "Каталог загрузок"
UPLOAD_DIR="$APP_DIR/data/uploads"
mkdir -p "$UPLOAD_DIR"

# Демо-обложки — только если каталог пуст (не затираем реальные загрузки).
if [ -d "$APP_DIR/assets/demo" ] && [ -z "$(ls -A "$UPLOAD_DIR" 2>/dev/null)" ]; then
  cp "$APP_DIR/assets/demo/"* "$UPLOAD_DIR/" 2>/dev/null || true
fi

# Переносим то, что успели загрузить в старое место.
if [ -d "$APP_DIR/public/uploads" ]; then
  cp -n "$APP_DIR/public/uploads/"* "$UPLOAD_DIR/" 2>/dev/null || true
fi
echo "файлов в загрузках: $(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l)"

# .env мог остаться с прежним путём.
if grep -q 'public/uploads' "$APP_DIR/.env" 2>/dev/null; then
  sed -i 's#public/uploads#data/uploads#' "$APP_DIR/.env"
  echo "путь загрузок в .env обновлён"
fi

log "Сборка"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npx prisma generate
npx prisma migrate deploy
npm run build

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Перезапуск"
systemctl restart vibecast
sleep 4

log "Проверка"
systemctl is-active vibecast
curl -s -o /dev/null -w "главная: %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "обложка: %{http_code}\n" http://127.0.0.1:3000/uploads/cover-bratuha.png

log "Готово"
