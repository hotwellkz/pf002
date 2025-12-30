#!/bin/bash
# Скрипт для автоматической настройки Nginx на VPS
# Использование: ./setup-nginx-vps.sh [UPSTREAM_PORT]

set -e  # Остановка при ошибке

UPSTREAM_PORT=${1:-3000}  # Порт по умолчанию 3000

echo "=========================================="
echo "Настройка Nginx для api.playflon.com"
echo "Upstream порт: $UPSTREAM_PORT"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Ошибка: Запустите скрипт с sudo${NC}"
    exit 1
fi

echo -e "${YELLOW}[ШАГ 1] Диагностика Nginx...${NC}"
systemctl status nginx --no-pager | head -5 || exit 1

echo -e "\n${YELLOW}[ШАГ 2] Проверка DNS...${NC}"
DNS_IP=$(dig +short api.playflon.com | head -1)
if [ -z "$DNS_IP" ]; then
    echo -e "${RED}Ошибка: api.playflon.com не резолвится. Проверьте DNS.${NC}"
    exit 1
fi
echo -e "${GREEN}DNS резолвится на: $DNS_IP${NC}"

echo -e "\n${YELLOW}[ШАГ 3] Проверка существующих конфигов...${NC}"
if [ -f "/etc/nginx/sites-enabled/api.playflon.com" ]; then
    echo -e "${YELLOW}Внимание: Конфиг уже существует. Продолжить? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "\n${YELLOW}[ШАГ 4] Проверка upstream порта $UPSTREAM_PORT...${NC}"
if curl -sS -m 2 "http://127.0.0.1:$UPSTREAM_PORT/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Backend доступен на порту $UPSTREAM_PORT${NC}"
else
    echo -e "${YELLOW}Предупреждение: /health не отвечает на порту $UPSTREAM_PORT${NC}"
    echo -e "${YELLOW}Продолжить с этим портом? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "\n${YELLOW}[ШАГ 5] Создание конфига Nginx...${NC}"
CONFIG_FILE="/etc/nginx/sites-available/api.playflon.com"

# Создаем конфиг с заменой UPSTREAM_PORT
cat > "$CONFIG_FILE" <<EOF
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.playflon.com;

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS -> Backend proxy
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.playflon.com;

    # SSL certificates (будут добавлены certbot)
    # ssl_certificate /etc/letsencrypt/live/api.playflon.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.playflon.com/privkey.pem;

    # Logging
    access_log /var/log/nginx/api.playflon.com.access.log;
    error_log /var/log/nginx/api.playflon.com.error.log;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_request_buffering off;
    client_max_body_size 50m;

    # Proxy headers
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Connection "";

    # Audio streaming support (Range requests)
    proxy_set_header Range \$http_range;
    proxy_set_header If-Range \$http_if_range;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # All locations
    location / {
        proxy_pass http://127.0.0.1:$UPSTREAM_PORT;
    }
}
EOF

# Заменяем UPSTREAM_PORT в конфиге
sed -i "s/UPSTREAM_PORT/$UPSTREAM_PORT/g" "$CONFIG_FILE"

echo -e "${GREEN}Конфиг создан: $CONFIG_FILE${NC}"

echo -e "\n${YELLOW}[ШАГ 6] Включение конфига...${NC}"
ln -sf "$CONFIG_FILE" /etc/nginx/sites-enabled/api.playflon.com
echo -e "${GREEN}Симлинк создан${NC}"

echo -e "\n${YELLOW}[ШАГ 7] Проверка синтаксиса Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}Синтаксис корректен${NC}"
else
    echo -e "${RED}Ошибка синтаксиса!${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[ШАГ 8] Перезагрузка Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}Nginx перезагружен${NC}"

echo -e "\n${YELLOW}[ШАГ 9] Проверка firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    echo -e "${GREEN}Порты 80 и 443 открыты${NC}"
else
    echo -e "${YELLOW}ufw не найден, проверьте firewall вручную${NC}"
fi

echo -e "\n${YELLOW}[ШАГ 10] Установка certbot (если нужно)...${NC}"
if ! command -v certbot &> /dev/null; then
    apt update
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}Certbot установлен${NC}"
else
    echo -e "${GREEN}Certbot уже установлен${NC}"
fi

echo -e "\n${GREEN}=========================================="
echo "Настройка завершена!"
echo "==========================================${NC}"
echo ""
echo "Следующий шаг:"
echo "  sudo certbot --nginx -d api.playflon.com"
echo ""
echo "Проверка работы:"
echo "  curl -I http://api.playflon.com"
echo "  curl -I https://api.playflon.com/health"
echo ""
echo "Конфиг: $CONFIG_FILE"
echo "Upstream порт: $UPSTREAM_PORT"
echo ""





