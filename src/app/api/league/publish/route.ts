// League Publish/Unpublish API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('Authorization');
        let userId: string;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageId, action } = body; // action: 'publish' | 'unpublish'

        if (!imageId || !action) {
            return NextResponse.json({ error: 'Missing imageId or action' }, { status: 400 });
        }

        // Get the original image
        const imageRef = adminDb.collection('users').doc(userId).collection('images').doc(imageId);
        const imageDoc = await imageRef.get();

        if (!imageDoc.exists) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        const imageData = imageDoc.data()!;

        if (action === 'publish') {
            // Check if already published
            if (imageData.publishedToLeague) {
                return NextResponse.json({ error: 'Image already published to league' }, { status: 400 });
            }

            // Get user profile for author info
            const userDoc = await adminDb.collection('users').doc(userId).get();
            const userProfile = userDoc.data()!;

            // Create league entry with denormalized data
            const leagueEntryData = {
                originalImageId: imageId,
                originalUserId: userId,
                imageUrl: imageData.imageUrl,
                prompt: imageData.prompt,
                settings: imageData.settings,
                authorName: userProfile.displayName || 'Anonymous',
                authorPhotoURL: userProfile.photoURL || null,
                publishedAt: Timestamp.now(),
                voteCount: 0,
                commentCount: 0,
                votes: {},
            };

            const leagueEntryRef = await adminDb.collection('leagueEntries').add(leagueEntryData);

            // Update original image with league reference
            await imageRef.update({
                publishedToLeague: true,
                leagueEntryId: leagueEntryRef.id,
            });

            return NextResponse.json({
                success: true,
                leagueEntryId: leagueEntryRef.id,
                message: 'Image published to league!',
            });

        } else if (action === 'unpublish') {
            // Check if published
            if (!imageData.publishedToLeague || !imageData.leagueEntryId) {
                return NextResponse.json({ error: 'Image is not published to league' }, { status: 400 });
            }

            // Delete the league entry
            const leagueEntryRef = adminDb.collection('leagueEntries').doc(imageData.leagueEntryId);
            const leagueEntryDoc = await leagueEntryRef.get();
            const leagueEntryData = leagueEntryDoc.data();
            const votesToRemove = leagueEntryData?.voteCount || 0;

            // Delete comments subcollection first
            const commentsSnapshot = await leagueEntryRef.collection('comments').get();
            const batch = adminDb.batch();

            // 1. Delete comments
            commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            // 2. Delete entry
            batch.delete(leagueEntryRef);

            // 3. Update creator's total influence
            if (votesToRemove > 0) {
                const creatorRef = adminDb.collection('users').doc(userId);
                batch.set(creatorRef, { totalInfluence: FieldValue.increment(-votesToRemove) }, { merge: true });
            }

            await batch.commit();

            // Update original image
            await imageRef.update({
                publishedToLeague: false,
                leagueEntryId: FieldValue.delete(),
            });

            return NextResponse.json({
                success: true,
                message: 'Image removed from league.',
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[League Publish] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
