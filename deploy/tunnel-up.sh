#!/usr/bin/env bash
# Поднять именной туннель Cloudflare: bash deploy/tunnel-up.sh <ТОКЕН>
#
# Почему юнит пишем сами, а не через «cloudflared service install»:
# та команда на этом сервере молча не создала службу — cloudflared.service
# не появился вообще. Собственный юнит предсказуем и виден целиком.
#
# Временный туннель НЕ выключаем: сначала убеждаемся, что новый канал
# подключился, и только потом от старого можно избавляться. Утром мы
# сделали наоборот и остались без сайта.
set -uo pipefail

TOKEN="${1:-}"
UNIT=/etc/systemd/system/cloudflared.service
BIN=/usr/local/bin/cloudflared

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!! %s\033[0m\n' "$*"; }

if [ -z "$TOKEN" ]; then
  fail "Не передан токен. Запуск: bash deploy/tunnel-up.sh <ТОКЕН>"
  exit 1
fi

# Токен набирают руками в консоли, а она путает символы. Искажённый токен
# Cloudflare отвергает молча — соединения просто не будет, без ошибки
# в логах. Поэтому сверяем токен до запуска.
EXPECTED_TUNNEL=b993468d-50b9-48d2-ad58-3b6ddd15868e
log "Проверяем токен"
echo "длина: ${#TOKEN} (должно быть 184)"
GOT=$(echo "$TOKEN" | base64 -d 2>/dev/null | tr -d '{}"' | tr ',' '\n' |
  grep '^t:' | cut -d: -f2-)
echo "туннель из токена: ${GOT:-не расшифровался}"

if [ "$GOT" != "$EXPECTED_TUNNEL" ]; then
  fail "ТОКЕН НАБРАН С ОШИБКОЙ — символы искажены при вводе."
  echo "Ожидался туннель: $EXPECTED_TUNNEL"
  echo
  echo "Набирать 184 символа в этой консоли ненадёжно. Вставь токен через"
  echo "буфер обмена noVNC: узкая вкладка со стрелкой на левом краю окна"
  echo "консоли, поле Clipboard. Либо повтори ввод внимательнее."
  echo
  echo "Ничего не меняли, сайт работает как работал."
  exit 1
fi
echo "токен верный"

if [ ! -x "$BIN" ]; then
  log "Ставим cloudflared"
  curl -fsSL --max-time 300 -o "$BIN" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 || {
    fail "Не удалось скачать cloudflared"
    exit 1
  }
  chmod +x "$BIN"
fi
"$BIN" --version

log "Служба туннеля"
cat > "$UNIT" <<EOF
[Unit]
Description=cloudflared named tunnel (vibecast.one)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${BIN} tunnel --no-autoupdate --loglevel info run --token ${TOKEN}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
# В юните лежит токен — закрываем от чужих глаз.
chmod 600 "$UNIT"

systemctl daemon-reload
systemctl enable cloudflared >/dev/null 2>&1
systemctl restart cloudflared

log "Ждём подключения к Cloudflare"
ok=""
for i in $(seq 1 30); do
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
  echo "  ТУННЕЛЬ ПОДКЛЮЧЁН"
  echo "  Осталось в панели Cloudflare добавить Public Hostname"
  echo "  vibecast.one -> HTTP -> localhost:80"
  echo "======================================================"
  printf '\033[0m'
else
  fail "Туннель не подключился. Последние строки журнала:"
  journalctl -u cloudflared -n 25 --no-pager
  echo
  echo "Временный туннель не тронут — сайт продолжает работать по прежнему адресу."
fi

log "Состояние служб"
for u in vibecast nginx vibecast-tunnel cloudflared; do
  printf '%-18s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null || echo нет)"
done
