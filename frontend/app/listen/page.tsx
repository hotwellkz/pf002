'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Mood, Track } from '@/types';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';

function ListenPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const sessionId = searchParams.get('sessionId');
  const mood = searchParams.get('mood') as Mood;

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const loadNextTrack = useCallback(async () => {
    if (!sessionId || !mood) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/wave/next`, {
        params: { sessionId, mood },
      });

      console.log('wave next status', response.status);
      console.log('wave next data', response.data);

      // Проверяем статус ответа
      if (!response.data) {
        setError('Пустой ответ от сервера');
        setLoading(false);
        return;
      }

      const { track, streamUrl: url, reason } = response.data || {};

      // Обработка случая когда треков нет
      if (!track || !url || reason === 'NO_TRACKS') {
        setError('Нет доступных треков для этого настроения');
        setCurrentTrack(null);
        setStreamUrl(null);
        setLoading(false);
        return;
      }

      // Валидация обязательных полей
      if (!track || !track.id || !url) {
        console.error('Bad API response:', { track, url, responseData: response.data });
        setError('Некорректный ответ от сервера');
        setCurrentTrack(null);
        setStreamUrl(null);
        setLoading(false);
        return;
      }

      // Безопасное построение URL
      if (!API_URL) {
        console.error('API_URL is undefined');
        setError('Ошибка конфигурации: API URL не определен');
        setLoading(false);
        return;
      }

      const apiBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const streamPath = url.startsWith('/') ? url : `/${url}`;
      const fullStreamUrl = `${apiBase}${streamPath}`;

      console.log('Setting stream URL:', fullStreamUrl);

      setCurrentTrack(track);
      setStreamUrl(fullStreamUrl);

      // Отправляем событие play только если трек валиден
      try {
        await axios.post(`${API_URL}/api/events`, {
          sessionId,
          trackId: track.id,
          type: 'play',
          uid: user?.uid,
        });
      } catch (eventErr) {
        console.warn('Не удалось отправить событие play:', eventErr);
        // Не блокируем воспроизведение из-за ошибки события
      }

      // Автоматически начинаем воспроизведение только если URL валиден
      setTimeout(() => {
        if (audioRef.current && fullStreamUrl) {
          audioRef.current.play().catch((playErr) => {
            console.error('Ошибка воспроизведения:', playErr);
            setError('Не удалось воспроизвести трек');
            setIsPlaying(false);
          });
          setIsPlaying(true);
        }
      }, 100);
    } catch (err: any) {
      console.error('Ошибка загрузки трека:', err);
      
      // Обработка различных типов ошибок
      if (err.response) {
        const status = err.response.status;
        if (status === 204) {
          setError('Нет доступных треков');
        } else if (status === 400) {
          setError(err.response.data?.error || 'Неверный запрос');
        } else if (status >= 500) {
          setError('Ошибка сервера. Попробуйте позже');
        } else {
          setError(err.response.data?.error || 'Ошибка загрузки трека');
        }
      } else if (err.request) {
        setError('Не удалось подключиться к серверу');
      } else {
        setError('Неожиданная ошибка');
      }
      
      setCurrentTrack(null);
      setStreamUrl(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, mood, user?.uid]);

  useEffect(() => {
    if (!sessionId || !mood) {
      router.push('/');
      return;
    }

    loadNextTrack();
  }, [sessionId, mood, router, loadNextTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      loadNextTrack();
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentTrack, loadNextTrack]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSkip = async () => {
    if (!sessionId || !currentTrack || !currentTrack.id) return;

    try {
      await axios.post(`${API_URL}/api/events`, {
        sessionId,
        trackId: currentTrack.id,
        type: 'skip',
        uid: user?.uid,
      });
    } catch (err) {
      console.warn('Не удалось отправить событие skip:', err);
      // Продолжаем даже если событие не отправилось
    }

    loadNextTrack();
  };

  const handleLike = async () => {
    if (!sessionId || !currentTrack || !currentTrack.id) return;

    try {
      await axios.post(`${API_URL}/api/events`, {
        sessionId,
        trackId: currentTrack.id,
        type: 'like',
        uid: user?.uid,
      });
    } catch (err) {
      console.warn('Не удалось отправить событие like:', err);
    }
  };

  if (!sessionId || !mood) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-white mb-8 transition-colors"
        >
          ← Назад
        </button>

        <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {mood === 'focus' && '🎯'}
              {mood === 'chill' && '🌊'}
              {mood === 'sleep' && '🌙'}
              {mood === 'ambient' && '🌌'}
            </div>
            <h2 className="text-2xl font-semibold mb-2 capitalize">{mood}</h2>
            {currentTrack && (
              <div className="text-sm text-gray-400">
                {currentTrack.tags.join(', ')}
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-center mb-4 p-3 bg-red-900/20 rounded-lg">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-gray-400 mb-4">Загрузка трека...</div>
          )}

          {!loading && !error && !currentTrack && (
            <div className="text-center text-gray-400 mb-4 p-3 bg-gray-800/50 rounded-lg">
              Нет доступных треков для этого настроения
            </div>
          )}

          {streamUrl && (
            <audio
              ref={audioRef}
              src={streamUrl}
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => {
                console.error('Ошибка загрузки аудио:', e);
                setError('Ошибка загрузки аудио файла');
                setIsPlaying(false);
              }}
            />
          )}

          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={handleSkip}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              title="Пропустить"
            >
              ⏭️
            </button>
            <button
              onClick={handlePlayPause}
              disabled={!streamUrl || loading}
              className="p-6 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={handleLike}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              title="Лайк"
            >
              👍
            </button>
          </div>

          {currentTrack && (
            <div className="text-center text-sm text-gray-500">
              Длительность: {Math.floor(currentTrack.durationSec / 60)}:
              {String(currentTrack.durationSec % 60).padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ListenPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center">
        <div className="text-gray-400">Загрузка...</div>
      </main>
    }>
      <ListenPageContent />
    </Suspense>
  );
}

