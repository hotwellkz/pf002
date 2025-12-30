'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Mood, Track } from '@/types';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ListenPage() {
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

  useEffect(() => {
    if (!sessionId || !mood) {
      router.push('/');
      return;
    }

    loadNextTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, mood]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      loadNextTrack();
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentTrack]);

  const loadNextTrack = async () => {
    if (!sessionId || !mood) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/wave/next`, {
        params: { sessionId, mood },
      });

      const { track, streamUrl: url } = response.data;
      setCurrentTrack(track);
      setStreamUrl(`${API_URL}${url}`);

      // Отправляем событие play
      await axios.post(`${API_URL}/api/events`, {
        sessionId,
        trackId: track.id,
        type: 'play',
        uid: user?.uid,
      });

      // Автоматически начинаем воспроизведение
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    } catch (err: any) {
      console.error('Ошибка загрузки трека:', err);
      setError('Не удалось загрузить трек');
    } finally {
      setLoading(false);
    }
  };

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
    if (!sessionId || !currentTrack) return;

    await axios.post(`${API_URL}/api/events`, {
      sessionId,
      trackId: currentTrack.id,
      type: 'skip',
      uid: user?.uid,
    });

    loadNextTrack();
  };

  const handleLike = async () => {
    if (!sessionId || !currentTrack) return;

    await axios.post(`${API_URL}/api/events`, {
      sessionId,
      trackId: currentTrack.id,
      type: 'like',
      uid: user?.uid,
    });
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
            <div className="text-red-400 text-center mb-4">{error}</div>
          )}

          {loading && (
            <div className="text-center text-gray-400 mb-4">Загрузка трека...</div>
          )}

          <audio
            ref={audioRef}
            src={streamUrl || undefined}
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

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

