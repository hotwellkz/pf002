# ✅ Финальный отчёт: Custom Claims для администратора

## Что сделано

### 1. Backend изменения

**Файл:** `backend/src/middleware/auth.ts`

**Изменения:**
- ✅ Добавлена проверка custom claim `admin: true` (приоритет)
- ✅ Сохранена проверка email allowlist (fallback)
- ✅ Добавлено логирование: email, uid, admin claim, custom claims
- ✅ Логи показывают причину доступа: "custom claim" или "email allowlist"

**Код:**
```typescript
const adminClaim = (decodedToken as any).admin || false;
const customClaims = decodedToken.custom_claims || {};
const isAdminByClaim = adminClaim === true || (customClaims as any)?.admin === true;
const isAdminByEmail = isAdminEmail(decodedToken.email);

if (!isAdminByClaim && !isAdminByEmail) {
  // Доступ запрещён
}
```

### 2. Frontend изменения

**Файл:** `frontend/app/admin/upload/page.tsx`

**Изменения:**
- ✅ Добавлена проверка custom claims через `getIdTokenResult()`
- ✅ Сохранена проверка email (fallback)
- ✅ Асинхронная проверка через `useEffect`

**Код:**
```typescript
const token = await user.getIdTokenResult();
const isAdminByClaim = token.claims.admin === true;
const isAdminByEmail = user.email === 'hotwellkz@gmail.com' || user.email === 'hotwell.kz@gmail.com';
return isAdminByClaim || isAdminByEmail;
```

### 3. Скрипт установки claims

**Файл:** `backend/scripts/set-admin-claim.ts` (новый)

**Функционал:**
- Находит пользователя по email
- Устанавливает custom claim `admin: true`
- Сохраняет существующие claims
- Выводит подтверждение

### 4. Package.json

**Добавлен скрипт:**
```json
"set-admin-claim": "ts-node scripts/set-admin-claim.ts"
```

## 📋 Команды для установки Custom Claim

### Вариант 1: Через контейнер (рекомендуется)

```bash
# На Synology
cd /volume1/docker/playflon/backend

# Войти в контейнер
sudo /usr/local/bin/docker exec -it playflon-backend sh

# В контейнере
cd /app
npm run set-admin-claim -- hotwell.kz@gmail.com
```

### Вариант 2: Через Node.js напрямую

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker exec -it playflon-backend node

# В Node.js REPL (скопировать весь блок):
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
    console.log('✅ Custom claim admin=true установлен');
    return auth.getUserByEmail('hotwell.kz@gmail.com');
  })
  .then(user => {
    console.log('Custom claims:', user.customClaims);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
```

## 🔍 Проверка установки

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
    console.log('UID:', user.uid);
    console.log('Email:', user.email);
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
sudo /usr/local/bin/docker compose logs --tail 100 backend | grep "\[AUTH\]"
```

**После входа пользователя должно быть:**
```
[AUTH] Проверка доступа: email=hotwell.kz@gmail.com, uid=xxx, admin=true, claims={"admin":true}
[AUTH] Доступ разрешён для администратора: hotwell.kz@gmail.com (custom claim)
```

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Обновление токена

После установки custom claim пользователь **ОБЯЗАТЕЛЬНО** должен:

1. **Полностью выйти** из аккаунта на `playflon.com`
2. **Закрыть все вкладки** с playflon.com
3. **Зайти снова** через Google

Только после этого новый токен будет содержать custom claim `admin: true`.

## 🧪 Финальная проверка

### Через браузер:
1. Выйти из аккаунта на playflon.com
2. Закрыть все вкладки
3. Открыть `https://playflon.com/admin/upload`
4. Войти через Google с `hotwell.kz@gmail.com`
5. **Ожидаемый результат**: Страница открывается без "Доступ запрещён"

### Через API (curl):

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

## 🔄 Откат Custom Claim

### Удалить claim полностью:

```bash
# На Synology
cd /volume1/docker/playflon/backend
sudo /usr/local/bin/docker exec -it playflon-backend node

# В Node.js:
const admin = require('firebase-admin');
// ... инициализация ...
const auth = admin.auth();
auth.getUserByEmail('hotwell.kz@gmail.com')
  .then(user => auth.setCustomUserClaims(user.uid, null))
  .then(() => {
    console.log('✅ Custom claim удалён');
    process.exit(0);
  });
```

### Установить admin=false:

```bash
auth.setCustomUserClaims(user.uid, { admin: false });
```

## 📝 Изменённые файлы

1. **backend/src/middleware/auth.ts** - проверка custom claims
2. **frontend/app/admin/upload/page.tsx** - проверка claims на клиенте
3. **backend/scripts/set-admin-claim.ts** - скрипт установки (новый)
4. **backend/package.json** - добавлен скрипт `set-admin-claim`

## ✅ Итоговый чеклист

- [x] Backend обновлён для проверки custom claims
- [x] Frontend обновлён для проверки custom claims
- [x] Скрипт установки claims создан
- [x] Файлы загружены на Synology
- [ ] **Custom claim установлен** (выполнить команду выше)
- [ ] **Пользователь вышел и зашёл снова** (обновление токена)
- [ ] **Проверен доступ через браузер** (`/admin/upload` открывается)
- [ ] **Проверены логи backend** (видно `admin=true`)

## 🎯 Результат

После выполнения всех шагов:
- ✅ `hotwell.kz@gmail.com` может открыть `/admin/upload` без ошибки
- ✅ Доступ проверяется через custom claim `admin: true`
- ✅ Email allowlist остаётся как fallback
- ✅ Логи показывают причину доступа

