# Деплой исправления доступа администратора

## ✅ Выполненные изменения

### Изменённый файл:
- `backend/src/middleware/auth.ts`

### Что добавлено:
1. **Массив администраторов** вместо одного email:
   - `hotwellkz@gmail.com` (существующий, сохранён для совместимости)
   - `hotwell.kz@gmail.com` (новый)

2. **Нормализация email** для корректного сравнения:
   - trim() - удаление пробелов
   - toLowerCase() - приведение к нижнему регистру

3. **Логирование для отладки**:
   - Email и UID пользователя (без токенов!)
   - Статус проверки доступа

## 📋 Команды для деплоя на Synology

### Шаг 1: Подключение к Synology

```bash
# SSH подключение к Synology
ssh admin@synology-ip
```

### Шаг 2: Переход в директорию проекта

```bash
cd /volume1/docker/playflon/backend
```

### Шаг 3: Backup текущего кода (рекомендуется)

```bash
# Создать backup
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)
echo "Backup создан"
```

### Шаг 4: Обновление кода

**Вариант A: Если код уже загружен на сервер**

```bash
# Просто пересобрать и перезапустить
docker-compose build --no-cache
docker-compose down
docker-compose up -d
```

**Вариант B: Если нужно загрузить код с локальной машины**

```powershell
# На локальной машине (PowerShell)
cd C:\Users\studo\Downloads\PlayFlon\backend
scp -r src admin@synology-ip:/volume1/docker/playflon/backend/
```

Затем на Synology:
```bash
cd /volume1/docker/playflon/backend
docker-compose build --no-cache
docker-compose down
docker-compose up -d
```

### Шаг 5: Проверка работы

```bash
# Проверить что контейнер запущен
docker-compose ps

# Проверить health endpoint
curl -sS -i http://localhost:3001/health | head -n 5

# Проверить логи (должны быть записи [AUTH])
docker-compose logs --tail 50 backend | grep "\[AUTH\]"
```

## 🧪 Проверка доступа

### 1. Проверка через браузер

1. Открыть `https://playflon.com/admin/upload`
2. Войти через Google с email `hotwell.kz@gmail.com`
3. **Ожидаемый результат**: Страница загрузки открывается, нет сообщения "Доступ запрещён"

### 2. Проверка через API (curl)

```bash
# Получить токен из браузера:
# 1. Открыть DevTools (F12)
# 2. Network tab
# 3. Открыть /admin/upload
# 4. Найти запрос к /api/admin/upload
# 5. Скопировать значение из заголовка Authorization: Bearer <token>

TOKEN="your-firebase-id-token-here"

# Тест доступа (должен вернуть 400 или 200, но НЕ 403)
curl -sS -i \
  -X POST https://api.playflon.com/api/admin/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "mode=focus" \
  -F "files=@test.mp3" | head -n 20
```

**Ожидаемые результаты:**
- ✅ `hotwell.kz@gmail.com` → 200 или 400 (но не 403)
- ✅ `hotwellkz@gmail.com` → 200 или 400 (но не 403)
- ❌ Другой email → 403 Forbidden

### 3. Проверка логов

```bash
# На Synology
docker-compose logs backend | grep "\[AUTH\]"
```

**Ожидаемый вывод:**
```
[AUTH] Проверка доступа: email=hotwell.kz@gmail.com, uid=xxx
[AUTH] Доступ разрешён для администратора: hotwell.kz@gmail.com
```

## 🔄 Откат изменений

### Вариант 1: Git revert (если используется git)

```bash
cd /volume1/docker/playflon/backend
git checkout HEAD -- src/middleware/auth.ts
docker-compose build --no-cache
docker-compose restart
```

### Вариант 2: Восстановление из backup

```bash
cd /volume1/docker/playflon/backend
# Найти последний backup
ls -lt src.backup.* | head -1
# Восстановить
cp src.backup.YYYYMMDD_HHMMSS/middleware/auth.ts src/middleware/auth.ts
docker-compose build --no-cache
docker-compose restart
```

### Вариант 3: Ручное восстановление

Отредактировать `src/middleware/auth.ts` и вернуть:
```typescript
const ALLOWED_EMAIL = 'hotwellkz@gmail.com';
if (decodedToken.email !== ALLOWED_EMAIL) { ... }
```

Затем:
```bash
docker-compose build --no-cache
docker-compose restart
```

## 📊 Итоговый чеклист

- [ ] Код обновлён на Synology
- [ ] Контейнер пересобран (`docker-compose build --no-cache`)
- [ ] Контейнер перезапущен (`docker-compose up -d`)
- [ ] Health check работает (`curl http://localhost:3001/health`)
- [ ] Логи показывают записи `[AUTH]`
- [ ] `hotwell.kz@gmail.com` может открыть `/admin/upload`
- [ ] Другой email получает 403 при попытке доступа

## 🔍 Диагностика проблем

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker-compose logs backend

# Проверить синтаксис TypeScript
cd /volume1/docker/playflon/backend
npm run build
```

### Проблема: Доступ всё ещё запрещён

```bash
# Проверить логи авторизации
docker-compose logs backend | grep "\[AUTH\]"

# Проверить какой email приходит в токене
# В логах должно быть: email=hotwell.kz@gmail.com
```

### Проблема: 502 Bad Gateway

```bash
# Проверить что контейнер запущен
docker-compose ps

# Проверить порт
netstat -tuln | grep 3001

# Проверить nginx на VPS
ssh shortsai-vps "curl -I http://10.9.0.2:3001/health"
```

## 📝 Изменённые файлы

1. `backend/src/middleware/auth.ts` - добавлен новый администратор
2. `backend/ADMIN_ACCESS_FIX.md` - документация изменений (новый файл)
3. `ADMIN_ACCESS_DEPLOY.md` - этот файл (новый)

## ✅ Definition of Done

- [x] Код изменён только в backend
- [x] Фронтенд не тронут
- [x] Nginx не изменён
- [x] Порты не изменены
- [x] Авторизация Firebase сохранена
- [x] Добавлен `hotwell.kz@gmail.com` в список администраторов
- [x] Сохранён существующий `hotwellkz@gmail.com`
- [x] Добавлено логирование для отладки
- [x] Код компилируется без ошибок
- [x] Создана документация по деплою


