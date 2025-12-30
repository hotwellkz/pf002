# ⚡ Быстрый старт Playflon

## Минимальная настройка для тестирования

### 1. Firebase настройка

✅ **Firebase уже настроен!** Credentials встроены в код.

Но нужно:
1. Включить Authentication → Google Provider в [Firebase Console](https://console.firebase.google.com)
2. Создать Firestore Database
3. Задеплоить Firestore Rules: `firebase deploy --only firestore:rules`
4. Для backend: скачать Service Account Key (Settings → Service Accounts)

### 2. Backend (локально для теста)

```bash
cd backend
npm install
cp .env.example .env
# Заполните .env с данными из Firebase Service Account
npm run build
npm start
```

**Важно:** Для локального теста измените `AUDIO_BASE_PATH` на локальную папку:
```env
AUDIO_BASE_PATH=./test-audio
mkdir -p test-audio/{focus,chill,sleep,ambient}
```

### 3. Frontend (локально)

```bash
cd frontend
npm install
# Firebase уже настроен в коде, создайте .env.local только для API URL:
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm run dev
```

Откройте http://localhost:3000

**Примечание:** Firebase credentials уже встроены в `frontend/lib/auth.tsx`, дополнительная настройка не требуется.

### 4. Тестовые данные

Для тестирования без SUNO API, создайте тестовый трек вручную:

```bash
# В Firestore Console создайте документ в коллекции "tracks":
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

### 5. Проверка работы

1. Откройте http://localhost:3000
2. Войдите через Google
3. Выберите настроение "Focus"
4. Нажмите "Play"
5. Должен начаться стриминг тестового трека

## Troubleshooting

### Backend не запускается
- Проверьте .env файл
- Убедитесь, что Firebase credentials корректны
- Проверьте логи: `npm run dev` (в режиме разработки)

### Frontend не подключается к Backend
- Проверьте `NEXT_PUBLIC_API_URL` в .env.local
- Убедитесь, что backend запущен на указанном порту
- Проверьте CORS настройки в backend

### Аудио не проигрывается
- Проверьте, что файл существует по пути `filePath`
- Проверьте права доступа к файлу
- Убедитесь, что backend имеет доступ к папке с аудио

### Firestore ошибки
- Проверьте firestore.rules (должны быть задеплоены)
- Убедитесь, что Authentication включена
- Проверьте индексы в firestore.indexes.json

