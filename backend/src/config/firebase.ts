import admin from 'firebase-admin';

let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;

export function initializeFirebase() {
  if (admin.apps.length > 0) {
    // Уже инициализирован
    _db = admin.firestore();
    _auth = admin.auth();
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Firebase credentials не настроены в .env. Проверьте FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });

  _db = admin.firestore();
  _auth = admin.auth();
  console.log('✅ Firebase Admin инициализирован');
}

// Ленивая инициализация - получаем db и auth только после инициализации
function getDb(): admin.firestore.Firestore {
  if (!_db) {
    if (!admin.apps.length) {
      throw new Error('Firebase не инициализирован. Вызовите initializeFirebase() сначала.');
    }
    _db = admin.firestore();
  }
  return _db;
}

function getAuth(): admin.auth.Auth {
  if (!_auth) {
    if (!admin.apps.length) {
      throw new Error('Firebase не инициализирован. Вызовите initializeFirebase() сначала.');
    }
    _auth = admin.auth();
  }
  return _auth;
}

// Экспортируем объекты с геттерами для ленивой инициализации
export const db = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    const dbInstance = getDb();
    const value = (dbInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(dbInstance);
    }
    return value;
  }
}) as admin.firestore.Firestore;

export const auth = new Proxy({} as admin.auth.Auth, {
  get(target, prop) {
    const authInstance = getAuth();
    const value = (authInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(authInstance);
    }
    return value;
  }
}) as admin.auth.Auth;

