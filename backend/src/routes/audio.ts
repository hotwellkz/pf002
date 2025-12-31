import { Router, Request, Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';
import { getAudioBasePath } from '../utils/fileSystem';

export const audioRouter = Router();

/**
 * GET /audio/:mode/:filename
 * Раздаёт аудио файлы напрямую из папки на Synology
 */
audioRouter.get('/:mode/:filename', (req: Request, res: Response) => {
  try {
    const { mode, filename } = req.params;

    // Проверяем валидность режима
    if (!['focus', 'chill', 'sleep', 'ambient'].includes(mode)) {
      return res.status(400).json({ error: 'Неверный режим' });
    }

    // Безопасность: проверяем что filename не содержит путь (path traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Неверное имя файла' });
    }

    const basePath = getAudioBasePath();
    const filePath = join(basePath, mode, filename);

    // Проверяем существование файла
    let stats;
    try {
      stats = statSync(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    // Определяем MIME тип по расширению
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
    };
    const contentType = mimeTypes[ext || ''] || 'audio/mpeg';

    // Поддержка HTTP Range requests для стриминга
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      });

      file.pipe(res);
    } else {
      // Полный файл
      const file = createReadStream(filePath);

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      });

      file.pipe(res);
    }
  } catch (error) {
    console.error('Ошибка раздачи аудио:', error);
    res.status(500).json({ error: 'Ошибка раздачи аудио' });
  }
});


