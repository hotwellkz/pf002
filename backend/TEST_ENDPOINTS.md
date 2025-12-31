# 🧪 Тестирование API endpoints

## Проверка работы backend

### 1. Health check

```bash
curl http://localhost:3001/health
```

Должен вернуть: `{"status":"ok","timestamp":"..."}`

### 2. Создание сессии

```bash
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d "{\"mood\":\"focus\"}"
```

Должен вернуть: `{"sessionId":"..."}`

### 3. Получение следующего трека

```bash
# Используйте sessionId из предыдущего запроса
curl "http://localhost:3001/api/wave/next?sessionId=YOUR_SESSION_ID&mood=focus"
```

## Проблема: 404 на /api/wave/next

Если получаете 404, проверьте:

1. **Backend запущен на правильном порту:**
   ```bash
   netstat -ano | findstr :3001
   ```

2. **В Firestore есть треки:**
   - Откройте Firebase Console
   - Firestore Database → коллекция `tracks`
   - Должны быть документы с полем `mood: "focus"` (или другое настроение)

3. **Проверьте логи backend:**
   - Должны быть сообщения:
     - `📡 Запрос /api/wave/next: ...`
     - `🔍 Найдено треков для focus: X`

## Создание тестового трека

Если треков нет, создайте тестовый трек в Firestore:

```json
{
  "mood": "focus",
  "tags": ["test", "electronic"],
  "durationSec": 120,
  "prompt": "Test track",
  "filePath": "focus/test.mp3",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

И поместите тестовый MP3 файл в:
- Локально: `backend/test-audio/focus/test.mp3`
- Synology: `/volume1/docker/playflon/audio/focus/test.mp3`









