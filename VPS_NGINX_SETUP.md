# Настройка Nginx Reverse Proxy для api.playflon.com на VPS

## ШАГ 1: ДИАГНОСТИКА NGINX

Подключитесь к VPS и выполните:

```bash
# 1.1 Проверка статуса Nginx
systemctl status nginx

# 1.2 Поиск конфигов
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# 1.3 Проверка активных server_name (чтобы не конфликтовать)
grep -R "server_name" /etc/nginx/sites-enabled /etc/nginx/sites-available 2>/dev/null | grep -v "#" | sort -u
```

## ШАГ 2: ДИАГНОСТИКА DNS

```bash
# 2.1 Проверка DNS резолвинга
dig +short api.playflon.com

# Должно вернуть: 159.255.37.158
# Если не резолвится - подождите распространения DNS (может занять до 24 часов)
```

## ШАГ 3: ОПРЕДЕЛЕНИЕ UPSTREAM ПОРТА

```bash
# 3.1 Проверка слушающих портов
ss -lntp | grep LISTEN

# 3.2 Поиск порта Playflon backend (проверка кандидатов)
# Проверяем стандартные порты:
for port in 3000 3001 8080 4000 5000; do
  echo "Проверка порта $port:"
  curl -sS -m 2 http://127.0.0.1:$port/health 2>&1 | head -5
  echo "---"
done

# 3.3 Если /health не отвечает, пробуем другие endpoints
for port in 3000 3001 8080 4000; do
  echo "Проверка порта $port:"
  curl -sS -m 2 -X OPTIONS http://127.0.0.1:$port/api/session/start 2>&1 | head -5
  echo "---"
done

# 3.4 Проверка через Docker (если backend на VPS)
docker ps | grep playflon || echo "Backend не на VPS, проверяем туннель"
```

**Запомните найденный порт (например, 3000) - он будет использован как UPSTREAM_PORT**

## ШАГ 4: СОЗДАНИЕ КОНФИГА NGINX

```bash
# 4.1 Создание нового конфига (НЕ ТРОГАЕМ СТАРЫЕ!)
sudo nano /etc/nginx/sites-available/api.playflon.com
```

Вставьте следующий конфиг (замените `UPSTREAM_PORT` на найденный порт, например 3000):

```nginx
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
        return 301 https://$server_name$request_uri;
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

    # SSL configuration (будет обновлено certbot)
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers HIGH:!aNULL:!MD5;
    # ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/api.playflon.com.access.log;
    error_log /var/log/nginx/api.playflon.com.error.log;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_request_buffering off;
    client_max_body_size 50m;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";

    # Audio streaming support (Range requests)
    proxy_set_header Range $http_range;
    proxy_set_header If-Range $http_if_range;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:UPSTREAM_PORT/health;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:UPSTREAM_PORT;
    }

    # Root and other paths
    location / {
        proxy_pass http://127.0.0.1:UPSTREAM_PORT;
    }
}
```

**ВАЖНО:** Замените `UPSTREAM_PORT` на реальный порт (например, `3000`)

## ШАГ 5: ВКЛЮЧЕНИЕ КОНФИГА

```bash
# 5.1 Создание симлинка
sudo ln -s /etc/nginx/sites-available/api.playflon.com /etc/nginx/sites-enabled/api.playflon.com

# 5.2 Проверка синтаксиса
sudo nginx -t

# Если ошибок нет, перезагружаем
sudo systemctl reload nginx
```

## ШАГ 6: НАСТРОЙКА HTTPS (LET'S ENCRYPT)

```bash
# 6.1 Установка certbot (если еще не установлен)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 6.2 Выпуск сертификата
sudo certbot --nginx -d api.playflon.com

# Следуйте инструкциям:
# - Email для уведомлений
# - Согласие с условиями
# - Редирект HTTP->HTTPS (выберите 2 - Redirect)

# 6.3 Включение автообновления
sudo systemctl enable --now certbot.timer

# 6.4 Проверка сертификата
sudo certbot certificates
```

## ШАГ 7: FIREWALL

```bash
# 7.1 Проверка статуса firewall
sudo ufw status

# 7.2 Открытие портов (если не открыты)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 7.3 Проверка правил
sudo ufw status numbered
```

## ШАГ 8: ПРОВЕРКА РАБОТЫ

```bash
# 8.1 Проверка HTTP редиректа
curl -I http://api.playflon.com

# Должен вернуть: HTTP/1.1 301 Moved Permanently
# Location: https://api.playflon.com/...

# 8.2 Проверка HTTPS
curl -I https://api.playflon.com/health

# Должен вернуть: HTTP/2 200 и JSON с {"status":"ok",...}

# 8.3 Проверка API endpoint
curl -X OPTIONS https://api.playflon.com/api/session/start -v

# 8.4 Проверка логов
sudo tail -n 50 /var/log/nginx/api.playflon.com.access.log
sudo tail -n 50 /var/log/nginx/api.playflon.com.error.log

# 8.5 Проверка, что старый проект работает
# (проверьте домен старого проекта)
```

## ШАГ 9: ОТКАТ ИЗМЕНЕНИЙ (если что-то пошло не так)

```bash
# 9.1 Удаление симлинка
sudo rm /etc/nginx/sites-enabled/api.playflon.com

# 9.2 Перезагрузка Nginx
sudo systemctl reload nginx

# 9.3 Удаление конфига (опционально)
sudo rm /etc/nginx/sites-available/api.playflon.com

# 9.4 Удаление сертификата (опционально)
sudo certbot delete --cert-name api.playflon.com
```

## РЕЗУЛЬТАТ

После выполнения всех шагов:

1. **Конфиг создан:** `/etc/nginx/sites-available/api.playflon.com`
2. **Симлинк:** `/etc/nginx/sites-enabled/api.playflon.com`
3. **HTTPS:** Сертификат Let's Encrypt установлен
4. **Доступ:** https://api.playflon.com -> backend через туннель

## ПРОВЕРКА ФИНАЛЬНОГО КОНФИГА

```bash
# Показать финальный конфиг
sudo cat /etc/nginx/sites-available/api.playflon.com

# Показать активные конфиги
ls -la /etc/nginx/sites-enabled/

# Проверка всех server_name
grep -R "server_name" /etc/nginx/sites-enabled | grep -v "#"
```

## ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **Не изменяйте существующие конфиги** - новый конфиг полностью изолирован
2. **UPSTREAM_PORT** - замените на реальный порт, найденный в шаге 3
3. **DNS** - убедитесь, что api.playflon.com резолвится на 159.255.37.158
4. **Туннель** - убедитесь, что туннель между VPS и Synology работает
5. **Backend** - убедитесь, что backend на Synology слушает правильный порт

## ДИАГНОСТИКА ПРОБЛЕМ

Если что-то не работает:

```bash
# Проверка синтаксиса Nginx
sudo nginx -t

# Проверка статуса Nginx
sudo systemctl status nginx

# Просмотр ошибок
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/api.playflon.com.error.log

# Проверка доступности backend
curl -v http://127.0.0.1:UPSTREAM_PORT/health

# Проверка туннеля
# (зависит от типа туннеля - WireGuard/SSH)
```





