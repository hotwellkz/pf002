import admin from 'firebase-admin';

let initialized = false;

export function initializeFirebase() {
  if (initialized) {
    return;
  }

  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Firebase credentials не настроены в .env');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }

  initialized = true;
  console.log('✅ Firebase Admin инициализирован');
}

export const db = admin.firestore();









