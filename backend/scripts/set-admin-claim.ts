#!/usr/bin/env ts-node
/**
 * Скрипт для установки custom claim admin=true для пользователя
 * Использование: npm run set-admin-claim -- hotwell.kz@gmail.com
 */

import dotenv from 'dotenv';
import * as path from 'path';
import { initializeFirebase, auth } from '../src/config/firebase';

// Загружаем переменные окружения
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

async function setAdminClaim(email: string) {
  try {
    // Инициализируем Firebase Admin
    initializeFirebase();
    console.log('✅ Firebase Admin инициализирован');

    // Находим пользователя по email
    console.log(`🔍 Поиск пользователя с email: ${email}`);
    const userRecord = await auth.getUserByEmail(email);

    console.log(`✅ Пользователь найден:`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Текущие custom claims:`, userRecord.customClaims || 'нет');

    // Устанавливаем custom claim admin=true
    console.log(`\n🔧 Установка custom claim admin=true...`);
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      ...(userRecord.customClaims || {}), // Сохраняем существующие claims
    });

    // Проверяем что claim установлен
    const updatedUser = await auth.getUser(userRecord.uid);
    console.log(`\n✅ Custom claim установлен:`);
    console.log(`   Новые custom claims:`, updatedUser.customClaims);

    console.log(`\n📝 ВАЖНО: Пользователь должен полностью выйти и зайти снова, чтобы токен обновился!`);
    console.log(`   После этого custom claim будет доступен в токене.`);

    return userRecord.uid;
  } catch (error) {
    console.error('❌ Ошибка:', error);
    if (error instanceof Error) {
      if (error.message.includes('no user record')) {
        console.error(`   Пользователь с email ${email} не найден в Firebase Auth.`);
        console.error(`   Убедитесь, что пользователь хотя бы раз входил через Google.`);
      }
    }
    throw error;
  }
}

// Получаем email из аргументов командной строки
const email = process.argv[2];

if (!email) {
  console.error('❌ Ошибка: не указан email');
  console.error('Использование: npm run set-admin-claim -- hotwell.kz@gmail.com');
  process.exit(1);
}

// Проверяем формат email
if (!email.includes('@')) {
  console.error('❌ Ошибка: неверный формат email');
  process.exit(1);
}

setAdminClaim(email)
  .then((uid) => {
    console.log(`\n✅ Готово! UID пользователя: ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Не удалось установить custom claim');
    process.exit(1);
  });

