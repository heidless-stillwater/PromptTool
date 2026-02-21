// Image & Video Generation API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { getNanoBananaService } from '@/lib/services/nanobanana';
import { GenerationService } from '@/lib/services/generation';
import { CREDIT_COSTS, ImageQuality, AspectRatio, GeneratedImage, MadLibsSelection, SUBSCRIPTION_PLANS, MediaModality } from '@/lib/types';
import { generationSchema } from '@/lib/validations/generation';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const maxDuration = 300; // Allow up to 5 minutes for execution (Veo generation takes time)

interface GenerateRequest {
    prompt: string;
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    promptType: 'freeform' | 'madlibs';
    madlibsData?: MadLibsSelection;
    count?: number;
    seed?: number;
    negativePrompt?: string;
    guidanceScale?: number;
    referenceImage?: string;      // Base64 image for Img2Img variations
    referenceMimeType?: string;   // MIME type of reference image
    sourceImageId?: string;       // Original image ID for variation tracking
    promptSetID?: string;         // Unique ID for the batch/generation set
    collectionIds?: string[];     // Collections to add generated images to
    modality?: MediaModality;     // image | video
}

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
            // Try to get from cookie (for client-side requests)
            const sessionCookie = request.cookies.get('session')?.value;
            if (!sessionCookie) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const decodedCookie = await adminAuth.verifySessionCookie(sessionCookie);
            userId = decodedCookie.uid;
        }

        const body = await request.json();

        if (!userId && body.uid) {
            userId = body.uid;
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 401 });
        }

        // 1. Zod Validation
        const result = generationSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({
                error: result.error.issues[0].message,
                details: result.error.issues
            }, { status: 400 });
        }

        const validatedData = result.data;
        const {
            prompt, quality, aspectRatio, promptType, madlibsData,
            count, seed, negativePrompt, guidanceScale,
            referenceImage, referenceMimeType, sourceImageId, promptSetID,
            collectionIds, modality
        } = validatedData;

        // 1. Validate Tier Constraints
        await GenerationService.validateTier(userId, validatedData);

        // 2. Validate Credits
        const validation = await GenerationService.validateCredits(userId, modality, modality === 'video' ? 'video' : quality, count);

        const isUsingAdvanced = seed !== undefined ||
            (negativePrompt !== undefined && negativePrompt.trim() !== '') ||
            (guidanceScale !== undefined && guidanceScale !== 7.0);

        // Create a TransformStream for SSE
        const encoder = new TextEncoder();
        const transformStream = new TransformStream();
        const writer = transformStream.writable.getWriter();

        const sendEvent = async (data: any) => {
            await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        (async () => {
            try {
                const nanoBananaService = getNanoBananaService();
                let result;

                if (modality === 'video') {
                    result = await nanoBananaService.generateVideo({
                        prompt,
                        aspectRatio,
                        onProgress: (current, total) => {
                            sendEvent({ type: 'progress', current, total, message: `Generating video...` });
                        }
                    });
                } else {
                    result = await nanoBananaService.generateImage({
                        prompt, quality, aspectRatio, count, seed, negativePrompt, guidanceScale,
                        referenceImage, referenceMimeType,
                        onProgress: (current, total) => {
                            sendEvent({ type: 'progress', current, total, message: `Generated ${current} of ${total} images...` });
                        }
                    });
                }

                if (!result.success || !result.images || result.images.length === 0) {
                    await sendEvent({ type: 'error', error: result.error || 'Generation failed' });
                    await writer.close();
                    return;
                }

                const generatedMediaData: GeneratedImage[] = [];

                // 3. Save Media
                for (let i = 0; i < result.images.length; i++) {
                    const mediaData = await GenerationService.saveMedia(userId, result.images[i], {
                        prompt, quality, aspectRatio, promptType, madlibsData, seed, negativePrompt, guidanceScale,
                        sourceImageId, promptSetID, collectionIds, requestedModality: modality, modality
                    });

                    generatedMediaData.push(mediaData);
                    await sendEvent({ type: 'image_ready', image: mediaData, index: i });
                }

                // 4. Deduct Credits
                const newBalance = await GenerationService.deductCredits(validation, result.images.length, {
                    modality, quality, aspectRatio, promptType, isAdvanced: isUsingAdvanced,
                    prompt, firstImageUrl: generatedMediaData[0]?.imageUrl
                });

                // 5. Complete
                await sendEvent({
                    type: 'complete',
                    success: true,
                    images: generatedMediaData,
                    creditsUsed: validation.costs.single * result.images.length,
                    remainingBalance: newBalance,
                    warning: result.images.length < count ? `Only ${result.images.length} of ${count} generations were successful.` : undefined,
                });

            } catch (err: any) {
                console.error('SSE Generation error:', err);
                await sendEvent({ type: 'error', error: err.message || 'Internal server error' });
            } finally {
                await writer.close();
            }
        })();

        return new NextResponse(transformStream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Generate API error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
