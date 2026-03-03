import { adminDb } from '../src/lib/firebase-admin';

async function testAnalytics() {
    try {
        console.log('Testing collectionGroup("data")...');
        const creditsSnap = await adminDb.collectionGroup('data').get();
        console.log(`Found ${creditsSnap.docs.length} docs in 'data' groups.`);

        console.log('Testing collectionGroup("creditHistory")...');
        try {
            const historySnap = await adminDb.collectionGroup('creditHistory')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            console.log(`Found ${historySnap.docs.length} docs in 'creditHistory' groups.`);
        } catch (e: any) {
            console.error('Error in creditHistory query:', e.message);
            if (e.message.includes('FAILED_PRECONDITION')) {
                console.error('INDEX MISSING! You need to create a collection group index.');
            }
        }

    } catch (err: any) {
        console.error('Overall Error:', err);
    }
}

testAnalytics();
