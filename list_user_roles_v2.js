
const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function listUserRoles() {
    console.log('Starting script...');
    try {
        const envPath = path.resolve('.env.local');
        console.log(`Reading env from ${envPath}`);
        let env = {};
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    let value = valueParts.join('=').trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                    env[key.trim()] = value;
                }
            });
        }

        console.log('Project ID:', env.FIREBASE_PROJECT_ID);

        const serviceAccount = {
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        };

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            console.error('Missing Firebase Admin credentials in .env.local');
            process.exit(1);
        }

        console.log('Initializing Firebase...');
        if (!getApps().length) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
        console.log('Firebase initialized.');

        const db = getFirestore();
        console.log('Fetching users...');

        // Add a timeout to the fetch
        const snapshot = await Promise.race([
            db.collection('users').get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 10000))
        ]);

        console.log(`Found ${snapshot.size} users.`);
        console.log('\nID | Email | Display Name | Role');
        console.log('-----------------------------------');

        snapshot.forEach(doc => {
            const data = doc.data();
            const role = data.role || 'member';
            console.log(`${doc.id} | ${data.email || 'N/A'} | ${data.displayName || 'N/A'} | ${role.toUpperCase()}`);
        });

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

listUserRoles();
