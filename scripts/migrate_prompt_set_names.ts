import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Setup firebase admin
if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        })
    });
}

const db = getFirestore();

async function migratePromptSetNames() {
    console.log('Starting promptSetName migration...');
    let migratedCount = 0;
    let skippedCount = 0;

    // 1. Migrate user images
    console.log('Migrating images collection group...');
    const imagesRef = db.collectionGroup('images');
    const imagesSnapshot = await imagesRef.get();

    const imageBatches = [];
    let currentBatch = db.batch();
    let batchOperationCount = 0;

    for (const doc of imagesSnapshot.docs) {
        const data = doc.data();

        // Skip if already has promptSetName
        if (data.promptSetName || data.settings?.promptSetName) {
            skippedCount++;
            continue;
        }

        // Generate default name from prompt or coreSubject
        const prompt = data.prompt || data.settings?.prompt || '';
        const coreSubject = data.settings?.coreSubject || '';

        let defaultName = "Untitled Generation";
        if (coreSubject || prompt) {
            defaultName = (coreSubject || prompt)
                .split(' ')
                .slice(0, 5)
                .join(' ')
                .trim();
        }

        currentBatch.update(doc.ref, {
            promptSetName: defaultName
        });

        batchOperationCount++;
        migratedCount++;

        if (batchOperationCount === 500) {
            imageBatches.push(currentBatch);
            currentBatch = db.batch();
            batchOperationCount = 0;
        }
    }

    if (batchOperationCount > 0) {
        imageBatches.push(currentBatch);
    }

    for (let i = 0; i < imageBatches.length; i++) {
        console.log(`Committing image batch ${i + 1}/${imageBatches.length}...`);
        await imageBatches[i].commit();
    }

    console.log('Images migration complete.');

    // 2. Migrate leagueEntries (community entries)
    console.log('Migrating leagueEntries collection...');
    const entriesRef = db.collection('leagueEntries');
    const entriesSnapshot = await entriesRef.get();

    const entryBatches = [];
    currentBatch = db.batch();
    batchOperationCount = 0;

    for (const doc of entriesSnapshot.docs) {
        const data = doc.data();

        // Skip if already has promptSetName
        if (data.promptSetName) {
            skippedCount++;
            continue;
        }

        // Generate default name from prompt
        const prompt = data.prompt || '';

        let defaultName = "Untitled Generation";
        if (prompt) {
            defaultName = prompt
                .split(' ')
                .slice(0, 5)
                .join(' ')
                .trim();
        }

        currentBatch.update(doc.ref, {
            promptSetName: defaultName
        });

        batchOperationCount++;
        migratedCount++;

        if (batchOperationCount === 500) {
            entryBatches.push(currentBatch);
            currentBatch = db.batch();
            batchOperationCount = 0;
        }
    }

    if (batchOperationCount > 0) {
        entryBatches.push(currentBatch);
    }

    for (let i = 0; i < entryBatches.length; i++) {
        console.log(`Committing league entry batch ${i + 1}/${entryBatches.length}...`);
        await entryBatches[i].commit();
    }

    console.log('League entries migration complete.');

    console.log(`Migration finished! Migrated ${migratedCount} documents. Skipped ${skippedCount} documents.`);
}

migratePromptSetNames().catch(console.error);
