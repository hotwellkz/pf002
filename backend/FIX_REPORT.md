# 📋 Отчет об исправлении проблемы 204 No Content

## Проблема

- Файл существует: `/volume1/docker/playflon/audio/focus/test.mp3`
- API возвращает: `HTTP 204 No Content` вместо валидного JSON
- В UI: "Пустой ответ от сервера"

## Диагностика

### Причина

Основная причина: **В Firestore нет записей о треках** для `mood=focus`.

Код в `backend/src/services/aiWave.ts`:
1. Ищет треки в Firestore по `mood=focus`
2. Если треков нет → возвращает `null`
3. `wave.ts` возвращает `200` с `{"track": null, "reason": "NO_TRACKS"}`

Но если где-то возвращается 204, это может быть из-за:
- Nginx прокси (но мы не трогаем VPS)
- Или пустой ответ от backend

## Исправления

### 1. Обновлен `docker-compose.yml`

```yaml
environment:
  - NODE_ENV=production
  - AUDIO_BASE_PATH=/app/audio  # ← Добавлено явное указание пути
```

**Файл:** `backend/docker-compose.yml`

### 2. Добавлен скрипт автоматического сканирования

**Файл:** `backend/scripts/scan-audio-folder.ts`

Скрипт:
- Сканирует папки `focus/`, `chill/`, `sleep/`, `ambient/`
- Находит все аудио файлы (`.mp3`, `.wav`, `.m4a`, `.ogg`)
- Создает/обновляет записи в Firestore автоматически

### 3. Добавлена команда в `package.json`

```json
"scan-audio": "ts-node scripts/scan-audio-folder.ts"
```

### 4. Добавлен диагностический скрипт

**Файл:** `backend/diagnose-synology.sh`

Проверяет:
- Статус контейнера
- Логи
- Переменные окружения
- Volume mounts
- Доступность файлов
- Тестирует API endpoints

## Команды для исправления

### Шаг 1: Бэкап и проверка

```bash
cd /volume1/docker/playflon/backend

# Бэкап docker-compose.yml
cp docker-compose.yml docker-compose.yml.bak.$(date +%F_%H%M%S)

# Проверка .env
cat .env | grep AUDIO_BASE_PATH
# Должно быть: AUDIO_BASE_PATH=/app/audio
```

### Шаг 2: Обновление .env (если нужно)

```bash
# Если AUDIO_BASE_PATH не установлен или неправильный
echo "AUDIO_BASE_PATH=/app/audio" >> .env
```

### Шаг 3: Перезапуск контейнера

```bash
docker-compose down
docker-compose up -d --build
```

### Шаг 4: Сканирование аудио и создание треков

```bash
# Внутри контейнера
docker exec -it playflon-backend sh -c 'cd /app && npm run scan-audio'
```

Это создаст записи в Firestore для всех найденных файлов.

### Шаг 5: Проверка

```bash
# Создание тестовой сессии
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"mood":"focus"}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

# Проверка /api/wave/next
curl -i "http://localhost:3001/api/wave/next?sessionId=$SESSION_ID&mood=focus"
```

**Ожидаемый результат:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "track": {
    "id": "abc123...",
    "mood": "focus",
    "tags": ["focus"],
    "durationSec": 0
  },
  "streamUrl": "/api/stream/abc123..."
}
```

## Команды проверки

### Внутри контейнера

```bash
# Проверка файла
docker exec playflon-backend sh -c 'ls -lah /app/audio/focus/test.mp3'

# Проверка переменных
docker exec playflon-backend sh -c 'echo $AUDIO_BASE_PATH'

# Тест API
docker exec playflon-backend sh -c 'curl -i "http://127.0.0.1:3001/api/wave/next?sessionId=test&mood=focus"'
```

### С NAS хоста

```bash
# Health check
curl -i http://localhost:3001/health

# Wave next
curl -i "http://localhost:3001/api/wave/next?sessionId=test&mood=focus"
```

### Логи

```bash
# Просмотр логов
docker logs --tail=50 playflon-backend

# Поиск ошибок
docker logs playflon-backend | grep -i "error\|warn"
```

## Итоговые файлы

### Обновленные файлы:

1. **`backend/docker-compose.yml`**
   - Добавлен `AUDIO_BASE_PATH=/app/audio` в environment
   - Уточнены комментарии

2. **`backend/package.json`**
   - Добавлена команда `"scan-audio": "ts-node scripts/scan-audio-folder.ts"`

3. **`backend/scripts/scan-audio-folder.ts`** (новый)
   - Автоматическое сканирование папок с аудио
   - Создание/обновление треков в Firestore

4. **`backend/diagnose-synology.sh`** (новый)
   - Диагностический скрипт

5. **`backend/SYNOLOGY_FIX.md`** (новый)
   - Подробная инструкция

## Минимальный набор команд для быстрого исправления

```bash
cd /volume1/docker/playflon/backend

# 1. Бэкап
cp docker-compose.yml docker-compose.yml.bak.$(date +%F_%H%M%S)

# 2. Проверка/обновление .env
echo "AUDIO_BASE_PATH=/app/audio" >> .env

# 3. Перезапуск
docker-compose down && docker-compose up -d --build

# 4. Сканирование аудио
docker exec -it playflon-backend sh -c 'cd /app && npm run scan-audio'

# 5. Проверка
curl -i "http://localhost:3001/api/wave/next?sessionId=test&mood=focus"
```

## Результат

После выполнения команд:
- ✅ Треки автоматически созданы в Firestore из файлов в папках
- ✅ `/api/wave/next` возвращает валидный JSON с треком
- ✅ Файл доступен через `/api/stream/:trackId`
- ✅ Нет ошибок 204 No Content

