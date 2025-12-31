# 🔧 Исправление проблемы 204 No Content на Synology

## Проблема

- Файл существует: `/volume1/docker/playflon/audio/focus/test.mp3`
- API возвращает: `HTTP 204 No Content`
- В UI: "Пустой ответ от сервера"

## Причины

1. **В Firestore нет треков** для `mood=focus`
2. **Неправильный AUDIO_BASE_PATH** в контейнере
3. **Volume mount не работает** или файл недоступен

## План исправления

### Шаг 1: Диагностика

Выполните диагностический скрипт:

```bash
cd /volume1/docker/playflon/backend
chmod +x diagnose-synology.sh
./diagnose-synology.sh
```

Или вручную:

```bash
# 1. Проверка контейнера
docker ps | grep playflon-backend

# 2. Проверка логов
docker logs --tail=50 playflon-backend

# 3. Проверка переменных окружения
docker exec playflon-backend sh -c 'cat /app/.env | grep AUDIO_BASE_PATH'

# 4. Проверка volume mount
docker exec playflon-backend sh -c 'ls -lah /app/audio/focus/'

# 5. Проверка файла
docker exec playflon-backend sh -c 'test -f /app/audio/focus/test.mp3 && echo "OK" || echo "NOT FOUND"'
```

### Шаг 2: Проверка .env файла

Убедитесь, что в `/volume1/docker/playflon/backend/.env` установлено:

```env
AUDIO_BASE_PATH=/app/audio
PORT=3001
FIREBASE_PROJECT_ID=playflon
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=...
NODE_ENV=production
```

**Важно:** `AUDIO_BASE_PATH=/app/audio` должен совпадать с путем volume mount в docker-compose.yml

### Шаг 3: Создание треков в Firestore

#### Вариант A: Автоматическое сканирование (рекомендуется)

```bash
cd /volume1/docker/playflon/backend

# Внутри контейнера
docker exec -it playflon-backend sh -c 'cd /app && npm run scan-audio'
```

Этот скрипт:
- Сканирует папки `focus/`, `chill/`, `sleep/`, `ambient/`
- Находит все `.mp3`, `.wav`, `.m4a`, `.ogg` файлы
- Создает/обновляет записи в Firestore

#### Вариант B: Ручное создание через Firebase Console

1. Откройте Firebase Console → Firestore Database
2. Создайте коллекцию `tracks` (если нет)
3. Добавьте документ с полями:
   ```json
   {
     "mood": "focus",
     "filePath": "focus/test.mp3",
     "tags": ["focus"],
     "durationSec": 0,
     "prompt": "Test track",
     "createdAt": "2024-01-01T00:00:00Z"
   }
   ```

### Шаг 4: Перезапуск контейнера

```bash
cd /volume1/docker/playflon/backend

# Бэкап compose файла
cp docker-compose.yml docker-compose.yml.bak.$(date +%F_%H%M%S)

# Остановка
docker-compose down

# Пересборка (если нужно)
docker-compose build

# Запуск
docker-compose up -d

# Проверка логов
docker logs -f playflon-backend
```

### Шаг 5: Проверка

```bash
# 1. Проверка health endpoint
curl -i http://localhost:3001/health

# 2. Создание сессии
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"mood":"focus"}')
echo $SESSION_RESPONSE

# 3. Извлечение sessionId
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

# 4. Проверка /api/wave/next
curl -i "http://localhost:3001/api/wave/next?sessionId=$SESSION_ID&mood=focus"
```

**Ожидаемый результат:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "track": {
    "id": "...",
    "mood": "focus",
    "tags": ["focus"],
    "durationSec": 0
  },
  "streamUrl": "/api/stream/..."
}
```

**НЕ должно быть:**
- `HTTP/1.1 204 No Content`
- `{"track": null, "reason": "NO_TRACKS"}`

## Команды для быстрого исправления

```bash
# 1. Перейти в директорию
cd /volume1/docker/playflon/backend

# 2. Бэкап
cp docker-compose.yml docker-compose.yml.bak.$(date +%F_%H%M%S)

# 3. Проверить .env
cat .env | grep AUDIO_BASE_PATH
# Должно быть: AUDIO_BASE_PATH=/app/audio

# 4. Если нет - обновить .env
echo "AUDIO_BASE_PATH=/app/audio" >> .env

# 5. Перезапустить контейнер
docker-compose down && docker-compose up -d --build

# 6. Сканировать аудио и создать треки
docker exec -it playflon-backend sh -c 'cd /app && npm run scan-audio'

# 7. Проверить
curl -i "http://localhost:3001/api/wave/next?sessionId=test&mood=focus"
```

## Отчет о проблеме

### Что было причиной

1. **В Firestore не было треков** для `mood=focus`
2. **AUDIO_BASE_PATH** мог быть неправильным в .env

### Что изменено

1. ✅ Обновлен `docker-compose.yml`:
   - Добавлен `AUDIO_BASE_PATH=/app/audio` в environment
   - Уточнены комментарии к volume mounts

2. ✅ Добавлен скрипт `scripts/scan-audio-folder.ts`:
   - Автоматически сканирует папки с аудио
   - Создает/обновляет треки в Firestore

3. ✅ Добавлена команда `npm run scan-audio` в package.json

4. ✅ Добавлен диагностический скрипт `diagnose-synology.sh`

### Команды для воспроизведения

```bash
cd /volume1/docker/playflon/backend

# 1. Обновить .env (если нужно)
echo "AUDIO_BASE_PATH=/app/audio" >> .env

# 2. Перезапустить контейнер
docker-compose down && docker-compose up -d --build

# 3. Сканировать аудио
docker exec -it playflon-backend sh -c 'cd /app && npm run scan-audio'

# 4. Проверить
curl -i "http://localhost:3001/api/wave/next?sessionId=test&mood=focus"
```

### Команды проверки

```bash
# Внутри контейнера
docker exec playflon-backend sh -c 'curl -i "http://127.0.0.1:3001/api/wave/next?sessionId=test&mood=focus"'

# С NAS хоста
curl -i "http://localhost:3001/api/wave/next?sessionId=test&mood=focus"

# Проверка файла
docker exec playflon-backend sh -c 'ls -lah /app/audio/focus/test.mp3'

# Проверка Firestore (через логи)
docker logs playflon-backend | grep "Найдено треков"
```


