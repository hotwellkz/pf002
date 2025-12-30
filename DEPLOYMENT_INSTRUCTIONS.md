# Инструкции по развёртыванию PlayFlon

## 📋 Что было сделано

### Изменённые файлы:

1. **Backend:**
   - `backend/src/middleware/auth.ts` - новый middleware для проверки авторизации
   - `backend/src/routes/admin.ts` - новый роут для загрузки файлов
   - `backend/src/routes/audio.ts` - новый роут для раздачи аудиофайлов
   - `backend/src/index.ts` - добавлены новые роуты
   - `backend/docker-compose.yml` - изменён volume с `ro` на `rw` для записи файлов
   - `backend/package.json` - добавлены зависимости `multer` и `@types/multer`

2. **Frontend:**
   - `frontend/app/admin/upload/page.tsx` - новая админка для загрузки треков

3. **Nginx:**
   - `api.playflon.com.nginx.conf` - добавлен location для `/audio/*`

---

## 🔍 Диагностика (ШАГ A)

### На VPS:

```bash
# Показать текущие конфиги
cat /etc/nginx/sites-available/api.playflon.com
cat /etc/nginx/sites-available/api.shortsai.ru

# Проверить куда проксируется api.playflon.com
grep -A 5 "proxy_pass" /etc/nginx/sites-available/api.playflon.com
```

### На Synology:

```bash
# Найти docker-compose.yml PlayFlon
find /volume1/docker -name "docker-compose.yml" -type f

# Показать запущенные контейнеры и порты
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Проверить какие сервисы слушают порты
curl http://10.9.0.2:3000/health
curl http://10.9.0.2:3001/health
```

---

## 🔧 Разведение портов (ШАГ B)

### Проверка текущего состояния:

Backend PlayFlon уже настроен на порт **3001**:
- `backend/src/index.ts` - `PORT = process.env.PORT || 3001`
- `backend/docker-compose.yml` - `ports: ["3001:3001"]` и `PORT=3001`

### Если нужно пересобрать контейнер:

```bash
cd /volume1/docker/playflon/backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Проверить что контейнер запущен на 3001
docker ps | grep playflon
curl http://localhost:3001/health
```

---

## 🌐 Исправление Nginx на VPS (ШАГ C)

### 1. Создать backup текущего конфига:

```bash
sudo cp /etc/nginx/sites-available/api.playflon.com /etc/nginx/sites-available/api.playflon.com.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Обновить конфиг api.playflon.com:

```bash
# Скопировать новый конфиг с локальной машины на VPS
# (используйте scp или вручную скопируйте содержимое api.playflon.com.nginx.conf)

# Или отредактировать напрямую:
sudo nano /etc/nginx/sites-available/api.playflon.com
```

**Убедитесь что в конфиге:**
- `proxy_pass http://10.9.0.2:3001;` для всех location (не 3000!)
- Добавлен location `/audio/` с проксированием на `10.9.0.2:3001`

### 3. Проверить и перезагрузить nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Проверить работу:

```bash
# PlayFlon API
curl -I https://api.playflon.com/health

# ShortsAI (должен работать как раньше)
curl -I https://api.shortsai.ru/health
```

---

## 📦 Развёртывание изменений на Synology

### 1. Загрузить обновлённый код:

```powershell
# На локальной машине (PowerShell)
cd C:\Users\studo\Downloads\PlayFlon

# Создать архив backend
Compress-Archive -Path backend\* -DestinationPath backend-update.zip -Force

# Загрузить на Synology через File Station или SCP:
# scp backend-update.zip admin@synology-ip:/volume1/docker/playflon/
```

### 2. На Synology:

```bash
cd /volume1/docker/playflon/backend

# Создать backup текущего docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Обновить файлы (распаковать архив или скопировать вручную)
# Убедиться что docker-compose.yml содержит:
#   - ports: ["3001:3001"]
#   - volumes: .../audio:/app/audio:rw (не :ro!)

# Пересобрать и перезапустить
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Проверить логи
docker-compose logs -f backend
```

### 3. Проверить монтирование volume:

```bash
# Проверить что папка монтируется с правами записи
docker exec playflon-backend ls -la /app/audio
docker exec playflon-backend touch /app/audio/test.txt
docker exec playflon-backend rm /app/audio/test.txt
```

---

## 🎨 Развёртывание фронтенда

### На Netlify (или другом хостинге):

1. Убедиться что в `.env.local` или переменных окружения Netlify есть:
   ```
   NEXT_PUBLIC_API_URL=https://api.playflon.com
   ```

2. Пересобрать и задеплоить:
   ```bash
   cd frontend
   npm run build
   # Задеплоить на Netlify
   ```

---

## ✅ Тестовый чеклист

### 1. Проверка портов:

```bash
# На Synology
curl http://localhost:3000/health  # ShortsAI (должен работать)
curl http://localhost:3001/health # PlayFlon (должен работать)
```

### 2. Проверка Nginx на VPS:

```bash
# PlayFlon
curl -I https://api.playflon.com/health
curl -I https://api.playflon.com/api/wave/next?sessionId=test&mood=focus

# ShortsAI (не должен сломаться)
curl -I https://api.shortsai.ru/health
```

### 3. Проверка загрузки файлов:

1. Открыть `https://playflon.com/admin/upload`
2. Войти через Google с email `hotwellkz@gmail.com`
3. Выбрать режим (Focus/Chill/Sleep/Ambient)
4. Выбрать аудио файлы
5. Нажать "Загрузить файлы"
6. Проверить что файлы появились в DSM File Station:
   - `/volume1/docker/playflon/audio/{mode}/`

### 4. Проверка раздачи файлов:

```bash
# После загрузки файла, проверить что он доступен:
curl -I https://api.playflon.com/audio/focus/1234567890-test.mp3
# Должен вернуть 200 и Content-Type: audio/mpeg
```

### 5. Проверка работы PlayFlon:

1. Открыть `https://playflon.com/listen`
2. Выбрать режим
3. Проверить что треки загружаются и играют
4. Проверить что `/api/wave/next` не даёт 502

---

## 🔄 Откат изменений

### Откат Nginx на VPS:

```bash
# Восстановить backup
sudo cp /etc/nginx/sites-available/api.playflon.com.backup.* /etc/nginx/sites-available/api.playflon.com
sudo nginx -t
sudo systemctl reload nginx
```

### Откат docker-compose на Synology:

```bash
cd /volume1/docker/playflon/backend
cp docker-compose.yml.backup.* docker-compose.yml
docker-compose down
docker-compose up -d
```

---

## 📝 Важные замечания

1. **Порты:**
   - ShortsAI остаётся на `10.9.0.2:3000` (НЕ ТРОГАТЬ)
   - PlayFlon работает на `10.9.0.2:3001`

2. **Права доступа:**
   - Volume должен быть `rw` (read-write) для загрузки файлов
   - Проверить права папки `/volume1/docker/playflon/audio` в DSM

3. **Безопасность:**
   - Админка доступна только для `hotwellkz@gmail.com`
   - Все запросы к `/api/admin/*` требуют Firebase token

4. **Файлы:**
   - Файлы сохраняются с именами: `{timestamp}-{safeName}.mp3`
   - Метаданные сохраняются в Firestore коллекцию `tracks`

---

## 🐛 Troubleshooting

### 502 Bad Gateway на /api/wave/next:

1. Проверить что backend запущен: `docker ps | grep playflon`
2. Проверить что порт 3001 слушается: `curl http://10.9.0.2:3001/health`
3. Проверить nginx конфиг: `grep proxy_pass /etc/nginx/sites-available/api.playflon.com`
4. Проверить логи: `docker-compose logs backend` и `sudo tail -f /var/log/nginx/api.playflon.com.error.log`

### Файлы не загружаются:

1. Проверить права на папку: `ls -la /volume1/docker/playflon/audio`
2. Проверить что volume монтирован с `rw`: `docker inspect playflon-backend | grep -A 10 Mounts`
3. Проверить логи backend: `docker-compose logs backend`

### Админка не открывается:

1. Проверить что пользователь залогинен: `user?.email === 'hotwellkz@gmail.com'`
2. Проверить что Firebase token отправляется в заголовке `Authorization: Bearer ...`
3. Проверить логи backend: `docker-compose logs backend`

