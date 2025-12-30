import { Router, Request, Response } from 'express';
import { db } from '../config/firebase';
import { Mood } from '../types';

export const sessionRouter = Router();

interface StartSessionBody {
  mood: Mood;
  uid?: string;
}

sessionRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { mood, uid }: StartSessionBody = req.body;

    if (!mood || !['focus', 'chill', 'sleep', 'ambient'].includes(mood)) {
      return res.status(400).json({ error: 'Неверное настроение' });
    }

    // Создаём новую сессию
    const sessionRef = await db.collection('sessions').add({
      uid: uid || 'anon',
      mood,
      lastTrackIds: [],
      likedTags: [],
      skippedTags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ sessionId: sessionRef.id });
  } catch (error) {
    console.error('Ошибка создания сессии:', error);
    res.status(500).json({ error: 'Ошибка создания сессии' });
  }
});








