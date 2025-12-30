import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Загружаем переменные окружения ПЕРВЫМ делом
dotenv.config();

// Импортируем Firebase ПОСЛЕ загрузки .env
import { initializeFirebase } from './config/firebase';
import { getAudioBasePath } from './utils/fileSystem';
import { sessionRouter } from './routes/session';
import { waveRouter } from './routes/wave';
import { streamRouter } from './routes/stream';
import { eventsRouter } from './routes/events';
import { adminRouter } from './routes/admin';
import { audioRouter } from './routes/audio';

const app = express();
const PORT = process.env.PORT || 3001; // Изменено на 3001, чтобы избежать конфликта с Next.js

// Инициализация Firebase Admin
try {
  initializeFirebase();
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error);
  process.exit(1);
}

// Проверка и логирование AUDIO_BASE_PATH
try {
  const audioBasePath = getAudioBasePath();
  console.log(`📁 AUDIO_BASE_PATH: ${audioBasePath}`);
} catch (error) {
  console.error('❌ Ошибка настройки AUDIO_BASE_PATH:', error);
  console.error('⚠️  Убедитесь, что AUDIO_BASE_PATH установлен в .env');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes
app.use('/api/session', sessionRouter);
app.use('/api/wave', waveRouter);
app.use('/api/stream', streamRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);
app.use('/audio', audioRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root path handler
app.get('/', (req, res) => {
  res.json({ 
    service: 'Playflon API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      session: '/api/session',
      wave: '/api/wave',
      stream: '/api/stream',
      events: '/api/events'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Playflon Backend запущен на порту ${PORT}`);
});

