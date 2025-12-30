/**
 * Скрипт для автоматического сканирования папки с аудио
 * и создания записей в Firestore для всех найденных файлов
 */

import dotenv from 'dotenv';
dotenv.config();

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { initializeFirebase, db } from '../src/config/firebase';
import { getAudioBasePath } from '../src/utils/fileSystem';
import { Mood } from '../src/types';

const MOODS: Mood[] = ['focus', 'chill', 'sleep', 'ambient'];
const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg'];

interface AudioFile {
  mood: Mood;
  fileName: string;
  filePath: string;
  fullPath: string;
  size: number;
}

/**
 * Сканирует папку с аудио и возвращает список файлов
 */
function scanAudioFolder(): AudioFile[] {
  const audioBasePath = getAudioBasePath();
  const files: AudioFile[] = [];

  console.log(`📁 Сканирование папки: ${audioBasePath}`);

  for (const mood of MOODS) {
    const moodPath = join(audioBasePath, mood);
    
    try {
      if (!statSync(moodPath).isDirectory()) {
        console.warn(`⚠️  ${moodPath} не является директорией, пропускаем`);
        continue;
      }

      const entries = readdirSync(moodPath);
      
      for (const entry of entries) {
        const fullPath = join(moodPath, entry);
        const stat = statSync(fullPath);
        
        if (stat.isFile()) {
          const ext = entry.substring(entry.lastIndexOf('.')).toLowerCase();
          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            files.push({
              mood,
              fileName: entry,
              filePath: `${mood}/${entry}`,
              fullPath,
              size: stat.size,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Ошибка при сканировании ${moodPath}:`, error);
    }
  }

  return files;
}

/**
 * Создает или обновляет трек в Firestore
 */
async function upsertTrack(file: AudioFile): Promise<void> {
  // Ищем существующий трек по filePath
  const existingTracks = await db
    .collection('tracks')
    .where('filePath', '==', file.filePath)
    .where('mood', '==', file.mood)
    .get();

  const trackData = {
    mood: file.mood,
    filePath: file.filePath,
    tags: [file.mood], // Базовый тег - настроение
    durationSec: 0, // Можно добавить парсинг метаданных позже
    prompt: `Auto-imported: ${file.fileName}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!existingTracks.empty) {
    // Обновляем существующий трек
    const existingDoc = existingTracks.docs[0];
    await existingDoc.ref.update({
      ...trackData,
      updatedAt: new Date(),
    });
    console.log(`✅ Обновлен трек: ${existingDoc.id} (${file.filePath})`);
  } else {
    // Создаем новый трек
    const newDoc = await db.collection('tracks').add(trackData);
    console.log(`✅ Создан трек: ${newDoc.id} (${file.filePath})`);
  }
}

/**
 * Главная функция
 */
async function main() {
  try {
    console.log('🚀 Начало сканирования аудио папки...\n');

    // Инициализируем Firebase
    initializeFirebase();
    console.log('✅ Firebase инициализирован\n');

    const files = scanAudioFolder();
    console.log(`\n📊 Найдено файлов: ${files.length}\n`);

    if (files.length === 0) {
      console.warn('⚠️  Файлы не найдены. Проверьте:');
      console.warn('   1. AUDIO_BASE_PATH установлен правильно');
      console.warn('   2. Папки focus/chill/sleep/ambient существуют');
      console.warn('   3. В папках есть файлы с расширениями:', SUPPORTED_EXTENSIONS.join(', '));
      process.exit(1);
    }

    // Группируем по настроениям
    const byMood = files.reduce((acc, file) => {
      if (!acc[file.mood]) acc[file.mood] = [];
      acc[file.mood].push(file);
      return acc;
    }, {} as Record<Mood, AudioFile[]>);

    console.log('📋 Найденные файлы по настроениям:');
    for (const mood of MOODS) {
      const count = byMood[mood]?.length || 0;
      console.log(`   ${mood}: ${count} файлов`);
    }

    console.log('\n💾 Создание/обновление треков в Firestore...\n');

    // Создаем/обновляем треки
    for (const file of files) {
      await upsertTrack(file);
    }

    console.log(`\n✅ Готово! Обработано ${files.length} файлов`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main();
}

