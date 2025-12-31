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

    // Логируем email, uid и claims для отладки (без токена!)
    const userEmail = decodedToken.email || 'no-email';
    const userUid = decodedToken.uid || 'no-uid';
    const adminClaim = (decodedToken as any).admin || false;
    const customClaims = decodedToken.custom_claims || {};
    console.log(`[AUTH] Проверка доступа: email=${userEmail}, uid=${userUid}, admin=${adminClaim}, claims=${JSON.stringify(customClaims)}`);

    // Проверяем custom claim admin=true (приоритет) или email в allowlist (fallback)
    const isAdminByClaim = adminClaim === true || (customClaims as any)?.admin === true;
    const isAdminByEmail = isAdminEmail(decodedToken.email);

    if (!isAdminByClaim && !isAdminByEmail) {
      console.log(`[AUTH] Доступ запрещён: email=${userEmail}, admin claim=${adminClaim}`);
      res.status(403).json({ 
        error: 'Доступ запрещён',
        message: 'Только администратор может выполнять эту операцию'
      });
      return;
    }

    const reason = isAdminByClaim ? 'custom claim' : 'email allowlist';
    console.log(`[AUTH] Доступ разрешён для администратора: ${userEmail} (${reason})`);

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

