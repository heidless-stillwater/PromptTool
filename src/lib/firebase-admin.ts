// Firebase Admin SDK Configuration (Server-side only)
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;
let adminStorage: Storage;

if (!getApps().length) {
    adminApp = initializeApp({
        credential: cert(serviceAccount as any),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
} else {
    adminApp = getApps()[0];
}

adminAuth = getAuth(adminApp);
// Use named database
adminDb = getFirestore(adminApp, databaseId);
adminStorage = getStorage(adminApp);

export { adminApp, adminAuth, adminDb, adminStorage };
