import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withApiHandler } from '@/lib/api-handler';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { draftSchema } from '@/lib/validations/generation';

export const POST = withApiHandler({
    requireAuth: true,
    resourceCheck: {
        resource: 'dbWritesDaily',
        amount: 1
    },
    handler: async (req, { body, userId }) => {
        try {
            const {
                draftId, // Optional: if provided, update the existing draft instead of creating
                prompt, compiledPrompt, quality, aspectRatio, promptType,
                seed, negativePrompt, guidanceScale, sourceImageId,
                promptSetID, modality, modelType, modifiers, coreSubject, variables
            } = body;

            const settings: any = {
                modality,
                quality: modality === 'video' ? 'video' : quality,
                aspectRatio,
                prompt,
                promptType,
                modelType: modelType || 'standard',
            };

            if (seed !== undefined) settings.seed = seed;
            if (negativePrompt) settings.negativePrompt = negativePrompt;
            if (guidanceScale !== undefined) settings.guidanceScale = guidanceScale;
            if (modifiers) settings.modifiers = modifiers;
            if (coreSubject) settings.coreSubject = coreSubject;
            if (variables && Object.keys(variables).length > 0) settings.variables = variables;
            if (compiledPrompt) settings.compiledPrompt = compiledPrompt;

            const imagesCol = adminDb.collection('users').doc(userId!).collection('images');

            // If a draftId is provided, update the existing draft document
            if (draftId) {
                const existingRef = imagesCol.doc(draftId);
                const existingSnap = await existingRef.get();

                if (existingSnap.exists) {
                    const updateData: any = {
                        prompt: compiledPrompt || prompt || "",
                        settings,
                        updatedAt: Timestamp.now(),
                        ...(sourceImageId && { sourceImageId }),
                        ...(promptSetID && { promptSetID }),
                    };

                    await existingRef.update(updateData);

                    return NextResponse.json({
                        success: true,
                        id: draftId,
                        promptSetID: promptSetID || existingSnap.data()?.promptSetID,
                        updatedAt: new Date().toISOString()
                    });
                }
                // If the doc was deleted, fall through to create a new one
            }

            // Create a new draft document
            const mediaData: any = {
                userId: userId,
                prompt: compiledPrompt || prompt || "",
                settings,
                imageUrl: '/images/draft-placeholder.svg',
                storagePath: '',
                creditsCost: 0,
                createdAt: Timestamp.now(),
                downloadCount: 0,
                status: 'draft',
                ...(sourceImageId && { sourceImageId }),
                ...(promptSetID && { promptSetID }),
            };

            const mediaDoc = await imagesCol.add(mediaData);

            return NextResponse.json({
                success: true,
                id: mediaDoc.id,
                promptSetID: promptSetID,
                ...mediaData,
                createdAt: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('[Draft API] Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
    }
});
