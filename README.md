# 🎧 Playflon — AI-музыкальный стриминг

MVP продукта для бесконечного потока AI-музыки.

## 📁 Структура проекта

```
PlayFlon/
├── backend/          # Node.js + Express API
├── frontend/         # Next.js приложение
├── tools/            # Batch скрипты (SUNO импорт)
└── docker-compose.yml
```

## 🚀 Быстрый старт

### Локальная разработка

#### 1. Создайте структуру папок для аудио

```bash
# В корне проекта
mkdir -p audio/focus
mkdir -p audio/chill
mkdir -p audio/sleep
mkdir -p audio/ambient
```

#### 2. Поместите тестовые MP3 файлы

Например:
```
audio/
  └── focus/
      └── test.mp3
```

#### 3. Backend

```bash
cd backend
npm install
cp env.example.txt .env
# В .env укажите:
# AUDIO_BASE_PATH=../audio
# PORT=3001
npm run dev
```

#### 4. Frontend

```bash
cd frontend
npm install
# Создайте .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

### Production (Synology)

#### 1. Backend (Docker на Synology)

```bash
cd backend
npm install
cp env.example.txt .env
# В .env укажите:
# AUDIO_BASE_PATH=/volume1/docker/playflon/audio
# PORT=3001
docker-compose up -d
```

### 2. Frontend (Netlify)

```bash
cd frontend
npm install
cp env.local.example.txt .env.local
# Заполните NEXT_PUBLIC_API_URL в .env.local (Firebase уже настроен)
npm run build
```

**Деплой на Netlify:**
1. Подключите репозиторий к Netlify
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Добавьте переменные окружения в Netlify Dashboard (если нужно переопределить)
5. Деплой автоматически запустится при push в репозиторий

### 3. Batch импорт SUNO

```bash
cd tools
npm install
cp .env.example .env
# Заполните SUNO_API_KEY
npm run import:suno
```

## 🔧 Конфигурация

### Backend .env
```
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
AUDIO_BASE_PATH=/volume1/docker/playflon/audio
```

### Frontend .env.local (для локальной разработки)

Firebase credentials уже настроены в коде. Для локальной разработки нужно указать только:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Примечание:** Backend по умолчанию запускается на порту 3000 (можно изменить в `backend/.env`).

Для Netlify добавьте переменную `NEXT_PUBLIC_API_URL` в Netlify Dashboard с URL вашего production backend.

## 📦 Структура хранения аудио

```
/volume1/docker/playflon/
├── audio/
│   ├── focus/
│   ├── chill/
│   ├── sleep/
│   └── ambient/
├── backend/
└── tools/
```

## 🔐 Firestore Rules

См. `firestore.rules` в корне проекта. Деплой правил:

```bash
firebase deploy --only firestore:rules
```

## 📝 API Endpoints

### POST /api/session/start
Создаёт новую сессию прослушивания.

**Body:**
```json
{
  "mood": "focus",
  "uid": "optional-user-id"
}
```

**Response:**
```json
{
  "sessionId": "session-id"
}
```

### GET /api/wave/next
Получает следующий трек для сессии.

**Query:**
- `sessionId` - ID сессии
- `mood` - Настроение (focus/chill/sleep/ambient)

**Response:**
```json
{
  "track": {
    "id": "track-id",
    "mood": "focus",
    "tags": ["electronic", "upbeat"],
    "durationSec": 120
  },
  "streamUrl": "/api/stream/track-id"
}
```

### GET /api/stream/:trackId
Стримит аудиофайл с поддержкой HTTP Range requests.

**Headers:**
- `Range: bytes=0-` (опционально)

### POST /api/events
Сохраняет событие пользователя (play/like/skip).

**Body:**
```json
{
  "sessionId": "session-id",
  "trackId": "track-id",
  "type": "like",
  "uid": "optional-user-id"
}
```

## 🎯 Логика AI-Wave

Алгоритм выбора следующего трека:

1. Фильтрация по настроению (mood)
2. Исключение последних 20 треков из истории сессии
3. Подсчёт score на основе:
   - +2 за каждый лайкнутый тег
   - -1 за каждый пропущенный тег
4. Выбор из топ-3 треков с положительным score
5. Если нет предпочтений — случайный выбор
6. Обновление истории сессии

## 📚 Дополнительная документация

См. `DEPLOYMENT.md` для подробных инструкций по деплою.

