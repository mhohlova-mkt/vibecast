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
ADMIN_KEY="${ADMIN_KEY:-ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGTNApdtDBKW/JrKAOeNf+Uxg/m24nyCuT6v9HM5VkA9 kirill-mac-magi}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

log "Обновляем пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ufw fail2ban ca-certificates gnupg sqlite3 xz-utils

log "Ставим Node.js ${NODE_MAJOR}"

node_ok() {
  command -v node >/dev/null 2>&1 &&
    [ "$(node -v | cut -c2- | cut -d. -f1)" -ge 20 ] 2>/dev/null
}

# Способ 1 — репозиторий NodeSource (из РФ бывает недоступен).
try_nodesource() {
  mkdir -p /etc/apt/keyrings
  curl -fsSL --max-time 40 https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes || return 1
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq && apt-get install -y -qq nodejs
}

# Способ 2 — официальный архив с nodejs.org.
try_tarball() {
  local file url tmp
  file=$(curl -fsSL --max-time 40 "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/" |
    grep -oE "node-v${NODE_MAJOR}\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz" | head -1) || return 1
  [ -n "$file" ] || return 1
  url="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/${file}"
  tmp=$(mktemp -d)
  curl -fsSL --max-time 300 -o "$tmp/node.tar.xz" "$url" || { rm -rf "$tmp"; return 1; }
  tar -xJf "$tmp/node.tar.xz" -C "$tmp" || { rm -rf "$tmp"; return 1; }
  cp -rf "$tmp"/node-v*/{bin,include,lib,share} /usr/local/
  rm -rf "$tmp"
  hash -r
}

# Способ 3 — snap (обычно доступен, когда прямые загрузки режут).
try_snap() {
  command -v snap >/dev/null 2>&1 || apt-get install -y -qq snapd || return 1
  snap install node --classic --channel="${NODE_MAJOR}" || return 1
  ln -sf /snap/bin/node /usr/local/bin/node
  ln -sf /snap/bin/npm /usr/local/bin/npm
  ln -sf /snap/bin/npx /usr/local/bin/npx
  hash -r
}

if ! node_ok; then
  for method in try_nodesource try_tarball try_snap; do
    echo "--- пробуем: ${method#try_}"
    if "$method" && node_ok; then break; fi
    echo "--- не вышло: ${method#try_}, идём дальше"
  done
fi

node_ok || { echo "ОШИБКА: не удалось поставить Node.js 20+"; exit 1; }
echo "Node: $(node -v), npm: $(npm -v)"

# ─────────────── SSH: свой порт + только по ключу ───────────────
# Фильтрация на пути к серверу убивает SSH на 22-м порту, поэтому
# слушаем ещё и 443 — его инспектируют редко.
log "Настраиваем SSH (порты 22 и ${SSH_PORT}, вход по ключу)"
systemctl disable --now ssh.socket 2>/dev/null || true

# В образе этого хостинга основной sshd_config не подключает каталог
# sshd_config.d — поэтому пишем туда, куда sshd действительно смотрит.
SSH_CONF=/etc/ssh/sshd_config.d/10-vibecast.conf
if ! grep -qE '^\s*Include\s+/etc/ssh/sshd_config\.d/' /etc/ssh/sshd_config; then
  SSH_CONF=/etc/ssh/sshd_config
  # Убираем прежние наши строки, чтобы не плодить дубли при повторном запуске.
  sed -i '/# --- vibecast ---/,/# --- \/vibecast ---/d' "$SSH_CONF"
fi

cat >> "$SSH_CONF" <<EOF
# --- vibecast ---
Port 22
Port ${SSH_PORT}
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
# --- /vibecast ---
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

# Сборка next требует и dev-зависимостей (typescript, @types) — ставим всё.
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npx prisma generate
npx prisma migrate deploy
npm run build

# Первый запуск: наполняем базу демо-контентом, если она пустая.
if [ "$(sqlite3 "${APP_DIR}/data/vibecast.db" 'select count(*) from Article' 2>/dev/null || echo 0)" = "0" ]; then
  npx tsx prisma/seed.ts || echo "сид пропущен"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Служба systemd"
# npm может лежать в /usr/bin, /usr/local/bin или /snap/bin — берём фактический.
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$(command -v node)")"
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
Environment=PATH=${NODE_DIR}:/usr/local/bin:/usr/bin:/bin
ExecStart=${NPM_BIN} run start
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
