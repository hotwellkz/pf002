# Исправление доступа администратора

## Изменения

**Файл:** `backend/src/middleware/auth.ts`

**Что изменено:**
1. Добавлен `hotwell.kz@gmail.com` в список администраторов
2. Сохранён существующий `hotwellkz@gmail.com` для обратной совместимости
3. Добавлена нормализация email (trim, lowercase) для корректного сравнения
4. Добавлено логирование для отладки (email и uid, без токенов)

**До:**
```typescript
const ALLOWED_EMAIL = 'hotwellkz@gmail.com';
if (decodedToken.email !== ALLOWED_EMAIL) { ... }
```

**После:**
```typescript
const ADMIN_EMAILS = [
  'hotwellkz@gmail.com',
  'hotwell.kz@gmail.com',
];
// С нормализацией и логированием
```

## Деплой на Synology

### 1. Проверка текущего состояния

```bash
# На Synology
cd /volume1/docker/playflon/backend
docker-compose ps
docker-compose logs --tail 50 backend
```

### 2. Обновление кода

```bash
# На Synology
cd /volume1/docker/playflon/backend

# Создать backup текущего кода (опционально)
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Обновить файлы (загрузить обновлённый src/middleware/auth.ts)
# Или скопировать весь обновлённый backend код
```

### 3. Пересборка и перезапуск

```bash
cd /volume1/docker/playflon/backend

# Пересобрать образ
docker-compose build --no-cache

# Перезапустить контейнер
docker-compose down
docker-compose up -d

# Проверить логи
docker-compose logs -f backend
```

### 4. Проверка работы

```bash
# Health check
curl -sS -i http://localhost:3001/health | head -n 5

# Проверить логи авторизации
docker-compose logs backend | grep "\[AUTH\]"
```

## Проверка доступа

### Через браузер:
1. Открыть `https://playflon.com/admin/upload`
2. Войти через Google с email `hotwell.kz@gmail.com`
3. Должен быть доступ к странице загрузки

### Через curl (для тестирования API):

```bash
# Получить токен из браузера (DevTools -> Network -> запрос к /api/admin/upload -> Headers -> Authorization)
TOKEN="your-firebase-id-token-here"

# Проверка доступа (должен вернуть 200 или 400, но не 403)
curl -sS -i \
  -X POST https://api.playflon.com/api/admin/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "mode=focus" \
  -F "files=@test.mp3" | head -n 20
```

## Откат изменений

### Вариант 1: Git revert

```bash
cd /volume1/docker/playflon/backend
git checkout HEAD -- src/middleware/auth.ts
docker-compose build --no-cache
docker-compose restart
```

### Вариант 2: Восстановление из backup

```bash
cd /volume1/docker/playflon/backend
cp src.backup.*/middleware/auth.ts src/middleware/auth.ts
docker-compose build --no-cache
docker-compose restart
```

### Вариант 3: Ручное восстановление

Вернуть в `src/middleware/auth.ts`:
```typescript
const ALLOWED_EMAIL = 'hotwellkz@gmail.com';
if (decodedToken.email !== ALLOWED_EMAIL) { ... }
```

## Логи для отладки

После деплоя в логах будут видны записи:
```
[AUTH] Проверка доступа: email=hotwell.kz@gmail.com, uid=xxx
[AUTH] Доступ разрешён для администратора: hotwell.kz@gmail.com
```

Или при отказе:
```
[AUTH] Проверка доступа: email=other@example.com, uid=yyy
[AUTH] Доступ запрещён для email: other@example.com
```

## Важные замечания

1. **Нормализация email**: Email сравнивается с нормализацией (trim + lowercase), поэтому `HotWell.Kz@Gmail.Com` будет работать корректно
2. **Обратная совместимость**: Старый email `hotwellkz@gmail.com` продолжает работать
3. **Безопасность**: Токены не логируются, только email и uid
4. **Фронтенд не изменён**: Все изменения только в backend middleware


