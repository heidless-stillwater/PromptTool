// Script to update user credits
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[match[1].trim()] = value;
    }
});

const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const databaseId = env.FIREBASE_DATABASE_ID || '(default)';
const db = getFirestore(admin.app(), databaseId);

async function setCredits(email, balance) {
    try {
        // Get user by email
        const user = await admin.auth().getUserByEmail(email);
        console.log('Found user:', user.uid);

        // Update credits - use db (named database)
        const creditsRef = db.collection('users').doc(user.uid).collection('data').doc('credits');

        // Check if credits doc exists
        const doc = await creditsRef.get();
        if (!doc.exists) {
            // Create credits document
            await creditsRef.set({
                balance: balance,
                dailyAllowance: 5,
                dailyAllowanceUsed: 0,
                lastDailyReset: admin.firestore.Timestamp.now(),
                expiresAt: null,
                totalPurchased: balance,
                totalUsed: 0
            });
        } else {
            await creditsRef.update({ balance: balance });
        }

        console.log(`Credits set to ${balance} for ${email} in database ${databaseId}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

// Run with email and balance from command line
const email = process.argv[2] || 'heidlessemail18@gmail.com';
const balance = parseInt(process.argv[3]) || 100;
setCredits(email, balance);
