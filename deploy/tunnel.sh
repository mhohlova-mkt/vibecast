#!/usr/bin/env bash
# Публикация портала через исходящий туннель Cloudflare.
#
# Зачем: у этого хостинга сломан входящий трафик — SYN от клиента доходит,
# но рукопожатие никогда не завершается (промежуточный анти-DDoS отвечает
# сам за сервер). Ни один входящий порт не работает. Туннель обходит это:
# сервер сам подключается наружу, публичный адрес выдаёт Cloudflare.
set -euo pipefail

APP_PORT="${APP_PORT:-3000}"
BIN=/usr/local/bin/cloudflared
LOG=/var/log/cloudflared.log

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

log "Освобождаем порт 443 (SSH оставляем на 22)"
# Порт 443 был прописан дважды и всё равно не биндился; он нужен под HTTPS.
sed -i '/# --- vibecast ---/,/# --- \/vibecast ---/d' /etc/ssh/sshd_config
rm -f /etc/ssh/sshd_config.d/10-alt.conf
cat >> /etc/ssh/sshd_config <<'EOF'
# --- vibecast ---
Port 22
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
# --- /vibecast ---
EOF
sshd -t && systemctl restart ssh
echo "sshd слушает:"; ss -tlnp | grep sshd || true

log "Ставим cloudflared"
if [ ! -x "$BIN" ]; then
  curl -fsSL --max-time 300 -o "$BIN" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "$BIN"
fi
"$BIN" --version

log "Служба туннеля"
cat > /etc/systemd/system/vibecast-tunnel.service <<EOF
[Unit]
Description=vibecast public tunnel
After=network.target vibecast.service

[Service]
Type=simple
ExecStart=${BIN} tunnel --no-autoupdate --url http://127.0.0.1:${APP_PORT}
Restart=always
RestartSec=5
StandardOutput=append:${LOG}
StandardError=append:${LOG}

[Install]
WantedBy=multi-user.target
EOF

: > "$LOG"
systemctl daemon-reload
systemctl enable --now vibecast-tunnel
systemctl restart vibecast-tunnel

log "Ждём публичный адрес"
URL=""
for _ in $(seq 1 30); do
  sleep 2
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
done

if [ -n "$URL" ]; then
  log "ГОТОВО"
  echo
  echo "  Портал:  ${URL}"
  echo "  Админка: ${URL}/admin"
  echo
  echo "Адрес временный — меняется при перезапуске туннеля."
else
  log "Адрес не появился — смотри ${LOG}"
  tail -20 "$LOG"
  exit 1
fi
