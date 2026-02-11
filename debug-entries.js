const admin = require('firebase-admin');
const path = require('path');

// Mock process.env for the lib
process.env.FIREBASE_PROJECT_ID = 'heidless-apps-0'; // Adjust as needed
process.env.FIREBASE_DATABASE_ID = '(default)';

const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkEntries() {
    try {
        const snapshot = await db.collection('leagueEntries').orderBy('publishedAt', 'desc').limit(10).get();
        console.log(`Found ${snapshot.docs.length} entries:`);
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, originalUserId: ${data.originalUserId}, authorName: ${data.authorName}`);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

checkEntries();
