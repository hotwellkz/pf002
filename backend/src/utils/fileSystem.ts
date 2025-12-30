import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Получает базовый путь к аудио из переменных окружения
 */
export function getAudioBasePath(): string {
  const basePath = process.env.AUDIO_BASE_PATH;
  
  if (!basePath) {
    throw new Error('AUDIO_BASE_PATH не установлен в переменных окружения');
  }

  // Разрешаем относительные пути (для локальной разработки)
  return resolve(basePath);
}

/**
 * Проверяет существование аудиофайла
 * @param filePath - относительный путь (например: "focus/test.mp3")
 * @returns полный путь к файлу, если он существует, иначе null
 */
export function checkAudioFileExists(filePath: string): string | null {
  try {
    const basePath = getAudioBasePath();
    const fullPath = join(basePath, filePath);
    
    if (existsSync(fullPath)) {
      return fullPath;
    }
    
    return null;
  } catch (error) {
    console.error(`[ERROR] Ошибка проверки файла ${filePath}:`, error);
    return null;
  }
}

/**
 * Получает полный путь к аудиофайлу
 * @param filePath - относительный путь (например: "focus/test.mp3")
 * @returns полный путь к файлу
 */
export function getAudioFilePath(filePath: string): string {
  const basePath = getAudioBasePath();
  return join(basePath, filePath);
}







