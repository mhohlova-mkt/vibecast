#!/usr/bin/env bash
# Доступ к серверу по SSH через туннель Cloudflare.
#
# Зачем: входящие соединения до этого сервера не проходят, а ввод в консоли
# ненадёжен — не работает Shift. Туннель уже поднят для сайта; тем же
# каналом пускаем и SSH, и тогда сервером можно управлять нормально.
#
# Порядок важен: сначала кладём ключ, проверяем, что он на месте, и только
# потом отключаем вход по паролю. Иначе можно остаться без доступа вообще.
set -uo pipefail

DOMAIN=vibecast.one
SSH_HOST=ssh.${DOMAIN}
CONFIG=/etc/cloudflared/config.yml
BIN=/usr/local/bin/cloudflared
ADMIN_KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGTNApdtDBKW/JrKAOeNf+Uxg/m24nyCuT6v9HM5VkA9 kirill-mac-magi'

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!! %s\033[0m\n' "$*"; }

# ─── 1. Ключ ───
log "Кладём ключ доступа"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
grep -qF "$ADMIN_KEY" /root/.ssh/authorized_keys ||
  echo "$ADMIN_KEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

if ! grep -qF "$ADMIN_KEY" /root/.ssh/authorized_keys; then
  fail "Ключ не записался — дальше не идём, чтобы не потерять доступ"
  exit 1
fi
echo "ключей в файле: $(grep -c 'ssh-' /root/.ssh/authorized_keys)"

# ─── 2. Вход только по ключу ───
# Пароль отключаем сразу: хостнейм SSH будет публичным, и оставлять
# перебор пароля открытым нельзя. Консоль на случай отката остаётся.
log "Отключаем вход по паролю"
SSH_CONF=/etc/ssh/sshd_config.d/20-vibecast-ssh.conf
if ! grep -qE '^\s*Include\s+/etc/ssh/sshd_config\.d/' /etc/ssh/sshd_config; then
  SSH_CONF=/etc/ssh/sshd_config
  sed -i '/# --- vibecast ssh ---/,/# --- \/vibecast ssh ---/d' "$SSH_CONF"
fi
mkdir -p /etc/ssh/sshd_config.d

cat >> "$SSH_CONF" <<'EOF'
# --- vibecast ssh ---
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
# --- /vibecast ssh ---
EOF

if sshd -t; then
  systemctl restart ssh
  echo "sshd перезапущен"
else
  fail "Конфигурация sshd не прошла проверку — откатываю"
  sed -i '/# --- vibecast ssh ---/,/# --- \/vibecast ssh ---/d' "$SSH_CONF"
  exit 1
fi

# ─── 3. SSH через туннель ───
log "Добавляем SSH в туннель"
[ -f "$CONFIG" ] || {
  fail "Нет $CONFIG — сначала подними туннель через deploy/tunnel-login.sh"
  exit 1
}

UUID=$(awk '/^tunnel:/ {print $2}' "$CONFIG")
CREDS=$(awk '/^credentials-file:/ {print $2}' "$CONFIG")
NAME=$("$BIN" tunnel list 2>/dev/null | awk -v u="$UUID" '$1 == u {print $2; exit}')
echo "туннель: ${NAME:-?} (${UUID})"

cat > "$CONFIG" <<EOF
tunnel: ${UUID}
credentials-file: ${CREDS}
no-autoupdate: true

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:80
  - hostname: www.${DOMAIN}
    service: http://localhost:80
  - hostname: ${SSH_HOST}
    service: ssh://localhost:22
  - service: http_status:404
EOF

if [ -n "$NAME" ]; then
  "$BIN" tunnel route dns -f "$NAME" "$SSH_HOST" || fail "не вышло с записью ${SSH_HOST}"
fi

systemctl restart cloudflared
sleep 3

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
  echo "  Сайт:  https://${DOMAIN}"
  echo "  SSH:   ${SSH_HOST}  (только по ключу)"
  echo "======================================================"
  printf '\033[0m'
else
  fail "Туннель не переподключился. Последние строки:"
  journalctl -u cloudflared -n 20 --no-pager
fi

log "Проверка"
sshd -T 2>/dev/null | grep -E '^(permitrootlogin|passwordauthentication)' || true
for u in vibecast nginx ssh cloudflared; do
  printf '%-14s %s\n' "$u" "$(systemctl is-active "$u" 2>/dev/null || echo нет)"
done
