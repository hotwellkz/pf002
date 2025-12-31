/**
 * Простой скрипт для создания трека focus/test.mp3 в Firestore
 * Запускается через node (не требует ts-node)
 */

// Загружаем переменные окружения
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Импортируем скомпилированный код
const firebase = require('../dist/config/firebase');

async function createFocusTrack() {
  try {
    console.log('🚀 Инициализация Firebase...');
    firebase.initializeFirebase();
    console.log('✅ Firebase инициализирован\n');

    const trackData = {
      mood: 'focus',
      filePath: 'focus/test.mp3',
      tags: ['focus'],
      durationSec: 0,
      prompt: 'Test track from focus folder',
      createdAt: new Date(),
    };

    console.log('📝 Создание трека в Firestore...');
    console.log('Данные трека:', trackData);

    // Проверяем, существует ли уже такой трек
    const existingTracks = await firebase.db
      .collection('tracks')
      .where('filePath', '==', 'focus/test.mp3')
      .where('mood', '==', 'focus')
      .get();

    if (!existingTracks.empty) {
      const existingDoc = existingTracks.docs[0];
      await existingDoc.ref.update({
        ...trackData,
        updatedAt: new Date(),
      });
      console.log(`✅ Трек обновлен! ID: ${existingDoc.id}`);
    } else {
      const trackRef = await firebase.db.collection('tracks').add(trackData);
      console.log(`✅ Трек создан! ID: ${trackRef.id}`);
    }

    console.log('\n✅ Готово!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

createFocusTrack();

