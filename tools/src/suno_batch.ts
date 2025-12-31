import dotenv from 'dotenv';
import axios from 'axios';
import { writeFile, ensureDir } from 'fs-extra';
import { join } from 'path';
import { initializeFirebase, db } from './config/firebase';
import { Mood } from './types';

dotenv.config();

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const AUDIO_BASE_PATH = process.env.AUDIO_BASE_PATH || '/volume1/docker/playflon/audio';

interface SunoGenerateRequest {
  prompt: string;
  tags?: string;
  title?: string;
  make_instrumental?: boolean;
  wait_audio?: boolean;
}

interface SunoResponse {
  id: string;
  title: string;
  audio_url: string;
  image_url?: string;
  status?: string;
}

/**
 * Генерирует трек через SUNO API
 */
async function generateTrack(
  prompt: string,
  mood: Mood,
  tags: string[] = []
): Promise<SunoResponse | null> {
  if (!SUNO_API_KEY) {
    throw new Error('SUNO_API_KEY не установлен');
  }

  try {
    const response = await axios.post(
      'https://api.suno.ai/v1/generate',
      {
        prompt,
        tags: tags.join(', '),
        wait_audio: true,
      } as SunoGenerateRequest,
      {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data as SunoResponse;
  } catch (error: any) {
    console.error('Ошибка генерации трека:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Скачивает аудиофайл и сохраняет локально
 */
async function downloadAndSaveAudio(
  audioUrl: string,
  mood: Mood,
  trackId: string
): Promise<string | null> {
  try {
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
    });

    const audioDir = join(AUDIO_BASE_PATH, mood);
    await ensureDir(audioDir);

    const fileName = `track_${trackId}.mp3`;
    const filePath = join(audioDir, fileName);
    const relativePath = `${mood}/${fileName}`;

    await writeFile(filePath, response.data);

    return relativePath;
  } catch (error: any) {
    console.error('Ошибка сохранения аудио:', error.message);
    return null;
  }
}

/**
 * Сохраняет метаданные трека в Firestore
 */
async function saveTrackMetadata(
  sunoId: string,
  mood: Mood,
  prompt: string,
  tags: string[],
  filePath: string,
  durationSec: number
): Promise<string> {
  const trackRef = await db.collection('tracks').add({
    mood,
    tags,
    durationSec,
    prompt,
    filePath,
    sunoId,
    createdAt: new Date(),
  });

  return trackRef.id;
}

/**
 * Основная функция batch-импорта
 */
async function batchImport() {
  console.log('🚀 Начало batch-импорта из SUNO...');

  if (!SUNO_API_KEY) {
    throw new Error('SUNO_API_KEY не установлен в .env');
  }

  initializeFirebase();

  // Примеры промптов для каждого настроения
  const prompts: Record<Mood, { prompt: string; tags: string[] }[]> = {
    focus: [
      { prompt: 'Upbeat electronic music with steady rhythm, perfect for concentration and work', tags: ['electronic', 'upbeat', 'focus'] },
      { prompt: 'Ambient techno with minimal vocals, ideal for deep work sessions', tags: ['techno', 'ambient', 'minimal'] },
      { prompt: 'Lo-fi hip hop beat with smooth piano, background music for productivity', tags: ['lo-fi', 'hip-hop', 'piano'] },
    ],
    chill: [
      { prompt: 'Relaxing acoustic guitar melody with soft strings, peaceful and calming', tags: ['acoustic', 'guitar', 'relaxing'] },
      { prompt: 'Smooth jazz with saxophone, perfect for unwinding after work', tags: ['jazz', 'saxophone', 'smooth'] },
      { prompt: 'Chill electronic beats with ambient pads, laid-back vibes', tags: ['electronic', 'ambient', 'chill'] },
    ],
    sleep: [
      { prompt: 'Very slow ambient music with nature sounds, deep sleep meditation', tags: ['ambient', 'nature', 'meditation'] },
      { prompt: 'Soft piano with rain sounds, peaceful sleep music', tags: ['piano', 'rain', 'sleep'] },
      { prompt: 'Minimal drone music with low frequencies, sleep-inducing soundscape', tags: ['drone', 'minimal', 'low-frequency'] },
    ],
    ambient: [
      { prompt: 'Atmospheric soundscape with ethereal pads, space ambient', tags: ['atmospheric', 'ethereal', 'space'] },
      { prompt: 'Minimal ambient with subtle textures, background atmosphere', tags: ['minimal', 'texture', 'background'] },
      { prompt: 'Drone ambient with evolving tones, immersive sound design', tags: ['drone', 'evolving', 'immersive'] },
    ],
  };

  let successCount = 0;
  let errorCount = 0;

  for (const [mood, moodPrompts] of Object.entries(prompts)) {
    console.log(`\n📀 Обработка настроения: ${mood}`);

    for (const { prompt, tags } of moodPrompts) {
      try {
        console.log(`  Генерация: ${prompt.substring(0, 50)}...`);

        // Генерируем трек
        const sunoResponse = await generateTrack(prompt, mood as Mood, tags);

        if (!sunoResponse || !sunoResponse.audio_url) {
          console.error('  ❌ Не удалось сгенерировать трек');
          errorCount++;
          continue;
        }

        // Скачиваем и сохраняем аудио
        const filePath = await downloadAndSaveAudio(
          sunoResponse.audio_url,
          mood as Mood,
          sunoResponse.id
        );

        if (!filePath) {
          console.error('  ❌ Не удалось сохранить аудио');
          errorCount++;
          continue;
        }

        // Сохраняем метаданные (примерная длительность, можно улучшить)
        const durationSec = 120; // По умолчанию, можно парсить из метаданных SUNO

        const trackId = await saveTrackMetadata(
          sunoResponse.id,
          mood as Mood,
          prompt,
          tags,
          filePath,
          durationSec
        );

        console.log(`  ✅ Трек сохранён: ${trackId} (${filePath})`);
        successCount++;

        // Небольшая задержка между запросами
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`  ❌ Ошибка: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n✅ Batch-импорт завершён:`);
  console.log(`   Успешно: ${successCount}`);
  console.log(`   Ошибок: ${errorCount}`);
}

// Запуск
if (require.main === module) {
  batchImport().catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
}

export { batchImport };









