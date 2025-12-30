import dotenv from 'dotenv';
import { initializeFirebase, db } from '../src/config/firebase';

dotenv.config();

async function createTestTrack() {
  try {
    // Инициализируем Firebase
    initializeFirebase();

    // Создаём тестовый трек
    const testTrack = {
      mood: 'focus',
      tags: ['test', 'electronic'],
      durationSec: 120,
      prompt: 'Test track for local development',
      filePath: 'focus/test.mp3',
      createdAt: new Date(),
    };

    console.log('📝 Создание тестового трека в Firestore...');
    console.log('Данные трека:', testTrack);

    const trackRef = await db.collection('tracks').add(testTrack);

    console.log('✅ Тестовый трек создан!');
    console.log(`   Track ID: ${trackRef.id}`);
    console.log(`   Mood: ${testTrack.mood}`);
    console.log(`   File Path: ${testTrack.filePath}`);
    console.log('');
    console.log('⚠️  Убедитесь, что файл существует:');
    console.log(`   ${process.env.AUDIO_BASE_PATH || '../audio'}/${testTrack.filePath}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка создания тестового трека:', error);
    process.exit(1);
  }
}

createTestTrack();




