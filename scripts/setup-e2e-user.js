const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const projectRoot = '/home/heidless/projects/heidless-ai/antigravity/live/PromptTool';

// 1. Load Environment Variables
const envPath = path.join(projectRoot, '.env.local');
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            let value = match[2].trim();
            // Strip quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[match[1]] = value;
        }
    });
} else {
    console.error('Missing .env.local file');
    process.exit(1);
}

// 2. Initialize Firebase
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        })
    });
}

const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore(admin.apps[0], process.env.FIREBASE_DATABASE_ID || '(default)');
const auth = admin.auth();

const TEST_USER = {
    email: 'e2e-test@prompttool.test',
    password: 'e2e-test-password-2026',
    displayName: 'E2E Tester',
    role: 'su'
};

async function setupE2EUser() {
    console.log(`Setting up E2E Test User: ${TEST_USER.email}...`);

    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(TEST_USER.email);
            console.log('- User already exists in Auth.');
        } catch (e) {
            userRecord = await auth.createUser({
                email: TEST_USER.email,
                password: TEST_USER.password,
                displayName: TEST_USER.displayName,
            });
            console.log('- Created new user in Auth.');
        }

        const uid = userRecord.uid;

        // Ensure Firestore profile exists
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                uid,
                email: TEST_USER.email,
                displayName: TEST_USER.displayName,
                role: TEST_USER.role,
                subscription: 'pro',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log('- Created user profile in Firestore.');
        } else {
            await userRef.update({
                role: TEST_USER.role,
                subscription: 'pro'
            });
            console.log('- Updated user profile roles/tier in Firestore.');
        }

        // Write credentials to e2e/.env
        const e2eEnvPath = path.join(projectRoot, 'e2e', '.env');
        const content = `TEST_EMAIL=${TEST_USER.email}\nTEST_PASSWORD=${TEST_USER.password}\n`;
        fs.writeFileSync(e2eEnvPath, content);
        console.log(`- Credentials written to: ${e2eEnvPath}`);

        console.log('\n--- E2E SETUP COMPLETE ---');
        console.log('You can now run: npx playwright test');

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setupE2EUser();
