#!/usr/bin/env bash
# Поднять сайт и показать его текущий адрес. Одна команда вместо переписки.
#
# Временный туннель Cloudflare выдаёт НОВОЕ имя при каждом запуске, поэтому
# адрес из старых строк журнала бесполезен — скрипт перезапускает службу
# и печатает тот адрес, который действительно работает сейчас.
set -uo pipefail

APP_DIR=/opt/vibecast
LOG=/var/log/cloudflared.log

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

log "Приложение"
systemctl is-active vibecast nginx | tr '\n' ' '; echo
curl -s -o /dev/null -w "локально nginx: %{http_code}\n" --max-time 10 http://127.0.0.1/
curl -s -o /dev/null -w "локально приложение: %{http_code}\n" --max-time 10 http://127.0.0.1:3000/

# Если приложение лежит — туннель показывать нечего, сначала поднимаем его.
if [ "$(systemctl is-active vibecast)" != "active" ]; then
  log "Поднимаем приложение"
  systemctl enable --now vibecast
  sleep 5
  systemctl is-active vibecast
fi

log "Перезапускаем туннель"
: > "$LOG"
systemctl enable --now vibecast-tunnel >/dev/null 2>&1 || true
systemctl restart vibecast-tunnel
sleep 3

log "Ждём адрес"
URL=""
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | tail -1)
  [ -n "$URL" ] && break
  sleep 2
done

echo
if [ -n "$URL" ]; then
  printf '\033[1;32m'
  echo "======================================================"
  echo "  САЙТ:    ${URL}"
  echo "  АДМИНКА: ${URL}/admin"
  echo "======================================================"
  printf '\033[0m'
  echo
  echo "Адрес временный и меняется при каждом перезапуске туннеля."
  echo "Постоянный будет на vibecast.one, когда доделаем именной туннель."
else
  log "Адрес не появился — последние строки журнала:"
  tail -25 "$LOG"
fi

log "Состояние служб"
for u in vibecast nginx vibecast-tunnel cloudflared; do
  printf '%-18s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null || echo нет)"
done
