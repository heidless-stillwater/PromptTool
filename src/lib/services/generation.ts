
import { adminDb, adminStorage } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { CREDIT_COSTS, ImageQuality, AspectRatio, GeneratedImage, MadLibsSelection, SUBSCRIPTION_PLANS, MediaModality } from '../types';

export interface GenerationValidationResult {
    userId: string;
    subscription: string;
    credits: {
        balance: number;
        dailyAllowance: number;
        dailyAllowanceUsed: number;
        lastDailyReset: Timestamp;
    };
    costs: {
        single: number;
        total: number;
    };
    isNewDay: boolean;
    remainingDaily: number;
}

export interface MediaSaveOptions {
    prompt: string;
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    promptType: 'freeform' | 'madlibs';
    madlibsData?: MadLibsSelection;
    seed?: number;
    negativePrompt?: string;
    guidanceScale?: number;
    sourceImageId?: string;
    promptSetID?: string;
    collectionIds?: string[];
    requestedModality: MediaModality;
    modality: MediaModality;
}

export class GenerationService {
    /**
     * Validates user subscription tiers and constraints.
     */
    static async validateTier(userId: string, body: any) {
        const { modality = 'image', quality, count = 1, seed, negativePrompt, guidanceScale } = body;

        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error('User not found');

        const userProfile = userDoc.data()!;
        const plan = SUBSCRIPTION_PLANS[userProfile.subscription as keyof typeof SUBSCRIPTION_PLANS];

        // 1. Check Quality
        if (modality === 'image' && quality && !plan.allowedQualities.includes(quality)) {
            throw new Error(`${quality} quality requires ${quality === 'ultra' ? 'Pro' : 'Standard'} subscription`);
        }

        // 2. Check Modality (Video)
        if (modality === 'video' && userProfile.subscription !== 'pro') {
            throw new Error('Video generation is a Pro-only feature');
        }

        // 3. Check Batching
        if (count > 1 && userProfile.subscription !== 'pro') {
            throw new Error('Batch generation is a Pro-only feature');
        }

        // 4. Check Advanced Controls
        const isUsingAdvanced = seed !== undefined ||
            (negativePrompt !== undefined && negativePrompt.trim() !== '') ||
            (guidanceScale !== undefined && guidanceScale !== 7.0);

        if (isUsingAdvanced && userProfile.subscription !== 'pro') {
            throw new Error('Advanced precision controls are Pro-only features');
        }

        return { userProfile, plan };
    }

    /**
     * Checks if user has enough credits and calculates costs.
     */
    static async validateCredits(userId: string, modality: MediaModality, quality: ImageQuality | 'video', count: number): Promise<GenerationValidationResult> {
        const creditsRef = adminDb.collection('users').doc(userId).collection('data').doc('credits');
        const creditsDoc = await creditsRef.get();

        if (!creditsDoc.exists) throw new Error('Credits not found');

        const credits = creditsDoc.data() as any;
        const singleCost = modality === 'video' ? CREDIT_COSTS.video : CREDIT_COSTS[quality as ImageQuality];
        const totalCost = singleCost * count;

        const lastReset = credits.lastDailyReset.toDate();
        const today = new Date();
        const isNewDay = lastReset.toDateString() !== today.toDateString();

        const currentDailyUsed = isNewDay ? 0 : credits.dailyAllowanceUsed;
        const remainingDaily = Math.max(0, credits.dailyAllowance - currentDailyUsed);
        const totalAvailable = credits.balance + remainingDaily;

        if (totalAvailable < totalCost) {
            throw new Error(`Insufficient credits. Need ${totalCost}, have ${totalAvailable}`);
        }

        return {
            userId,
            subscription: '', // Not strictly needed for credit logic itself
            credits: credits as any,
            costs: { single: singleCost, total: totalCost },
            isNewDay,
            remainingDaily
        };
    }

    /**
     * Deducts credits and logs history.
     */
    static async deductCredits(val: GenerationValidationResult, actualCount: number, options: any) {
        const { userId, isNewDay, remainingDaily, costs } = val;
        const actualTotalCost = costs.single * actualCount;

        const dailyDeduction = Math.min(actualTotalCost, remainingDaily);
        const balanceDeduction = actualTotalCost - dailyDeduction;

        const creditsRef = adminDb.collection('users').doc(userId).collection('data').doc('credits');

        await creditsRef.update({
            balance: FieldValue.increment(-balanceDeduction),
            dailyAllowanceUsed: isNewDay ? dailyDeduction : FieldValue.increment(dailyDeduction),
            lastDailyReset: isNewDay ? Timestamp.now() : val.credits.lastDailyReset,
            totalUsed: FieldValue.increment(actualTotalCost),
        });

        // Add credit transaction
        await adminDb.collection('users').doc(userId).collection('creditHistory').add({
            type: 'usage',
            amount: -actualTotalCost,
            description: `${options.modality === 'video' ? 'Video' : 'Image'} Generation (${actualCount} items, ${options.modality === 'video' ? 'video' : options.quality} quality)`,
            metadata: {
                modality: options.modality,
                quality: options.modality === 'video' ? 'video' : options.quality,
                aspectRatio: options.aspectRatio,
                promptType: options.promptType,
                count: actualCount,
                isAdvanced: options.isAdvanced,
                prompt: options.prompt,
                imageUrl: options.firstImageUrl
            },
            createdAt: Timestamp.now(),
        });

        const updatedCredits = (await creditsRef.get()).data()!;
        return updatedCredits.balance + Math.max(0, updatedCredits.dailyAllowance - updatedCredits.dailyAllowanceUsed);
    }

    /**
     * Saves generated media to Storage and Firestore.
     */
    static async saveMedia(userId: string, media: { data: string, mimeType: string }, options: MediaSaveOptions) {
        const bucket = adminStorage.bucket();
        const { modality, quality, aspectRatio, prompt, promptType, madlibsData, seed, negativePrompt, guidanceScale, sourceImageId, promptSetID, collectionIds, requestedModality } = options;

        const isVideo = media.mimeType.startsWith('video/');
        const extension = media.mimeType.split('/')[1] || (isVideo ? 'mp4' : 'png');
        const filename = `users/${userId}/images/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

        const file = bucket.file(filename);
        const mediaBuffer = Buffer.from(media.data, 'base64');

        await file.save(mediaBuffer, {
            metadata: { contentType: media.mimeType },
        });

        await file.makePublic();
        const mediaUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        const actualModality = isVideo ? 'video' : 'image';

        const settings: any = {
            modality: actualModality,
            quality: actualModality === 'video' ? 'video' : quality,
            aspectRatio,
            prompt,
            promptType,
            requestedModality,
        };

        if (madlibsData) settings.madlibsData = madlibsData;
        if (seed !== undefined) settings.seed = seed;
        if (negativePrompt) settings.negativePrompt = negativePrompt;
        if (guidanceScale !== undefined) settings.guidanceScale = guidanceScale;

        const mediaData: any = {
            userId,
            prompt,
            settings,
            imageUrl: mediaUrl,
            storagePath: filename,
            creditsCost: isVideo ? CREDIT_COSTS.video : CREDIT_COSTS[quality as ImageQuality],
            createdAt: Timestamp.now(),
            downloadCount: 0,
            ...(actualModality === 'video' && { videoUrl: mediaUrl }),
            ...(sourceImageId && { sourceImageId }),
            ...(promptSetID && { promptSetID }),
            ...(collectionIds && { collectionIds }),
        };

        const mediaDoc = await adminDb.collection('users').doc(userId).collection('images').add(mediaData);
        return { ...mediaData, id: mediaDoc.id };
    }
}
