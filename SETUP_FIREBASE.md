# 🔥 Настройка Firebase для Playflon

## ✅ Что уже настроено

Firebase credentials уже встроены в код:
- Frontend: `frontend/lib/auth.tsx` содержит все необходимые credentials
- Project ID: `playflon`

## 📋 Что нужно сделать вручную

### 1. Включить Google Authentication

1. Зайдите в [Firebase Console](https://console.firebase.google.com)
2. Выберите проект `playflon`
3. Перейдите в **Authentication** → **Sign-in method**
4. Нажмите на **Google**
5. Включите переключатель и сохраните
6. Укажите email для поддержки (опционально)

### 2. Создать Firestore Database

1. В Firebase Console перейдите в **Firestore Database**
2. Нажмите **Create database**
3. Выберите режим:
   - **Production mode** (рекомендуется)
   - Или **Test mode** для разработки
4. Выберите регион (ближайший к вам)
5. Нажмите **Enable**

### 3. Задеплоить Firestore Rules

```bash
# Установите Firebase CLI (если еще не установлен)
npm install -g firebase-tools

# Войдите в Firebase
firebase login

# Инициализируйте проект (если еще не сделано)
firebase init firestore

# Задеплойте rules
firebase deploy --only firestore:rules
```

Или через Firebase Console:
1. Firestore Database → **Rules**
2. Скопируйте содержимое файла `firestore.rules` из корня проекта
3. Вставьте в редактор правил
4. Нажмите **Publish**

### 4. Создать индексы (опционально)

Если Firestore запросит создать индексы:

```bash
firebase deploy --only firestore:indexes
```

Или через Firebase Console:
1. Firestore Database → **Indexes**
2. Создайте индексы согласно `firestore.indexes.json`

### 5. Настроить Authorized Domains

Для работы авторизации добавьте домены:

1. Authentication → **Settings** → **Authorized domains**
2. Добавьте:
   - `localhost` (для разработки)
   - `your-site.netlify.app` (ваш Netlify домен)
   - `playflon.com` (ваш кастомный домен)

### 6. Получить Service Account Key (для Backend)

Для работы backend нужен Service Account:

1. Firebase Console → **Project Settings** → **Service accounts**
2. Нажмите **Generate new private key**
3. Скачайте JSON файл
4. Откройте файл и скопируйте:
   - `private_key` → `FIREBASE_PRIVATE_KEY` в backend/.env
   - `client_email` → `FIREBASE_CLIENT_EMAIL` в backend/.env
   - `project_id` → `FIREBASE_PROJECT_ID` в backend/.env (должно быть `playflon`)

**Важно:** При копировании `private_key` сохраните форматирование с `\n`:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## ✅ Проверка настройки

### Frontend
1. Откройте http://localhost:3000
2. Нажмите "Войти через Google"
3. Должна открыться форма авторизации Google
4. После входа должен отображаться ваш email

### Backend
1. Запустите backend: `cd backend && npm start`
2. Проверьте health: `curl http://localhost:3000/health`
3. Должен вернуться: `{"status":"ok","timestamp":"..."}`

### Firestore
1. В Firebase Console → Firestore Database
2. Попробуйте создать тестовый документ вручную
3. Должны работать правила из `firestore.rules`

## 🔐 Безопасность

- ✅ Firestore Rules настроены для защиты данных
- ✅ Service Account Key хранится только на backend (никогда не отправляется на frontend)
- ✅ Firebase API Key безопасен для публичного использования (ограничен доменами)

## 📚 Дополнительная информация

- [Firebase Authentication документация](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Service Accounts](https://firebase.google.com/docs/admin/setup)







