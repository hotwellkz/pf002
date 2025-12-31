# Инструкция по установке Firebase Custom Claim для администратора

## Что было сделано

### 1. Обновлён backend middleware (`backend/src/middleware/auth.ts`)
- ✅ Добавлена проверка custom claim `admin: true` (приоритет)
- ✅ Сохранена проверка email allowlist (fallback)
- ✅ Добавлено логирование claims для диагностики

### 2. Обновлён фронтенд (`frontend/app/admin/upload/page.tsx`)
- ✅ Добавлена проверка custom claims через `getIdTokenResult()`
- ✅ Сохранена проверка email (fallback)
- ✅ Используется `useEffect` для асинхронной проверки

### 3. Создан скрипт для установки claims (`backend/scripts/set-admin-claim.ts`)
- ✅ Находит пользователя по email
- ✅ Устанавливает custom claim `admin: true`
- ✅ Сохраняет существующие claims

## Установка Custom Claim

### Вариант 1: Через скрипт на Synology (рекомендуется)

```bash
# На Synology
cd /volume1/docker/playflon/backend

# Убедитесь что .env файл существует и содержит Firebase credentials
ls -la .env

# Запустить скрипт
npm run set-admin-claim -- hotwell.kz@gmail.com
```

### Вариант 2: Через Node.js скрипт в контейнере

```bash
# На Synology
cd /volume1/docker/playflon/backend

# Войти в контейнер
sudo /usr/local/bin/docker exec -it playflon-backend sh

# В контейнере
cd /app
npm run set-admin-claim -- hotwell.kz@gmail.com
```

### Вариант 3: Через интерактивный Node.js

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker exec -it playflon-backend node

# В Node.js REPL:
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const auth = admin.auth();
auth.getUserByEmail('hotwell.kz@gmail.com')
  .then(user => {
    console.log('User found:', user.uid, user.email);
    return auth.setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log('Custom claim set successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
```

## Проверка установки

### 1. Проверить что claim установлен

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker exec -it playflon-backend node

# В Node.js:
const admin = require('firebase-admin');
// ... инициализация как выше ...
const auth = admin.auth();
auth.getUserByEmail('hotwell.kz@gmail.com')
  .then(user => {
    console.log('Custom claims:', user.customClaims);
    process.exit(0);
  });
```

**Ожидаемый результат:**
```
Custom claims: { admin: true }
```

### 2. Проверить логи backend

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker compose logs --tail 50 backend | grep "\[AUTH\]"
```

**После входа пользователя должно быть:**
```
[AUTH] Проверка доступа: email=hotwell.kz@gmail.com, uid=xxx, admin=true, claims={"admin":true}
[AUTH] Доступ разрешён для администратора: hotwell.kz@gmail.com (custom claim)
```

## Важно: Обновление токена

После установки custom claim пользователь **ОБЯЗАТЕЛЬНО** должен:
1. Полностью выйти из аккаунта на `playflon.com`
2. Закрыть все вкладки с playflon.com
3. Зайти снова через Google

Только после этого новый токен будет содержать custom claim.

## Откат Custom Claim

### Удалить claim (оставить пустым):

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker exec -it playflon-backend node

# В Node.js:
const admin = require('firebase-admin');
// ... инициализация ...
const auth = admin.auth();
auth.getUserByEmail('hotwell.kz@gmail.com')
  .then(user => {
    return auth.setCustomUserClaims(user.uid, null);
  })
  .then(() => {
    console.log('Custom claim removed');
    process.exit(0);
  });
```

### Или установить admin=false:

```bash
auth.setCustomUserClaims(user.uid, { admin: false });
```

## Проверка работы

### 1. Через браузер:
1. Выйти из аккаунта на playflon.com
2. Закрыть все вкладки
3. Открыть `https://playflon.com/admin/upload`
4. Войти через Google с `hotwell.kz@gmail.com`
5. **Ожидаемый результат**: Страница открывается без "Доступ запрещён"

### 2. Через API (curl):

```bash
# Получить токен из браузера (DevTools -> Network -> запрос -> Headers -> Authorization)
TOKEN="your-firebase-id-token"

# Проверить доступ
curl -sS -i \
  -X POST https://api.playflon.com/api/admin/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "mode=focus" \
  -F "files=@test.mp3" | head -n 20
```

**Ожидаемый результат**: 200 или 400 (но не 403)

## Изменённые файлы

1. **backend/src/middleware/auth.ts**
   - Добавлена проверка `decodedToken.admin` и `customClaims.admin`
   - Приоритет: custom claim > email allowlist
   - Улучшено логирование

2. **frontend/app/admin/upload/page.tsx**
   - Добавлена проверка через `getIdTokenResult()`
   - Проверка claims и email (fallback)
   - Используется `useEffect` для асинхронной проверки

3. **backend/scripts/set-admin-claim.ts** (новый)
   - Скрипт для установки custom claim

4. **backend/package.json**
   - Добавлен скрипт `set-admin-claim`

## Команды для деплоя

### Backend на Synology:

```bash
# Загрузить обновлённые файлы
ssh shortsai "cd /volume1/docker/playflon/backend && ..."

# Пересобрать и перезапустить
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker compose build --no-cache
sudo /usr/local/bin/docker compose down
sudo /usr/local/bin/docker compose up -d
```

### Frontend на Netlify:
- Автоматический деплой при push в репозиторий
- Или вручную через Netlify Dashboard

## Troubleshooting

### Проблема: Claim установлен, но доступ всё ещё запрещён

**Решение:**
1. Убедитесь что пользователь полностью вышел и зашёл снова
2. Проверьте логи backend - должно быть `admin=true`
3. Проверьте что токен обновился (в DevTools -> Application -> Local Storage)

### Проблема: Скрипт не находит пользователя

**Решение:**
1. Убедитесь что пользователь хотя бы раз входил через Google
2. Проверьте правильность email: `hotwell.kz@gmail.com` (не hotmail, не без gmail)
3. Проверьте Firebase credentials в `.env`

### Проблема: Ошибка при установке claim

**Решение:**
1. Проверьте что Firebase Admin SDK инициализирован правильно
2. Проверьте права service account в Firebase Console
3. Проверьте логи ошибок в консоли

