'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type Mode = 'focus' | 'chill' | 'sleep' | 'ambient';

interface UploadedFile {
  id: string;
  fileName: string;
  mode: string;
  title: string;
  url: string;
  size: number;
}

export default function AdminUploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('focus');
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_EMAIL = 'hotwellkz@gmail.com';

  // Проверка доступа
  if (!authLoading && (!user || user.email !== ALLOWED_EMAIL)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещён</h1>
          <p className="text-gray-400 mb-4">
            Только администратор может загружать треки
          </p>
          {!user && (
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Вернуться на главную
            </button>
          )}
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Загрузка...</div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Выберите файлы для загрузки');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Получаем токен Firebase
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Не удалось получить токен авторизации');
      }

      // Создаём FormData
      const formData = new FormData();
      formData.append('mode', mode);
      if (title) {
        formData.append('title', title);
      }
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Отправляем запрос
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.playflon.com';
      const response = await fetch(`${apiUrl}/api/admin/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файлов');
      }

      const data = await response.json();
      setUploadedFiles(data.files || []);
      setFiles([]);
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Загрузка треков</h1>
          <p className="text-gray-400">
            Загрузите аудио файлы для PlayFlon. Файлы будут сохранены на Synology.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Режим
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            >
              <option value="focus">Focus</option>
              <option value="chill">Chill</option>
              <option value="sleep">Sleep</option>
              <option value="ambient">Ambient</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Название трека (опционально)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название трека"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Если не указано, будет использовано имя файла
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Файлы (MP3, WAV и др.)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*"
              onChange={handleFileSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {files.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-400">
                  Выбрано файлов: {files.length}
                </p>
                <ul className="text-sm text-gray-300 mt-1">
                  {files.map((file, idx) => (
                    <li key={idx}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded transition"
          >
            {uploading ? 'Загрузка...' : 'Загрузить файлы'}
          </button>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Загруженные файлы</h2>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-gray-700 rounded p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{file.title}</p>
                    <p className="text-sm text-gray-400">
                      {file.fileName} • {file.mode} • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Открыть
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white"
          >
            ← Вернуться на главную
          </button>
        </div>
      </div>
    </div>
  );
}

