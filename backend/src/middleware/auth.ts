import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

const ALLOWED_EMAIL = 'hotwellkz@gmail.com';

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

    // Проверяем email в allowlist
    if (decodedToken.email !== ALLOWED_EMAIL) {
      res.status(403).json({ 
        error: 'Доступ запрещён',
        message: 'Только администратор может выполнять эту операцию'
      });
      return;
    }

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

