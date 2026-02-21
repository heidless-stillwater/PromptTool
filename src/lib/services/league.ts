
import { adminDb } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface LeaguePublishOptions {
    userId: string;
    imageId: string;
}

export class LeagueService {
    /**
     * Publishes an image to the community league.
     */
    static async publishImage({ userId, imageId }: LeaguePublishOptions) {
        // Get the original image
        const imageRef = adminDb.collection('users').doc(userId).collection('images').doc(imageId);
        const imageDoc = await imageRef.get();

        if (!imageDoc.exists) {
            throw new Error('Image not found');
        }

        const imageData = imageDoc.data()!;

        // Check if already published
        if (imageData.publishedToLeague) {
            throw new Error('Image already published to league');
        }

        // Get user profile for author info
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('User profile not found');
        }

        const userProfile = userDoc.data()!;

        // Create league entry with denormalized data
        const leagueEntryData = {
            originalImageId: imageId,
            originalUserId: userId,
            imageUrl: imageData.imageUrl,
            videoUrl: imageData.videoUrl || null,
            duration: imageData.duration || null,
            prompt: imageData.prompt,
            settings: imageData.settings,
            authorName: userProfile.displayName || 'Anonymous',
            authorPhotoURL: userProfile.photoURL || null,
            authorBadges: userProfile.badges || [],
            publishedAt: Timestamp.now(),
            voteCount: 0,
            commentCount: 0,
            votes: {},
        };

        const leagueEntryRef = adminDb.collection('leagueEntries').doc();
        const batch = adminDb.batch();

        // 1. Create league entry
        batch.set(leagueEntryRef, {
            ...leagueEntryData,
            id: leagueEntryRef.id
        });

        // 2. Update original image
        batch.update(imageRef, {
            publishedToLeague: true,
            leagueEntryId: leagueEntryRef.id,
        });

        // 3. Update creator profile
        const creatorRef = adminDb.collection('users').doc(userId);
        batch.set(creatorRef, {
            publishedCount: FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();

        return {
            leagueEntryId: leagueEntryRef.id,
            message: 'Image published to league!',
        };
    }

    /**
     * Removes an image from the community league.
     */
    static async unpublishImage({ userId, imageId }: LeaguePublishOptions) {
        // Get the original image
        const imageRef = adminDb.collection('users').doc(userId).collection('images').doc(imageId);
        const imageDoc = await imageRef.get();

        if (!imageDoc.exists) {
            throw new Error('Image not found');
        }

        const imageData = imageDoc.data()!;

        // Check if published
        if (!imageData.publishedToLeague || !imageData.leagueEntryId) {
            throw new Error('Image is not published to league');
        }

        // Delete the league entry
        const leagueEntryRef = adminDb.collection('leagueEntries').doc(imageData.leagueEntryId);
        const leagueEntryDoc = await leagueEntryRef.get();

        if (!leagueEntryDoc.exists) {
            // If entry is missing but image think it is published, just fix the image
            await imageRef.update({
                publishedToLeague: false,
                leagueEntryId: FieldValue.delete(),
            });
            return { message: 'Image status cleaned up.' };
        }

        const leagueEntryData = leagueEntryDoc.data();
        const votesToRemove = leagueEntryData?.voteCount || 0;

        // Delete comments subcollection first
        const commentsSnapshot = await leagueEntryRef.collection('comments').get();
        const batch = adminDb.batch();

        // 1. Delete comments
        commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // 2. Delete entry
        batch.delete(leagueEntryRef);

        // 3. Update creator's stats
        const creatorRef = adminDb.collection('users').doc(userId);
        const updates: any = {
            publishedCount: FieldValue.increment(-1)
        };
        if (votesToRemove > 0) {
            updates.totalInfluence = FieldValue.increment(-votesToRemove);
        }
        batch.set(creatorRef, updates, { merge: true });

        await batch.commit();

        // Update original image
        await imageRef.update({
            publishedToLeague: false,
            leagueEntryId: FieldValue.delete(),
        });

        return {
            message: 'Image removed from league.',
        };
    }
}
