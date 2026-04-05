// Firebase Admin SDK Configuration (Server-side & Production Resilience)
import { initializeApp, getApps, cert, getApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Singleton-style getter for the Firebase Admin App.
 * Ensures the app is initialized exactly once, using the best available credentials.
 */
function getEnsuredApp(): App {
    const currentApps = getApps();
    const defaultApp = currentApps.find(a => a.name === '[DEFAULT]');
    
    if (defaultApp) return defaultApp;

    const privateKey = process.env.SERVICE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.SERVICE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.SERVICE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    try {
        if (privateKey && clientEmail && projectId) {
            console.log('Firebase Admin: Initializing with Service Account credentials');
            const formattedKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
            return initializeApp({
                credential: cert({ projectId, clientEmail, privateKey: formattedKey }),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        } else {
            console.log('Firebase Admin: Initializing with Zero-Config (GCP Default Credentials)');
            return initializeApp();
        }
    } catch (error: any) {
        // Handle race conditions where app might have been initialized between check and call
        const retryApps = getApps();
        const retryDefault = retryApps.find(a => a.name === '[DEFAULT]');
        if (retryDefault) return retryDefault;
        
        console.error('Firebase Admin: Initialization failure:', error.message);
        throw error;
    }
}

/**
 * Handcrafted proxies for Firebase services to ensure initialization on any access.
 * We use Proxy to intercept all method calls (like .verifyIdToken, .collection, etc)
 * and ensure the Firebase App is initialized before delegating the call.
 */
export const adminAuth: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const auth = getAuth(app);
        const value = (auth as any)[prop];
        return typeof value === 'function' ? value.bind(auth) : value;
    }
});

export const adminDb: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || '(default)';
        const db = getFirestore(app, databaseId);
        // Apply settings once
        try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
        const value = (db as any)[prop];
        return typeof value === 'function' ? value.bind(db) : value;
    }
});

export const adminStorage: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const storage = getStorage(app);
        const value = (storage as any)[prop];
        return typeof value === 'function' ? value.bind(storage) : value;
    }
});

export const adminApp: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const value = (app as any)[prop];
        return typeof value === 'function' ? value.bind(app) : value;
    }
});
