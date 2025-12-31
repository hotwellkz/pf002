# 📁 Структура проекта Playflon

```
PlayFlon/
│
├── README.md                    # Основная документация
├── QUICKSTART.md                # Быстрый старт для тестирования
├── DEPLOYMENT.md                # Инструкции по деплою
├── PROJECT_STRUCTURE.md         # Этот файл
├── .gitignore                   # Git ignore правила
├── docker-compose.yml           # Docker Compose для backend
├── firestore.rules              # Firestore security rules
└── firestore.indexes.json       # Firestore индексы
│
├── backend/                     # Node.js + Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .dockerignore
│   ├── .env.example            # Пример конфигурации
│   │
│   └── src/
│       ├── index.ts            # Точка входа
│       ├── config/
│       │   └── firebase.ts     # Firebase Admin инициализация
│       ├── types/
│       │   └── index.ts        # TypeScript типы
│       ├── services/
│       │   └── aiWave.ts       # Логика AI-Wave алгоритма
│       └── routes/
│           ├── session.ts       # POST /api/session/start
│           ├── wave.ts         # GET /api/wave/next
│           ├── stream.ts       # GET /api/stream/:trackId
│           └── events.ts       # POST /api/events
│
├── frontend/                    # Next.js приложение
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .eslintrc.json
│   ├── firebase.json           # Firebase Hosting конфигурация
│   ├── .env.local.example      # Пример конфигурации
│   │
│   └── app/
│       ├── layout.tsx          # Root layout с AuthProvider
│       ├── page.tsx            # Главная страница (выбор настроения)
│       ├── listen/
│       │   └── page.tsx        # Страница проигрывания
│       ├── globals.css         # Глобальные стили (Tailwind)
│   │
│   ├── lib/
│   │   └── auth.tsx            # Firebase Auth контекст
│   │
│   └── types/
│       └── index.ts            # TypeScript типы
│
└── tools/                       # Batch скрипты
    ├── package.json
    ├── tsconfig.json
    ├── .env.example            # Пример конфигурации
    │
    └── src/
        ├── suno_batch.ts       # Импорт треков из SUNO API
        ├── config/
        │   └── firebase.ts     # Firebase Admin инициализация
        └── types.ts            # TypeScript типы
```

## Ключевые компоненты

### Backend (`backend/`)
- **Express API** с TypeScript
- **Firebase Admin SDK** для работы с Firestore
- **AI-Wave сервис** — алгоритм выбора следующего трека
- **Stream роут** — стриминг аудио с поддержкой Range requests
- **Docker** конфигурация для деплоя на Synology

### Frontend (`frontend/`)
- **Next.js 14** с App Router
- **Tailwind CSS** для стилизации
- **Firebase Auth** для авторизации
- **HTML5 Audio API** для воспроизведения
- **Firebase Hosting** для деплоя

### Tools (`tools/`)
- **SUNO Batch импорт** — скрипт для генерации и импорта треков
- Запускается отдельно, не входит в production

## Потоки данных

### 1. Создание сессии
```
User → Frontend → POST /api/session/start → Firestore (sessions)
```

### 2. Получение следующего трека
```
Frontend → GET /api/wave/next → AI-Wave Service → Firestore (tracks) → Response
```

### 3. Стриминг аудио
```
Frontend → GET /api/stream/:trackId → File System (Synology) → HTTP Range Response
```

### 4. События пользователя
```
Frontend → POST /api/events → Firestore (userEvents) → AI-Wave Service (обновление предпочтений)
```

## Хранение данных

### Firestore Collections
- `tracks/` — метаданные треков
- `sessions/` — сессии прослушивания
- `userEvents/` — события (play/like/skip)
- `users/` — данные пользователей

### File System (Synology)
```
/volume1/docker/playflon/audio/
├── focus/
│   └── track_*.mp3
├── chill/
│   └── track_*.mp3
├── sleep/
│   └── track_*.mp3
└── ambient/
    └── track_*.mp3
```

## Переменные окружения

### Backend (.env)
- `PORT` — порт сервера
- `FIREBASE_PROJECT_ID` — ID Firebase проекта
- `FIREBASE_PRIVATE_KEY` — приватный ключ Service Account
- `FIREBASE_CLIENT_EMAIL` — email Service Account
- `AUDIO_BASE_PATH` — путь к папке с аудио

### Frontend (.env.local)
- `NEXT_PUBLIC_FIREBASE_*` — конфигурация Firebase Web App
- `NEXT_PUBLIC_API_URL` — URL backend API

### Tools (.env)
- `SUNO_API_KEY` — API ключ SUNO
- `FIREBASE_*` — те же что и в backend
- `AUDIO_BASE_PATH` — путь к папке с аудио









