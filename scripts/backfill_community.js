
import { db } from '../src/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

/**
 * This script can be run from the browser console to initialize missing metrics
 * on existing community entries.
 */
export async function backfillCommunityMetrics() {
    console.log('Starting backfill of community entry metrics...');
    try {
        const snapshot = await getDocs(collection(db, 'leagueEntries'));
        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(snapshotDoc => {
            const data = snapshotDoc.data();
            const updates: any = {};

            if (data.authorFollowerCount === undefined) updates.authorFollowerCount = 0;
            if (data.shareCount === undefined) updates.shareCount = 0;
            if (data.commentCount === undefined) updates.commentCount = 0;
            if (data.variationCount === undefined) updates.variationCount = 0;
            if (data.voteCount === undefined) updates.voteCount = 0;

            if (Object.keys(updates).length > 0) {
                batch.update(snapshotDoc.ref, updates);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Successfully backfilled ${count} entries.`);
        } else {
            console.log('No entries needed backfilling.');
        }
    } catch (err) {
        console.error('Backfill failed:', err);
    }
}
