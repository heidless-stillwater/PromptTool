
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./service-account-key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function debugCollections(userId) {
    console.log(`Debugging collections for user: ${userId}`);

    // 1. Fetch Collections
    const collectionsSnap = await db.collection(`users/${userId}/collections`).get();
    console.log(`\nFound ${collectionsSnap.size} collections:`);

    const collections = [];
    collectionsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] ${data.name}: imageCount=${data.imageCount}`);
        collections.push({ id: doc.id, ...data });
    });

    // 2. Fetch Images directly associated
    for (const col of collections) {
        const imagesSnap = await db.collection(`users/${userId}/images`)
            .where('collectionIds', 'array-contains', col.id)
            .get();

        console.log(`\nActual images in collection '${col.name}' (${col.id}): ${imagesSnap.size}`);

        // Check for deprecated field usage
        const legacySnap = await db.collection(`users/${userId}/images`)
            .where('collectionId', '==', col.id)
            .get();

        if (!legacySnap.empty) {
            console.warn(`WARNING: Found ${legacySnap.size} images using deprecated 'collectionId' field.`);
        }
    }
}

// Replace with the user's ID
const USER_ID = 'user_2sYM8Qz4j4201X7q3829s0'; // Example, will need actual one
// Since I don't know the exact UID, I'll list users first to find one.
async function findUserAndDebug() {
    const usersSnap = await db.collection('users').limit(5).get();
    if (usersSnap.empty) {
        console.log("No users found.");
        return;
    }

    // Just pick the first one for now or try to identify heidless
    const user = usersSnap.docs[0];
    await debugCollections(user.id);
}

findUserAndDebug();
