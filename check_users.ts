
import * as fs from 'fs';
import * as path from 'path';

// Safer env parsing to handle the private key with newlines/escapes
const envPath = path.resolve('.env.local');
let env: any = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            let value = valueParts.join('=');
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key.trim()] = value;
        }
    });
}

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Missing Firebase Admin credentials in .env.local');
    process.exit(1);
}

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function listUsers() {
    console.log('--- User List ---');
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`User ${doc.id}: email=${data.email}, displayName=${data.displayName}`);
    });
}

listUsers().catch(console.error);
