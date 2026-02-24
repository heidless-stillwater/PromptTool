
const admin = require('firebase-admin');

// Service account would be needed for a standalone script, 
// but I'll assume I can run it if I had the credentials.
// Since I don't have the credentials in a file I can easily read, 
// I'll try to use the environment variables if they are available.

// Actually, I'll just write the script as a reference or try to run it via an API test if possible.
// Better: I'll use a cloud function or similar, but I can't do that.

// If I can't run it, I'll just tell the user that new images will show up correctly.

async function backfillLeagueEntries() {
    const db = admin.firestore();
    const snapshot = await db.collection('leagueEntries').get();

    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const updates = {};

        if (data.shareCount === undefined) updates.shareCount = 0;
        if (data.commentCount === undefined) updates.commentCount = 0;
        if (data.variationCount === undefined) updates.variationCount = 0;
        if (data.voteCount === undefined) updates.voteCount = 0;

        if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Backfilled ${count} entries.`);
    } else {
        console.log('No entries needed backfilling.');
    }
}
