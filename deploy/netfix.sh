#!/usr/bin/env bash
# Диагностика и починка входящих соединений.
#
# Симптом: SYN от клиента доходит до сервера с урезанными TCP-опциями,
# сервер шлёт SYN-ACK и ретранслирует его 5 раз, финальный ACK не приходит.
# Клиент при этом видит «соединение установлено» — значит рукопожатие
# завершает промежуточное устройство хостера, а до сервера не доводит.
#
# Ниже — то, что на стороне сервера способно ломать такие связки:
# аппаратные оффлоуды сетевой карты, размер пакета, обратный путь.
set -euo pipefail

IFACE="${IFACE:-$(ip route show default | awk '/default/ {print $5; exit}')}"
MTU="${MTU:-1400}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

log "Интерфейс: ${IFACE}"

log "Что сейчас"
ip -brief address show "$IFACE"
echo "--- маршруты ---"
ip route
echo "--- MTU ---"
ip link show "$IFACE" | head -1
echo "--- оффлоуды ---"
ethtool -k "$IFACE" 2>/dev/null | grep -E '^(tcp-segmentation|generic-segmentation|generic-receive|large-receive)' || echo "ethtool недоступен"
echo "--- sysctl ---"
sysctl net.ipv4.tcp_timestamps net.ipv4.tcp_window_scaling net.ipv4.tcp_sack \
       net.ipv4.tcp_syncookies net.ipv4.conf.all.rp_filter 2>/dev/null || true
echo "--- счётчики отброшенных ---"
netstat -s 2>/dev/null | grep -iE 'listen|SYN' | head -10 || true

log "Применяем"

# 1. Оффлоуды. Виртуальная карта склеивает пакеты в гигантские сегменты;
#    промежуточные фильтры такое нередко отбрасывают.
if command -v ethtool >/dev/null; then
  ethtool -K "$IFACE" tso off gso off gro off lro off 2>/dev/null || true
  echo "оффлоуды выключены"
fi

# 2. MTU. Если сеть хостера не пропускает 1500, крупные ответы теряются.
ip link set "$IFACE" mtu "$MTU"
echo "MTU = ${MTU}"

# 3. Обратный путь и syn-cookies: не отбрасывать пакеты, пришедшие
#    «не тем» маршрутом, и не отвечать урезанно под нагрузкой.
cat > /etc/sysctl.d/99-vibecast-net.conf <<EOF
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.tcp_syncookies = 0
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_synack_retries = 5
EOF
sysctl -q -p /etc/sysctl.d/99-vibecast-net.conf
echo "sysctl применён"

# 4. Закрепляем оффлоуды и MTU на перезагрузки.
cat > /etc/systemd/system/vibecast-net.service <<EOF
[Unit]
Description=vibecast network tuning
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c '/sbin/ethtool -K ${IFACE} tso off gso off gro off lro off || true; /sbin/ip link set ${IFACE} mtu ${MTU}'

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now vibecast-net >/dev/null 2>&1 || true

log "Стало"
ip link show "$IFACE" | head -1
ethtool -k "$IFACE" 2>/dev/null | grep -E '^(tcp-segmentation|generic-segmentation|generic-receive)' || true

log "Проверка сервисов"
systemctl is-active vibecast nginx | tr '\n' ' '; echo
ss -tlnp | grep -E ':(80|3000|8080|55080) ' || true
curl -s -o /dev/null -w "локально nginx: %{http_code}\n" http://127.0.0.1/

log "Готово — теперь проверяй снаружи"
