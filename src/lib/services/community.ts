
import { adminDb } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface CommunityPublishOptions {
    userId: string;
    imageId: string;
}

export class CommunityService {
    /**
     * Publishes an image to the community hub.
     */
    static async publishImage({ userId, imageId }: CommunityPublishOptions) {
        // Get the original image
        const imageRef = adminDb.collection('users').doc(userId).collection('images').doc(imageId);
        const imageDoc = await imageRef.get();

        if (!imageDoc.exists) {
            throw new Error('Image not found');
        }

        const imageData = imageDoc.data()!;

        // Check if already published (check both new and legacy field names)
        const isAlreadyPublished = imageData.publishedToCommunity || imageData.publishedToLeague;
        if (isAlreadyPublished) {
            throw new Error('Image already published to community');
        }

        // Get user profile for author info
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('User profile not found');
        }

        const userProfile = userDoc.data()!;

        // Get collection names
        const collectionIds = imageData.collectionIds || (imageData.collectionId ? [imageData.collectionId] : []);
        const collectionNames: string[] = [];
        if (collectionIds.length > 0) {
            const collectionsSnap = await adminDb.collection('users').doc(userId).collection('collections')
                .where('__name__', 'in', collectionIds.slice(0, 10)) // Max 10 collections
                .get();
            collectionsSnap.forEach(doc => {
                collectionNames.push(doc.data().name);
            });
        }

        // Create community entry with denormalized data
        const communityEntryData = {
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
            shareCount: 0,
            variationCount: 0,
            authorFollowerCount: userProfile.followerCount || 0,
            votes: {},
            collectionIds,
            collectionNames,
            tags: imageData.tags || [],
            promptSetID: imageData.promptSetID || null,
            isExemplar: imageData.isExemplar || false,
            attributionName: imageData.attributionName || null,
            attributionUrl: imageData.attributionUrl || null,
            originatorName: imageData.originatorName || null,
            originatorUrl: imageData.originatorUrl || null,
        };

        const communityEntryRef = adminDb.collection('leagueEntries').doc();
        const batch = adminDb.batch();

        // 1. Create community entry
        batch.set(communityEntryRef, {
            ...communityEntryData,
            id: communityEntryRef.id
        });

        // 2. Update original image
        batch.update(imageRef, {
            publishedToCommunity: true,
            communityEntryId: communityEntryRef.id,
        });

        // 3. Update creator profile
        const creatorRef = adminDb.collection('users').doc(userId);
        batch.set(creatorRef, {
            publishedCount: FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();

        return {
            communityEntryId: communityEntryRef.id,
            message: 'Image published to community!',
        };
    }

    /**
     * Removes an image from the community hub.
     */
    static async unpublishImage({ userId, imageId }: CommunityPublishOptions) {
        // Get the original image
        const imageRef = adminDb.collection('users').doc(userId).collection('images').doc(imageId);
        const imageDoc = await imageRef.get();

        if (!imageDoc.exists) {
            throw new Error('Image not found');
        }

        const imageData = imageDoc.data()!;

        // Check if published — check both new and legacy field names
        const isPublished = imageData.publishedToCommunity || imageData.publishedToLeague;
        const entryId = imageData.communityEntryId || imageData.leagueEntryId;
        if (!isPublished || !entryId) {
            throw new Error('Image is not published to community');
        }

        // Delete the community entry — uses entryId resolved above
        const communityEntryRef = adminDb.collection('leagueEntries').doc(entryId);
        const communityEntryDoc = await communityEntryRef.get();

        if (!communityEntryDoc.exists) {
            // If entry is missing but image think it is published, just fix the image
            await imageRef.update({
                publishedToCommunity: false,
                communityEntryId: FieldValue.delete(),
            });
            return { message: 'Image status cleaned up.' };
        }

        const communityEntryData = communityEntryDoc.data();
        const votesToRemove = communityEntryData?.voteCount || 0;

        // Delete comments subcollection first
        const commentsSnapshot = await communityEntryRef.collection('comments').get();
        const batch = adminDb.batch();

        // 1. Delete comments
        commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // 2. Delete entry
        batch.delete(communityEntryRef);

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

        // Update original image — clear both new and legacy published fields
        await imageRef.update({
            publishedToCommunity: false,
            communityEntryId: FieldValue.delete(),
            publishedToLeague: false,
            leagueEntryId: FieldValue.delete(),
        });

        return {
            message: 'Image removed from community.',
        };
    }
}
