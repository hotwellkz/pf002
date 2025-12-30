import { Router, Request, Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { db } from '../config/firebase';
import { getAudioFilePath } from '../utils/fileSystem';

export const streamRouter = Router();

streamRouter.get('/:trackId', async (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;

    // Получаем метаданные трека из Firestore
    const trackDoc = await db.collection('tracks').doc(trackId).get();
    
    if (!trackDoc.exists) {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    const trackData = trackDoc.data();
    const filePath = trackData?.filePath;

    if (!filePath) {
      console.error(`[ERROR] Track ${trackId} не имеет filePath`);
      return res.status(404).json({ error: 'Файл трека не найден в метаданных' });
    }

    // Полный путь к файлу
    const fullPath = getAudioFilePath(filePath);

    // Проверяем существование файла
    let stats;
    try {
      stats = statSync(fullPath);
    } catch (error) {
      console.error(`[ERROR] Audio file not found: ${fullPath} for trackId=${trackId}`);
      return res.status(404).json({ error: 'Аудиофайл не найден на сервере' });
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    // Поддержка HTTP Range requests для стриминга
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = createReadStream(fullPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
      });

      file.pipe(res);
    } else {
      // Полный файл
      const file = createReadStream(fullPath);

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
      });

      file.pipe(res);
    }
  } catch (error) {
    console.error('Ошибка стриминга:', error);
    res.status(500).json({ error: 'Ошибка стриминга аудио' });
  }
});

