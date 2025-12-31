# 🛠️ Локальная разработка

## Настройка аудио файлов

### 1. Создайте структуру папок

В корне проекта создайте папку `audio`:

```bash
# В корне проекта (PlayFlon/)
mkdir -p audio/focus
mkdir -p audio/chill
mkdir -p audio/sleep
mkdir -p audio/ambient
```

### 2. Поместите тестовые MP3 файлы

Например:
```
PlayFlon/
├── backend/
├── frontend/
└── audio/
    ├── focus/
    │   └── test.mp3
    ├── chill/
    ├── sleep/
    └── ambient/
```

### 3. Настройте backend/.env

```env
PORT=3001
FIREBASE_PROJECT_ID=playflon
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@playflon.iam.gserviceaccount.com
AUDIO_BASE_PATH=../audio
NODE_ENV=development
```

**Важно:** `AUDIO_BASE_PATH=../audio` - относительный путь от `backend/` к `audio/`

### 4. Создайте тестовый трек в Firestore

В Firebase Console → Firestore Database создайте документ в коллекции `tracks`:

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

**Важно:** `filePath` должен быть относительным (например: `focus/test.mp3`), без начального слеша.

### 5. Запустите backend

```bash
cd backend
npm run dev
```

Должно появиться:
```
✅ Firebase Admin инициализирован
📁 AUDIO_BASE_PATH: /absolute/path/to/PlayFlon/audio
🚀 Playflon Backend запущен на порту 3001
```

### 6. Проверка

```bash
# Health check
curl http://localhost:3001/health

# Создание сессии
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d "{\"mood\":\"focus\"}"

# Получение трека (используйте sessionId из предыдущего запроса)
curl "http://localhost:3001/api/wave/next?sessionId=YOUR_SESSION_ID&mood=focus"
```

## Логирование

Backend логирует:
- `📁 AUDIO_BASE_PATH` - при старте
- `📡 Запрос /api/wave/next` - при каждом запросе
- `🔍 Найдено треков для mood: X` - количество треков в Firestore
- `✅ Треков с существующими файлами: X из Y` - количество валидных треков
- `[WARN] Audio file not found, skipping trackId=...` - если файл отсутствует

## Troubleshooting

### Файл не найден

Если видите `[WARN] Audio file not found`:
1. Проверьте, что файл существует по пути `AUDIO_BASE_PATH/filePath`
2. Проверьте права доступа к файлу
3. Убедитесь, что `filePath` в Firestore правильный (относительный, без начального слеша)

### Нет треков

Если получаете HTTP 204:
- В Firestore нет треков для данного настроения
- Или все треки не имеют существующих файлов
- Проверьте логи backend для деталей









