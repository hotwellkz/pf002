import { db } from '../config/firebase';
import { Track, Mood } from '../types';
import { checkAudioFileExists } from '../utils/fileSystem';

interface SessionData {
  lastTrackIds: string[];
  likedTags: string[];
  skippedTags: string[];
}

export class AIWaveService {
  /**
   * Выбирает следующий трек на основе настроения и истории сессии
   */
  async getNextTrack(sessionId: string, mood: Mood): Promise<Track | null> {
    // Получаем данные сессии
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    const sessionData = sessionDoc.data() as SessionData | undefined;

    const lastTrackIds = sessionData?.lastTrackIds || [];
    const likedTags = sessionData?.likedTags || [];
    const skippedTags = sessionData?.skippedTags || [];

    // Получаем все треки для данного настроения
    const tracksSnapshot = await db
      .collection('tracks')
      .where('mood', '==', mood)
      .get();

    console.log(`🔍 Найдено треков для ${mood}:`, tracksSnapshot.size); // Отладка

    if (tracksSnapshot.empty) {
      console.warn(`⚠️ Нет треков в Firestore для настроения ${mood}`);
      return null;
    }

    const allTracks: Track[] = tracksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Track[];

    // Фильтруем треки: исключаем последние 20 И проверяем существование файлов
    const availableTracks = allTracks.filter((track) => {
      // Исключаем последние 20 треков
      if (lastTrackIds.includes(track.id)) {
        return false;
      }

      // Проверяем существование файла
      if (!track.filePath) {
        console.warn(`[WARN] Track ${track.id} не имеет filePath, пропускаем`);
        return false;
      }

      const fileExists = checkAudioFileExists(track.filePath);
      if (!fileExists) {
        console.warn(`[WARN] Audio file not found, skipping trackId=${track.id}, filePath=${track.filePath}`);
        return false;
      }

      return true;
    });

    console.log(`✅ Треков с существующими файлами для ${mood}: ${availableTracks.length} из ${allTracks.length}`);

    if (availableTracks.length === 0) {
      // Если все треки уже проиграны или файлы отсутствуют, пробуем все треки снова
      const allTracksWithFiles = allTracks.filter((track) => {
        if (!track.filePath) return false;
        return checkAudioFileExists(track.filePath) !== null;
      });

      if (allTracksWithFiles.length === 0) {
        console.warn(`⚠️ Нет треков с существующими файлами для настроения ${mood}`);
        return null;
      }

      console.log(`🔄 Все треки проиграны, сбрасываем историю. Доступно треков: ${allTracksWithFiles.length}`);
      return this.selectRandomTrack(allTracksWithFiles);
    }

    // Простая логика выбора на основе тегов
    const scoredTracks = availableTracks.map((track) => {
      let score = 0;

      // Повышаем шанс треков с лайкнутыми тегами
      track.tags.forEach((tag) => {
        if (likedTags.includes(tag)) {
          score += 2;
        }
        if (skippedTags.includes(tag)) {
          score -= 1;
        }
      });

      return { track, score };
    });

    // Сортируем по score (высокий приоритет)
    scoredTracks.sort((a, b) => b.score - a.score);

    // Выбираем из топ-3 или случайный, если данных мало
    if (scoredTracks.length > 0 && scoredTracks[0].score > 0) {
      const topTracks = scoredTracks
        .filter((item) => item.score > 0)
        .slice(0, 3);
      if (topTracks.length > 0) {
        return topTracks[Math.floor(Math.random() * topTracks.length)].track;
      }
    }

    // Если нет предпочтений, случайный выбор
    return this.selectRandomTrack(availableTracks);
  }

  /**
   * Обновляет историю сессии
   */
  async updateSessionHistory(
    sessionId: string,
    trackId: string,
    maxHistory: number = 20
  ): Promise<void> {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    const sessionData = sessionDoc.data();

    const lastTrackIds = sessionData?.lastTrackIds || [];
    const updatedHistory = [trackId, ...lastTrackIds].slice(0, maxHistory);

    await sessionRef.update({
      lastTrackIds: updatedHistory,
      updatedAt: new Date(),
    });
  }

  /**
   * Обновляет предпочтения пользователя на основе событий
   */
  async updateUserPreferences(
    sessionId: string,
    trackId: string,
    type: 'like' | 'skip'
  ): Promise<void> {
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    const sessionData = sessionDoc.data();

    // Получаем теги трека
    const trackDoc = await db.collection('tracks').doc(trackId).get();
    const trackData = trackDoc.data();
    const tags = trackData?.tags || [];

    if (tags.length === 0) return;

    const likedTags = sessionData?.likedTags || [];
    const skippedTags = sessionData?.skippedTags || [];

    if (type === 'like') {
      // Добавляем теги в лайкнутые
      const updatedLikedTags = [
        ...new Set([...likedTags, ...tags]),
      ].slice(0, 50); // Ограничиваем размер

      await sessionRef.update({
        likedTags: updatedLikedTags,
        updatedAt: new Date(),
      });
    } else if (type === 'skip') {
      // Добавляем теги в пропущенные
      const updatedSkippedTags = [
        ...new Set([...skippedTags, ...tags]),
      ].slice(0, 50);

      await sessionRef.update({
        skippedTags: updatedSkippedTags,
        updatedAt: new Date(),
      });
    }
  }

  private selectRandomTrack(tracks: Track[]): Track {
    return tracks[Math.floor(Math.random() * tracks.length)];
  }
}

export const aiWaveService = new AIWaveService();

