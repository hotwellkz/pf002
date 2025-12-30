import { Router, Request, Response } from 'express';
import { db } from '../config/firebase';
import { aiWaveService } from '../services/aiWave';

export const eventsRouter = Router();

interface EventBody {
  sessionId: string;
  trackId: string;
  type: 'play' | 'like' | 'skip';
  uid?: string;
}

eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, trackId, type, uid }: EventBody = req.body;

    if (!sessionId || !trackId || !type) {
      return res.status(400).json({ error: 'Недостаточно данных' });
    }

    if (!['play', 'like', 'skip'].includes(type)) {
      return res.status(400).json({ error: 'Неверный тип события' });
    }

    // Сохраняем событие в Firestore
    await db.collection('userEvents').add({
      uid: uid || 'anon',
      trackId,
      type,
      sessionId,
      createdAt: new Date(),
    });

    // Обновляем предпочтения для like/skip
    if (type === 'like' || type === 'skip') {
      await aiWaveService.updateUserPreferences(sessionId, trackId, type);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка сохранения события:', error);
    res.status(500).json({ error: 'Ошибка сохранения события' });
  }
});




