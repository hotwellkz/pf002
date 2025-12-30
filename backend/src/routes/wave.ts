import { Router, Request, Response } from 'express';
import { aiWaveService } from '../services/aiWave';
import { Mood } from '../types';

export const waveRouter = Router();

waveRouter.get('/next', async (req: Request, res: Response) => {
  try {
    const { sessionId, mood } = req.query;
    console.log(`📡 Запрос /api/wave/next: mood=${mood}, sessionId=${sessionId}`);

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId обязателен' });
    }

    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({ error: 'mood обязателен' });
    }

    if (!['focus', 'chill', 'sleep', 'ambient'].includes(mood)) {
      return res.status(400).json({ error: 'Неверное настроение' });
    }

    const track = await aiWaveService.getNextTrack(
      sessionId,
      mood as Mood
    );

    console.log('🎵 Найден трек:', track ? track.id : 'не найден');

    if (!track) {
      // Возвращаем 200 с явным указанием отсутствия трека
      return res.status(200).json({
        track: null,
        streamUrl: null,
        reason: 'NO_TRACKS',
      });
    }

    // Обновляем историю сессии
    await aiWaveService.updateSessionHistory(sessionId, track.id);

    // Всегда возвращаем согласованный контракт
    res.status(200).json({
      track: {
        id: track.id,
        mood: track.mood,
        tags: track.tags || [],
        durationSec: track.durationSec || 0,
      },
      streamUrl: `/api/stream/${track.id}`,
    });
  } catch (error) {
    console.error('Ошибка получения трека:', error);
    res.status(500).json({ error: 'Ошибка получения трека' });
  }
});

