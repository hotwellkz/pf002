# Инструкция по загрузке файлов на Synology

## Проблема
Прямое SSH подключение к `10.9.0.2` недоступно (timeout). Это может быть из-за:
- Не активен WireGuard VPN
- SSH не включен на Synology
- Брандмауэр блокирует подключение

## Решение: Альтернативные способы загрузки

### Способ 1: Через File Station (Web UI)

1. Открыть **File Station** в DSM
2. Перейти в `/volume1/docker/playflon/backend/`
3. Загрузить файлы:
   - `src/middleware/auth.ts` → `/volume1/docker/playflon/backend/src/middleware/auth.ts`
   - `ADMIN_ACCESS_FIX.md` → `/volume1/docker/playflon/backend/ADMIN_ACCESS_FIX.md`
   - `ADMIN_ACCESS_DEPLOY.md` → `/volume1/docker/playflon/ADMIN_ACCESS_DEPLOY.md`

### Способ 2: Через SMB/CIFS (Windows Explorer)

1. В Windows Explorer ввести: `\\synology-ip\docker` (или имя шары)
2. Перейти в `playflon/backend/`
3. Скопировать файлы напрямую

### Способ 3: Через VPS (если есть доступ)

Если есть доступ к VPS, можно загрузить через него:

```bash
# На локальной машине
scp backend/src/middleware/auth.ts root@159.255.37.158:/tmp/auth.ts

# На VPS
scp /tmp/auth.ts admin@10.9.0.2:/volume1/docker/playflon/backend/src/middleware/auth.ts
```

### Способ 4: Ручное создание файла на Synology

Если есть доступ к Synology через веб-интерфейс или другой способ:

1. Открыть файл `backend/src/middleware/auth.ts` на Synology
2. Заменить содержимое на:

```typescript
import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

// Список администраторов (email нормализуется при проверке)
const ADMIN_EMAILS = [
  'hotwellkz@gmail.com',
  'hotwell.kz@gmail.com',
];

/**
 * Нормализует email для сравнения (trim, lowercase)
 */
function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Проверяет, является ли email администратором
 */
function isAdminEmail(email: string | undefined | null): boolean {
  const normalized = normalizeEmail(email);
  return ADMIN_EMAILS.some(adminEmail => normalizeEmail(adminEmail) === normalized);
}

/**
 * Middleware для проверки авторизации через Firebase token
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    // Верифицируем токен через Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);

    // Логируем email и uid для отладки (без токена!)
    const userEmail = decodedToken.email || 'no-email';
    const userUid = decodedToken.uid || 'no-uid';
    console.log(`[AUTH] Проверка доступа: email=${userEmail}, uid=${userUid}`);

    // Проверяем email в allowlist (с нормализацией)
    if (!isAdminEmail(decodedToken.email)) {
      console.log(`[AUTH] Доступ запрещён для email: ${userEmail}`);
      res.status(403).json({ 
        error: 'Доступ запрещён',
        message: 'Только администратор может выполнять эту операцию'
      });
      return;
    }

    console.log(`[AUTH] Доступ разрешён для администратора: ${userEmail}`);

    // Добавляем информацию о пользователе в request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(401).json({ error: 'Неверный токен авторизации' });
  }
}
```

## После загрузки файлов

### 1. Пересобрать контейнер

```bash
# На Synology (через SSH или Task Scheduler)
cd /volume1/docker/playflon/backend
docker-compose build --no-cache
docker-compose down
docker-compose up -d
```

### 2. Проверить работу

```bash
# Проверить логи
docker-compose logs --tail 50 backend | grep "\[AUTH\]"

# Проверить health
curl http://localhost:3001/health
```

## Файлы для загрузки

1. **backend/src/middleware/auth.ts** - основной файл с изменениями
2. **backend/ADMIN_ACCESS_FIX.md** - документация (опционально)
3. **ADMIN_ACCESS_DEPLOY.md** - инструкция по деплою (опционально)

## Проверка успешной загрузки

После загрузки и перезапуска контейнера, в логах должны появиться записи:
```
[AUTH] Проверка доступа: email=hotwell.kz@gmail.com, uid=xxx
[AUTH] Доступ разрешён для администратора: hotwell.kz@gmail.com
```


