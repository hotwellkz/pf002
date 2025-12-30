# 🔧 Исправление конфликта портов

## Проблема

Next.js dev server и backend оба пытаются использовать порт 3000, что вызывает конфликт. Next.js перехватывает запросы к `/api/*` и возвращает 404.

## Решение: Изменить порт backend на 3001

### 1. Обновите `backend/.env`

Измените порт на 3001:

```env
PORT=3001
FIREBASE_PROJECT_ID=playflon
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@playflon.iam.gserviceaccount.com
AUDIO_BASE_PATH=/volume1/docker/playflon/audio
NODE_ENV=production
```

### 2. Обновите `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Перезапустите оба сервера

**Backend:**
```bash
cd backend
# Остановите текущий процесс (Ctrl+C)
npm run dev
```

Должно быть:
```
✅ Firebase Admin инициализирован
🚀 Playflon Backend запущен на порту 3001
```

**Frontend:**
```bash
cd frontend
# Остановите текущий процесс (Ctrl+C)
npm run dev
```

### 4. Проверка

1. Backend health check:
```bash
curl http://localhost:3001/health
```

2. В браузере DevTools (F12) → Console проверьте:
   - `API URL: http://localhost:3001`
   - `Full URL: http://localhost:3001/api/session/start`

3. Попробуйте создать сессию снова

## Альтернативное решение

Если хотите оставить backend на 3000, измените порт Next.js:

В `frontend/package.json` добавьте в scripts:
```json
"dev": "next dev -p 3002"
```

Тогда:
- Next.js: `http://localhost:3002`
- Backend: `http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3000`

Но первый вариант (backend на 3001) проще и стандартнее.








