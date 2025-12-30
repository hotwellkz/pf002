'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Mood } from '@/types';

const moods: { id: Mood; label: string; emoji: string; description: string }[] = [
  { id: 'focus', label: 'Focus', emoji: '🎯', description: 'Для концентрации и работы' },
  { id: 'chill', label: 'Chill', emoji: '🌊', description: 'Для расслабления' },
  { id: 'sleep', label: 'Sleep', emoji: '🌙', description: 'Для сна и медитации' },
  { id: 'ambient', label: 'Ambient', emoji: '🌌', description: 'Атмосферный фон' },
];

export default function Home() {
  const router = useRouter();
  const { user, signIn, signOut } = useAuth();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    if (!selectedMood) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('API URL:', apiUrl); // Отладка
      const fullUrl = `${apiUrl}/api/session/start`;
      console.log('Full URL:', fullUrl); // Отладка
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          uid: user?.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка ответа:', response.status, errorText);
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      router.push(`/listen?sessionId=${data.sessionId}&mood=${selectedMood}`);
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
      alert('Не удалось создать сессию. Убедитесь, что backend запущен на порту 3001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          🎧 Playflon
        </h1>
        <p className="text-gray-400 text-lg mb-12">
          AI-музыкальный стриминг в формате бесконечного потока
        </p>

        {!user ? (
          <div className="mb-8">
            <button
              onClick={signIn}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Войти через Google
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <div className="text-sm text-gray-400 mb-2">
              Вошли как: {user.email}
            </div>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Выйти
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setSelectedMood(mood.id)}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedMood === mood.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="text-4xl mb-2">{mood.emoji}</div>
              <div className="font-semibold text-lg mb-1">{mood.label}</div>
              <div className="text-sm text-gray-400">{mood.description}</div>
            </button>
          ))}
        </div>

        <button
          onClick={handlePlay}
          disabled={!selectedMood || loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Загрузка...' : '▶️ Play'}
        </button>
      </div>
    </main>
  );
}

