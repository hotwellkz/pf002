# 🚀 Развертывание исправления CORS на VPS

## Проблема

1. **CORS ошибка**: Запросы с `https://playflon.com` блокируются из-за отсутствия CORS заголовков
2. **502 Bad Gateway**: Nginx не может подключиться к backend на Synology

## Решение

### Шаг 1: Подготовка конфигурации

Конфигурация nginx обновлена в файле `api.playflon.com.nginx.conf`:
- ✅ Добавлены CORS заголовки для `https://playflon.com`
- ✅ Настроена обработка preflight OPTIONS запросов
- ✅ Проксирование на backend через WireGuard (10.9.0.2:3000)

### Шаг 2: Проверка backend на Synology

Подключитесь к Synology и проверьте статус контейнера:

```bash
ssh shortsai "sudo docker ps | grep playflon"
```

Или через Synology DSM:
1. Откройте **Container Manager**
2. Найдите контейнер `playflon-backend`
3. Проверьте, что он запущен и слушает порт 3000

### Шаг 3: Проверка WireGuard подключения

На VPS проверьте доступность backend через WireGuard:

```bash
ssh shortsai-vps "curl -v http://10.9.0.2:3000/health"
```

Должен вернуться JSON: `{"status":"ok","timestamp":"..."}`

**Если адрес другой:**
- Проверьте IP адрес Synology в WireGuard: `ssh shortsai-vps "ip addr show | grep 10.9"`
- Или проверьте конфигурацию WireGuard: `ssh shortsai-vps "cat /etc/wireguard/*.conf | grep Address"`

### Шаг 4: Копирование конфигурации на VPS

```bash
# Копируем обновленный конфиг на VPS
Get-Content api.playflon.com.nginx.conf | ssh shortsai-vps "sudo tee /etc/nginx/sites-available/api.playflon.com > /dev/null"
```

### Шаг 5: Проверка и применение конфигурации

```bash
# Проверка синтаксиса
ssh shortsai-vps "sudo nginx -t"

# Если синтаксис правильный, создаем симлинк (если еще не создан)
ssh shortsai-vps "sudo ln -sf /etc/nginx/sites-available/api.playflon.com /etc/nginx/sites-enabled/api.playflon.com"

# Перезагрузка nginx
ssh shortsai-vps "sudo systemctl reload nginx"
```

### Шаг 6: Проверка работы

```bash
# Проверка health endpoint
ssh shortsai-vps "curl -I https://api.playflon.com/health"

# Проверка CORS (preflight запрос)
ssh shortsai-vps "curl -X OPTIONS https://api.playflon.com/api/session/start -H 'Origin: https://playflon.com' -H 'Access-Control-Request-Method: POST' -v"

# Должны вернуться CORS заголовки:
# Access-Control-Allow-Origin: https://playflon.com
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Шаг 7: Проверка логов

```bash
# Просмотр логов доступа
ssh shortsai-vps "sudo tail -n 50 /var/log/nginx/api.playflon.com.access.log"

# Просмотр логов ошибок
ssh shortsai-vps "sudo tail -n 50 /var/log/nginx/api.playflon.com.error.log"
```

## Важные замечания

1. **IP адрес Synology**: В конфигурации используется `10.9.0.2:3000`. Если ваш адрес другой, обновите в конфигурации:
   ```nginx
   proxy_pass http://YOUR_SYNOLOGY_IP:3000;
   ```

2. **Порт backend**: Судя по `docker-compose.yml`, backend слушает порт 3000 на Synology. Если порт другой, обновите конфигурацию.

3. **WireGuard**: Убедитесь, что WireGuard туннель между VPS и Synology активен:
   ```bash
   ssh shortsai-vps "sudo wg show"
   ```

4. **SSL сертификаты**: Если SSL еще не настроен, временно можно использовать HTTP для тестирования (не рекомендуется для production).

## Откат изменений (если что-то пошло не так)

```bash
# Удаление симлинка
ssh shortsai-vps "sudo rm /etc/nginx/sites-enabled/api.playflon.com"

# Перезагрузка nginx
ssh shortsai-vps "sudo systemctl reload nginx"

# Восстановление старой конфигурации (если есть бэкап)
ssh shortsai-vps "sudo cp /etc/nginx/sites-available/api.playflon.com.backup /etc/nginx/sites-available/api.playflon.com"
```

## Диагностика проблем

### Проблема: 502 Bad Gateway

```bash
# 1. Проверка доступности backend
ssh shortsai-vps "curl -v http://10.9.0.2:3000/health"

# 2. Проверка WireGuard
ssh shortsai-vps "ping -c 3 10.9.0.2"

# 3. Проверка порта на Synology
ssh shortsai "netstat -tlnp | grep 3000"
```

### Проблема: CORS все еще не работает

```bash
# Проверка заголовков в ответе
ssh shortsai-vps "curl -X OPTIONS https://api.playflon.com/api/session/start -H 'Origin: https://playflon.com' -H 'Access-Control-Request-Method: POST' -v 2>&1 | grep -i 'access-control'"

# Проверка конфигурации nginx
ssh shortsai-vps "sudo grep -A 10 'location.*api' /etc/nginx/sites-available/api.playflon.com"
```

## Автоматический скрипт развертывания

Создайте файл `deploy-nginx.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Развертывание конфигурации nginx для api.playflon.com"

# Копирование конфигурации
cat api.playflon.com.nginx.conf | ssh shortsai-vps "sudo tee /etc/nginx/sites-available/api.playflon.com > /dev/null"

# Проверка синтаксиса
echo "📋 Проверка синтаксиса..."
ssh shortsai-vps "sudo nginx -t"

# Создание симлинка
echo "🔗 Создание симлинка..."
ssh shortsai-vps "sudo ln -sf /etc/nginx/sites-available/api.playflon.com /etc/nginx/sites-enabled/api.playflon.com"

# Перезагрузка nginx
echo "🔄 Перезагрузка nginx..."
ssh shortsai-vps "sudo systemctl reload nginx"

echo "✅ Готово! Проверьте работу:"
echo "   curl -I https://api.playflon.com/health"
```

Запуск:
```bash
chmod +x deploy-nginx.sh
./deploy-nginx.sh
```

