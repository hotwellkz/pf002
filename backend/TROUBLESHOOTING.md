# 🔧 Troubleshooting Backend

## Проблема: "Firebase не инициализирован"

### Решение 1: Проверьте .env файл

Убедитесь, что файл `backend/.env` существует и содержит:

```env
PORT=3000
FIREBASE_PROJECT_ID=playflon
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCUpFrCRTNWHwN+\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@playflon.iam.gserviceaccount.com
AUDIO_BASE_PATH=./test-audio
NODE_ENV=development
```

**Важно:**
- `FIREBASE_PRIVATE_KEY` должен быть в кавычках
- `\n` должны быть буквальными (не реальными переносами строк)
- Для локальной разработки используйте `AUDIO_BASE_PATH=./test-audio`

### Решение 2: Создайте .env из примера

```bash
cd backend
cp env.example.txt .env
# Для локальной разработки измените AUDIO_BASE_PATH:
# AUDIO_BASE_PATH=./test-audio
```

### Решение 3: Проверьте загрузку переменных

Добавьте в `backend/src/index.ts` перед `initializeFirebase()`:

```typescript
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
```

Если переменные не загружаются, проверьте:
- Файл `.env` находится в папке `backend/`
- Нет опечаток в названиях переменных
- `dotenv.config()` вызывается ДО импорта Firebase

## Проблема: "Cannot find module dist/index.js"

### Решение: Соберите проект

```bash
cd backend
npm run build
npm start
```

Или используйте режим разработки:

```bash
npm run dev
```

## Проблема: Аудио файлы не найдены

### Для локальной разработки:

1. Создайте папку для тестовых аудио:
```bash
cd backend
mkdir -p test-audio/focus
mkdir -p test-audio/chill
mkdir -p test-audio/sleep
mkdir -p test-audio/ambient
```

2. Обновите `.env`:
```env
AUDIO_BASE_PATH=./test-audio
```

3. Поместите тестовый MP3 файл в `test-audio/focus/test.mp3`

4. Создайте тестовый трек в Firestore:
```json
{
  "mood": "focus",
  "tags": ["test"],
  "durationSec": 120,
  "prompt": "Test track",
  "filePath": "focus/test.mp3",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Проверка работы

1. Запустите backend:
```bash
npm run dev
```

2. Проверьте health endpoint:
```bash
curl http://localhost:3000/health
```

Должен вернуть: `{"status":"ok","timestamp":"..."}`

3. Проверьте логи - должно быть:
```
✅ Firebase Admin инициализирован
🚀 Playflon Backend запущен на порту 3000
```




