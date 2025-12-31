# Деплой системы Custom Claims для администратора

## ✅ Что сделано

### 1. Backend (`backend/src/middleware/auth.ts`)
- ✅ Добавлена проверка custom claim `admin: true` (приоритет)
- ✅ Сохранена проверка email allowlist (fallback)
- ✅ Улучшено логирование: email, uid, admin claim, custom claims

### 2. Frontend (`frontend/app/admin/upload/page.tsx`)
- ✅ Добавлена проверка custom claims через `getIdTokenResult()`
- ✅ Сохранена проверка email (fallback)
- ✅ Асинхронная проверка через `useEffect`

### 3. Скрипт установки claims (`backend/scripts/set-admin-claim.ts`)
- ✅ Находит пользователя по email
- ✅ Устанавливает `admin: true` в custom claims
- ✅ Сохраняет существующие claims

### 4. Package.json
- ✅ Добавлен скрипт `set-admin-claim`

## 📋 Команды для деплоя

### Шаг 1: Загрузить файлы на Synology

```powershell
# На локальной машине (PowerShell)
cd C:\Users\studo\Downloads\PlayFlon

# Загрузить обновлённые файлы
Get-Content backend\src\middleware\auth.ts | ssh shortsai "cat > /volume1/docker/playflon/backend/src/middleware/auth.ts"
Get-Content backend\scripts\set-admin-claim.ts | ssh shortsai "mkdir -p /volume1/docker/playflon/backend/scripts && cat > /volume1/docker/playflon/backend/scripts/set-admin-claim.ts"
Get-Content backend\package.json | ssh shortsai "cat > /volume1/docker/playflon/backend/package.json"
```

### Шаг 2: Пересобрать backend на Synology

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker compose build --no-cache
sudo /usr/local/bin/docker compose down
sudo /usr/local/bin/docker compose up -d
```

### Шаг 3: Установить custom claim

```bash
# На Synology
cd /volume1/docker/playflon/backend

# Вариант A: Через npm скрипт (если node_modules установлены)
npm run set-admin-claim -- hotwell.kz@gmail.com

# Вариант B: Через контейнер
sudo /usr/local/bin/docker exec -it playflon-backend sh
cd /app
npm run set-admin-claim -- hotwell.kz@gmail.com
exit
```

### Шаг 4: Проверить установку claim

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
auth.getUserByEmail('hotwell.kz@gmail.com').then(u => {
  console.log('Custom claims:', u.customClaims);
  process.exit(0);
});
```

**Ожидаемый результат:**
```
Custom claims: { admin: true }
```

### Шаг 5: Деплой фронтенда

Фронтенд обновляется автоматически при push в репозиторий (Netlify) или вручную через Netlify Dashboard.

## 🔍 Проверка работы

### 1. Проверить логи backend

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

### 2. Проверить через браузер

1. **ВАЖНО**: Полностью выйти из аккаунта на playflon.com
2. Закрыть все вкладки с playflon.com
3. Открыть `https://playflon.com/admin/upload`
4. Войти через Google с `hotwell.kz@gmail.com`
5. **Ожидаемый результат**: Страница открывается без "Доступ запрещён"

## 🔄 Откат изменений

### Откат custom claim:

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker exec -it playflon-backend node

# В Node.js:
const admin = require('firebase-admin');
// ... инициализация как выше ...
const auth = admin.auth();
auth.getUserByEmail('hotwell.kz@gmail.com')
  .then(user => auth.setCustomUserClaims(user.uid, null))
  .then(() => {
    console.log('Custom claim removed');
    process.exit(0);
  });
```

### Откат кода (git):

```bash
cd /volume1/docker/playflon/backend
git checkout HEAD -- src/middleware/auth.ts
sudo /usr/local/bin/docker compose build --no-cache
sudo /usr/local/bin/docker compose restart
```

## 📝 Изменённые файлы

1. **backend/src/middleware/auth.ts** - проверка custom claims
2. **frontend/app/admin/upload/page.tsx** - проверка claims на клиенте
3. **backend/scripts/set-admin-claim.ts** - скрипт установки (новый)
4. **backend/package.json** - добавлен скрипт

## ⚠️ Важно

1. **Токен обновляется только после повторного входа** - пользователь должен полностью выйти и зайти снова
2. **Email проверка остаётся как fallback** - если claim не установлен, работает проверка email
3. **Логирование временное** - можно оставить для мониторинга или убрать позже

