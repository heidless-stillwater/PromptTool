
const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function listUserRoles() {
    const envPath = path.resolve('.env.local');
    let env = {};
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=');
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                env[key.trim()] = value;
            }
        });
    }

    const serviceAccount = {
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        console.error('Missing Firebase Admin credentials in .env.local');
        return;
    }

    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }

    console.log('Connecting to Firebase...');
    const db = getFirestore();

    console.log('\n--- User Roles Report ---\n');
    console.log('ID | Email | Display Name | Role');
    console.log('-----------------------------------');

    console.log('Fetching users collection...');
    const snapshot = await db.collection('users').get();
    console.log(`Query completed. Found ${snapshot.size} documents.`);

    if (snapshot.empty) {
        console.log('No users found in the database.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        const role = data.role || 'member';
        console.log(`${doc.id} | ${data.email || 'N/A'} | ${data.displayName || 'N/A'} | ${role.toUpperCase()}`);
    });
    console.log('\n-----------------------------------');
}

listUserRoles().catch(console.error);
