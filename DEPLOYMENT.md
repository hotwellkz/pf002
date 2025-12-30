# 🚀 Инструкция по деплою Playflon

## Подготовка Synology NAS

### 1. Создание структуры папок

```bash
mkdir -p /volume1/docker/playflon/audio/{focus,chill,sleep,ambient}
mkdir -p /volume1/docker/playflon/backend
mkdir -p /volume1/docker/playflon/tools
```

### 2. Установка Docker (если не установлен)

Через Synology Package Center установите Docker.

## Backend деплой

### 1. Подготовка файлов

```bash
cd backend
npm install
npm run build
```

### 2. Настройка .env

Создайте файл `backend/.env`:

```env
PORT=3000
FIREBASE_PROJECT_ID=playflon
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@playflon.iam.gserviceaccount.com
AUDIO_BASE_PATH=/volume1/docker/playflon/audio
NODE_ENV=production
```

### 3. Запуск через Docker Compose

```bash
docker-compose up -d
```

Или через Synology Docker UI:
- Создайте контейнер из образа
- Настройте volumes: `/volume1/docker/playflon/audio:/app/audio:ro`
- Настройте порты: `3000:3000`
- Добавьте переменные окружения из .env

## Frontend деплой (Netlify)

### 1. Подготовка проекта

```bash
cd frontend
npm install
```

### 2. Настройка переменных окружения

Firebase credentials уже настроены в коде (`frontend/lib/auth.tsx`), но можно переопределить через Netlify Dashboard.

**Обязательно настройте в Netlify:**
- `NEXT_PUBLIC_API_URL` - URL вашего backend API

### 3. Деплой на Netlify

#### Вариант A: Через Netlify Dashboard

1. Зайдите на [netlify.com](https://netlify.com) и создайте новый сайт
2. Подключите ваш Git репозиторий
3. Настройки сборки:
   - **Build command:** `cd frontend && npm install && npm run build`
   - **Publish directory:** `frontend/.next`
   - **Base directory:** `frontend`
4. Добавьте переменные окружения в **Site settings → Environment variables:**
   - `NEXT_PUBLIC_API_URL` = `http://your-backend-url:3000`
5. Нажмите **Deploy site**

#### Вариант B: Через Netlify CLI

```bash
npm install -g netlify-cli
cd frontend
netlify login
netlify init
# Следуйте инструкциям
netlify deploy --prod
```

### 4. Настройка домена

1. В Netlify Dashboard: **Site settings → Domain management**
2. Добавьте кастомный домен `playflon.com`
3. Настройте DNS записи согласно инструкциям Netlify

### 5. Автоматический деплой

При каждом push в основную ветку репозитория Netlify автоматически:
- Установит зависимости
- Соберёт проект
- Задеплоит новую версию

## Настройка Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Или через Firebase Console:
1. Firestore Database → Rules
2. Вставьте содержимое `firestore.rules`
3. Publish

## Batch импорт SUNO

### 1. Настройка

```bash
cd tools
npm install
```

Создайте `tools/.env`:

```env
SUNO_API_KEY=your-suno-api-key
FIREBASE_PROJECT_ID=playflon
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@playflon.iam.gserviceaccount.com
AUDIO_BASE_PATH=/volume1/docker/playflon/audio
```

### 2. Запуск импорта

```bash
npm run build
npm run import:suno
```

## Настройка прокси (VPS + туннель)

Если backend должен быть доступен через playflon.com:

1. Настройте reverse proxy на VPS (nginx/traefik)
2. Создайте туннель от VPS к Synology (SSH tunnel или WireGuard)
3. Проксируйте запросы к `http://synology-ip:3000`

Пример nginx конфигурации:

```nginx
server {
    listen 80;
    server_name api.playflon.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Проверка работы

1. Backend health check: `http://your-backend-url/health`
2. Frontend: `https://playflon.com`
3. Проверьте логи: `docker logs playflon-backend`

