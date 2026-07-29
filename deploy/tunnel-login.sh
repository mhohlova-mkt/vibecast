#!/usr/bin/env bash
# Именной туннель на vibecast.one без токена.
#
# Зачем так: в консоли этого сервера не работает Shift — заглавные буквы,
# «&», «|», «_» набрать нельзя, буфер обмена noVNC тоже не срабатывает.
# Токен туннеля содержит заглавные, то есть ввести его физически нечем.
# Поэтому используем вход через браузер: cloudflared печатает ссылку,
# владелец подтверждает домен в своём браузере, и на сервер сохраняется
# сертификат. Дальше всё делается командами без Shift.
#
# Временный туннель не выключаем, пока новый не подтвердит подключение.
set -uo pipefail

BIN=/usr/local/bin/cloudflared
NAME=vibecast
DOMAIN=vibecast.one
CERT=/root/.cloudflared/cert.pem

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!! %s\033[0m\n' "$*"; }

[ -x "$BIN" ] || {
  fail "cloudflared не найден в $BIN"
  exit 1
}

# ─── 1. Вход через браузер ───
if [ ! -f "$CERT" ]; then
  log "Вход в Cloudflare"
  echo "Сейчас появится длинная ссылка."
  echo "Открой её в браузере на своём компьютере, выбери домен ${DOMAIN}"
  echo "и нажми Authorize. Здесь ничего набирать не нужно — скрипт ждёт сам."
  echo
  "$BIN" tunnel login || {
    fail "Вход не завершён"
    exit 1
  }
fi

[ -f "$CERT" ] || {
  fail "Сертификат не появился — вход не прошёл"
  exit 1
}
log "Вход выполнен"

# ─── 2. Туннель ───
if "$BIN" tunnel list 2>/dev/null | grep -qw "$NAME"; then
  log "Туннель ${NAME} уже создан"
else
  log "Создаём туннель ${NAME}"
  "$BIN" tunnel create "$NAME" || {
    fail "Не удалось создать туннель"
    exit 1
  }
fi

UUID=$("$BIN" tunnel list 2>/dev/null | grep -w "$NAME" | awk '{print $1}' | head -1)
CREDS=/root/.cloudflared/${UUID}.json
echo "идентификатор: ${UUID}"

[ -f "$CREDS" ] || {
  fail "Файл доступа туннеля не найден: $CREDS"
  exit 1
}

# ─── 3. Записи DNS ───
# Флаг перезаписи снимает конфликт со старой A-записью автоматически,
# поэтому в панель заходить не нужно.
log "Направляем домен на туннель"
"$BIN" tunnel route dns -f "$NAME" "$DOMAIN" || fail "не вышло с ${DOMAIN}"
"$BIN" tunnel route dns -f "$NAME" "www.${DOMAIN}" || fail "не вышло с www"

# ─── 4. Настройки и служба ───
log "Служба"
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml <<EOF
tunnel: ${UUID}
credentials-file: ${CREDS}
no-autoupdate: true

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:80
  - hostname: www.${DOMAIN}
    service: http://localhost:80
  - service: http_status:404
EOF

cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=cloudflared named tunnel (${DOMAIN})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${BIN} --config /etc/cloudflared/config.yml --loglevel info tunnel run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cloudflared >/dev/null 2>&1
systemctl restart cloudflared

# ─── 5. Проверка ───
log "Ждём подключения"
ok=""
for _ in $(seq 1 30); do
  sleep 2
  if journalctl -u cloudflared --since '-2 min' --no-pager 2>/dev/null |
    grep -q 'Registered tunnel connection'; then
    ok=1
    break
  fi
done

echo
if [ -n "$ok" ]; then
  printf '\033[1;32m'
  echo "======================================================"
  echo "  ГОТОВО"
  echo "  Сайт:    https://${DOMAIN}"
  echo "  Админка: https://${DOMAIN}/admin"
  echo "======================================================"
  printf '\033[0m'
  echo
  echo "Адрес постоянный. После перезагрузки сервера туннель поднимется сам."
else
  fail "Туннель не подключился. Последние строки:"
  journalctl -u cloudflared -n 20 --no-pager
  echo
  echo "Временный туннель не тронут — сайт работает по прежнему адресу."
fi

log "Службы"
for u in vibecast nginx vibecast-tunnel cloudflared; do
  printf '%-18s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null || echo нет)"
done
