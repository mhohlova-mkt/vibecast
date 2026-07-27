#!/usr/bin/env bash
# Развёртывание vibecast на чистой Ubuntu 24.04.
# Запускать от root на сервере. Идемпотентно — можно гонять повторно.
set -euo pipefail

APP_DIR=/opt/vibecast
APP_USER=vibecast
NODE_MAJOR=22
REPO="${REPO:-}"          # https://github.com/<owner>/<repo>.git
DOMAIN="${DOMAIN:-}"      # пусто — работаем по IP, без HTTPS
SSH_PORT="${SSH_PORT:-443}"
ADMIN_KEY="${ADMIN_KEY:-}" # публичный ключ для доступа по SSH

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

log "Обновляем пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ufw fail2ban ca-certificates gnupg sqlite3

log "Ставим Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" != "$NODE_MAJOR" ]; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
fi
node -v

# ─────────────── SSH: свой порт + только по ключу ───────────────
# Фильтрация на пути к серверу убивает SSH на 22-м порту, поэтому
# слушаем ещё и 443 — его инспектируют редко.
log "Настраиваем SSH (порты 22 и ${SSH_PORT}, вход по ключу)"
systemctl disable --now ssh.socket 2>/dev/null || true
cat > /etc/ssh/sshd_config.d/10-vibecast.conf <<EOF
Port 22
Port ${SSH_PORT}
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF

if [ -n "$ADMIN_KEY" ]; then
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  touch /root/.ssh/authorized_keys
  grep -qF "$ADMIN_KEY" /root/.ssh/authorized_keys || echo "$ADMIN_KEY" >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
fi

sshd -t && systemctl enable --now ssh && systemctl restart ssh

log "Файрвол и защита от перебора"
ufw allow 22/tcp
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable --now fail2ban

# ─────────────── Приложение ───────────────
log "Забираем код"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  [ -n "$REPO" ] || { echo "Не задан REPO"; exit 1; }
  rm -rf "$APP_DIR"
  git clone --depth 1 "$REPO" "$APP_DIR"
fi

log "Собираем приложение"
cd "$APP_DIR"
mkdir -p "$APP_DIR/data" "$APP_DIR/public/uploads"

if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="file:${APP_DIR}/data/vibecast.db"
UPLOAD_DIR="${APP_DIR}/public/uploads"
AUTH_SECRET="$(openssl rand -hex 32)"
NODE_ENV=production
EOF
  chmod 600 "$APP_DIR/.env"
fi

npm ci --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund
npx prisma migrate deploy
npm run build

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Служба systemd"
cat > /etc/systemd/system/vibecast.service <<EOF
[Unit]
Description=vibecast portal
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now vibecast
systemctl restart vibecast

log "nginx"
SERVER_NAME="${DOMAIN:-_}"
cat > /etc/nginx/sites-available/vibecast <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};
    client_max_body_size 20m;

    # Загруженные файлы отдаёт nginx, не Node.
    location /uploads/ {
        alias ${APP_DIR}/public/uploads/;
        access_log off;
        expires 30d;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/vibecast /etc/nginx/sites-enabled/vibecast
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

if [ -n "$DOMAIN" ]; then
  log "HTTPS для ${DOMAIN}"
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect || \
    echo "certbot не смог — проверь, что домен указывает на этот сервер"
fi

log "Ежедневный бэкап базы"
cat > /etc/cron.daily/vibecast-backup <<EOF
#!/bin/sh
mkdir -p ${APP_DIR}/backups
sqlite3 ${APP_DIR}/data/vibecast.db ".backup ${APP_DIR}/backups/db-\$(date +%F).sqlite"
find ${APP_DIR}/backups -name 'db-*.sqlite' -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/vibecast-backup

log "Готово"
systemctl --no-pager --lines=0 status vibecast | head -5
echo
echo "Портал:  http://${DOMAIN:-$(hostname -I | awk '{print $1}')}/"
echo "Админка: http://${DOMAIN:-$(hostname -I | awk '{print $1}')}/admin"
echo "SSH теперь слушает порты 22 и ${SSH_PORT}."
