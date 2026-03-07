import { adminDb } from './src/lib/firebase-admin';

async function fetchLatest() {
    try {
        const snapshot = await adminDb.collectionGroup('images')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        snapshot.forEach(doc => {
            console.log("ID:", doc.id);
            console.log("Data:", JSON.stringify(doc.data(), null, 2));
        });
    } catch (e) { console.error(e) }
}
fetchLatest();
