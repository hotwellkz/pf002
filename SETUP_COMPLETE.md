# ✅ Playflon — Полная настройка завершена

## 🎉 Что уже готово

### ✅ Firebase Credentials
- **Frontend:** Встроены в `frontend/lib/auth.tsx`
- **Backend:** Настроены в `backend/.env`
- **Tools:** Настроены в `tools/.env`
- **Project ID:** `playflon`
- **Service Account:** `firebase-adminsdk-fbsvc@playflon.iam.gserviceaccount.com`

### ✅ Конфигурация
- Все `.env` файлы созданы с правильными credentials
- Firebase credentials встроены в frontend код
- Netlify конфигурация готова
- Docker конфигурация готова

## 🚀 Быстрый старт

### 1. Backend (локально для теста)

```bash
cd backend
npm install
# .env уже создан с правильными credentials
npm run build
npm start
```

**Для Synology:**
```bash
# Измените AUDIO_BASE_PATH в .env на:
AUDIO_BASE_PATH=/volume1/docker/playflon/audio

# Затем соберите и запустите через Docker:
docker-compose up -d
```

### 2. Frontend (локально)

```bash
cd frontend
npm install
# Создайте .env.local только с API URL:
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm run dev
```

Откройте http://localhost:3000

### 3. Tools (SUNO импорт)

```bash
cd tools
npm install
# .env уже создан, нужно только добавить SUNO_API_KEY:
# Отредактируйте tools/.env и добавьте ваш SUNO_API_KEY
npm run build
npm run import:suno
```

## 📋 Что нужно сделать в Firebase Console

### 1. Включить Google Authentication
1. [Firebase Console](https://console.firebase.google.com) → Проект `playflon`
2. **Authentication** → **Sign-in method**
3. Включите **Google** и сохраните

### 2. Создать Firestore Database
1. **Firestore Database** → **Create database**
2. Выберите **Production mode**
3. Выберите регион
4. **Enable**

### 3. Задеплоить Firestore Rules
```bash
firebase login
firebase deploy --only firestore:rules
```

Или через Firebase Console:
1. **Firestore Database** → **Rules**
2. Скопируйте содержимое `firestore.rules`
3. Вставьте и нажмите **Publish**

### 4. Настроить Authorized Domains
1. **Authentication** → **Settings** → **Authorized domains**
2. Добавьте:
   - `localhost` (для разработки)
   - `your-site.netlify.app` (ваш Netlify домен)
   - `playflon.com` (ваш кастомный домен)

## 🌐 Деплой на Netlify

### 1. Подключите репозиторий
1. Зайдите на [netlify.com](https://netlify.com)
2. **Add new site** → **Import an existing project**
3. Выберите ваш Git провайдер и репозиторий

### 2. Настройки сборки
- **Base directory:** `frontend`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `.next`

Или используйте автоматическую настройку через `netlify.toml` (уже настроен).

### 3. Переменные окружения
В Netlify Dashboard → **Site settings** → **Environment variables** добавьте:

```
NEXT_PUBLIC_API_URL = http://your-backend-url:3000
```

Firebase credentials уже встроены в код, дополнительная настройка не требуется.

### 4. Деплой
Нажмите **Deploy site**. Netlify автоматически соберёт и задеплоит проект.

## 🔐 Безопасность

⚠️ **Важно:**
- Файлы `.env` содержат приватные ключи — **НЕ коммитьте их в Git**
- Убедитесь, что `.env` файлы в `.gitignore`
- Для production используйте переменные окружения в Netlify/Docker

## ✅ Проверка работы

### Backend
```bash
curl http://localhost:3000/health
# Должен вернуть: {"status":"ok","timestamp":"..."}
```

### Frontend
1. Откройте http://localhost:3000
2. Нажмите "Войти через Google"
3. Должна открыться форма авторизации
4. После входа должен отображаться ваш email

### Firestore
1. В Firebase Console → Firestore Database
2. Попробуйте создать тестовый документ
3. Должны работать правила из `firestore.rules`

## 📚 Дополнительная документация

- `README.md` — основная документация
- `QUICKSTART.md` — быстрый старт
- `DEPLOYMENT.md` — подробный гайд по деплою
- `NETLIFY_DEPLOY.md` — инструкция для Netlify
- `SETUP_FIREBASE.md` — настройка Firebase
- `PROJECT_STRUCTURE.md` — структура проекта

## 🎯 Следующие шаги

1. ✅ Настройте Firebase Console (Authentication, Firestore, Rules)
2. ✅ Запустите backend локально для теста
3. ✅ Запустите frontend локально для теста
4. ✅ Задеплойте backend на Synology
5. ✅ Задеплойте frontend на Netlify
6. ✅ Настройте кастомный домен `playflon.com`
7. ✅ Запустите batch импорт SUNO для генерации треков

**Всё готово к работе! 🚀**









