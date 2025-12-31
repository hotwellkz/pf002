import { Router, Request, Response } from 'express';
import multer from 'multer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { db } from '../config/firebase';
import { getAudioBasePath } from '../utils/fileSystem';
import { requireAuth } from '../middleware/auth';
import { Mood } from '../types';

export const adminRouter = Router();

// Настройка multer для загрузки файлов в память
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем только аудио файлы
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только аудио файлы'));
    }
  },
});

/**
 * POST /api/admin/upload
 * Загружает аудио файлы в папку на Synology
 */
adminRouter.post(
  '/upload',
  requireAuth,
  upload.array('files', 10), // Максимум 10 файлов за раз
  async (req: Request, res: Response) => {
    try {
      const { mode, title } = req.body;

      if (!mode || !['focus', 'chill', 'sleep', 'ambient'].includes(mode)) {
        return res.status(400).json({ error: 'Неверный режим. Допустимые: focus, chill, sleep, ambient' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Файлы не загружены' });
      }

      const basePath = getAudioBasePath();
      const modePath = join(basePath, mode);

      // Создаём папку режима, если её нет
      if (!existsSync(modePath)) {
        await mkdir(modePath, { recursive: true });
      }

      const uploadedFiles = [];

      for (const file of files) {
        // Нормализуем имя файла: timestamp-safeName.mp3
        const timestamp = Date.now();
        const safeName = file.originalname
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/\s+/g, '_')
          .toLowerCase();
        
        // Сохраняем расширение из оригинального файла или используем .mp3
        const ext = file.originalname.match(/\.[^.]+$/) || ['.mp3'];
        const fileName = `${timestamp}-${safeName}${ext[0]}`;
        const filePath = join(modePath, fileName);
        const relativePath = `${mode}/${fileName}`;

        // Сохраняем файл на диск
        await writeFile(filePath, file.buffer);

        // Создаём запись в Firestore
        const trackTitle = title || file.originalname.replace(/\.[^.]+$/, '');
        const trackRef = await db.collection('tracks').add({
          mood: mode as Mood,
          title: trackTitle,
          filePath: relativePath,
          tags: [],
          durationSec: 0, // Можно добавить определение длительности позже
          enabled: true,
          createdAt: new Date(),
        });

        // Формируем публичный URL
        const publicUrl = `https://api.playflon.com/audio/${relativePath}`;

        uploadedFiles.push({
          id: trackRef.id,
          fileName,
          mode,
          title: trackTitle,
          url: publicUrl,
          size: file.size,
        });
      }

      res.json({
        success: true,
        message: `Загружено файлов: ${uploadedFiles.length}`,
        files: uploadedFiles,
      });
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      res.status(500).json({ 
        error: 'Ошибка загрузки файлов',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
);


