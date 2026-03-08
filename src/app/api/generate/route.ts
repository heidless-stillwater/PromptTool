// Image & Video Generation API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { getNanoBananaService } from '@/lib/services/nanobanana';
import { getAIPromptService } from '@/lib/services/ai-prompt';
import { GenerationService } from '@/lib/services/generation';
import { CREDIT_COSTS, ImageQuality, AspectRatio, GeneratedImage, MadLibsSelection, SUBSCRIPTION_PLANS, MediaModality } from '@/lib/types';
import { generationSchema } from '@/lib/validations/generation';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { sanitizeAIResponse } from '@/lib/utils';

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
    referenceImage?: string;      // Base64 image for Img2Img variations (Legacy)
    referenceImageUrl?: string;   // URL for thumbnail initialization (Legacy)
    referenceMimeType?: string;   // MIME type of reference image (Legacy)
    referenceImages?: { data: string, mimeType?: string, usage: 'style' | 'content' }[];
    modelType?: 'standard' | 'pro';
    sourceImageId?: string;       // Original image ID for variation tracking
    promptSetID?: string;         // Unique ID for the batch/generation set
    promptSetName?: string;       // Optional name for the prompt set
    collectionIds?: string[];     // Collections to add generated images to
    modality?: MediaModality;     // image | video
    modifiers?: { category: string, value: string }[];
    coreSubject?: string;
}

import { checkResourceQuota } from '@/lib/resource-guard';

export async function POST(request: NextRequest) {
    console.log('[API] /api/generate - Start (POST)');
    try {
        // ... (inside the handler after userId is determined)
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
            count, seed, negativePrompt, guidanceScale, modelType,
            referenceImage, referenceImageUrl, referenceMimeType, referenceImages, sourceImageId, promptSetID, promptSetName: incomingPromptSetName,
            collectionIds, modality, modifiers, coreSubject, simulation, variables, skipWeave, attributionName, attributionUrl,
            originatorName, originatorUrl
        } = validatedData;

        const defaultName = (coreSubject || prompt || "Untitled Generation")
            .split(' ')
            .slice(0, 5)
            .join(' ')
            .trim();
        const promptSetName = incomingPromptSetName || defaultName;

        // 1. Validate Tier Constraints
        await GenerationService.validateTier(userId, validatedData);

        // 2. Validate Credits
        const validation = await GenerationService.validateCredits(userId, modality as any, modality === 'video' ? 'video' : quality as any, count, modelType as any, simulation);

        // 3. Resource Quota Check (Hard Cap)
        const resourceStatus = await checkResourceQuota(userId, 'dbWritesDaily', count || 1);
        if (!resourceStatus.success) {
            return NextResponse.json({
                success: false,
                error: resourceStatus.error,
                resourceStatus
            }, { status: 429 });
        }

        const isUsingAdvanced = seed !== undefined ||
            (negativePrompt !== undefined && negativePrompt.trim() !== '') ||
            (guidanceScale !== undefined && guidanceScale !== 7.0);

        // Create a TransformStream for SSE
        const encoder = new TextEncoder();
        const transformStream = new TransformStream();
        const writer = transformStream.writable.getWriter();

        const sendEvent = async (data: any) => {
            try {
                await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch (e) {
                // Ignore errors if the stream is closed (e.g. user refreshed or navigated away)
                console.log('[Generate API] Client disconnected, stopping stream.');
            }
        };

        (async () => {
            try {
                const nanoBananaService = getNanoBananaService();
                const aiPromptService = getAIPromptService();

                let generationPrompt = prompt;

                // 2. Prior to generating: Run "weave" operation if coreSubject and modifiers are present
                // BUT ONLY if skipWeave wasn't toggled (e.g. Masterpiece mode already final)
                if (!skipWeave && coreSubject && modifiers && modifiers.length > 0) {
                    try {
                        console.log(`[Generate API] Weaving Nanobanana prompt for subject: "${coreSubject}"`);
                        await sendEvent({
                            type: 'progress',
                            current: 0,
                            total: count ?? 1,
                            message: 'Weaving prompt DNA...'
                        });

                        generationPrompt = await aiPromptService.compileNanobananaPrompt(
                            coreSubject,
                            modifiers,
                            aspectRatio,
                            {
                                mediaType: modality,
                                quality: quality as any,
                                guidanceScale: guidanceScale ?? undefined,
                                negativePrompt: negativePrompt ?? undefined
                            },
                            variables
                        );
                        generationPrompt = sanitizeAIResponse(generationPrompt);
                        console.log('[Generate API] Weave successful (sanitized):', generationPrompt.substring(0, 100) + '...');
                    } catch (weaveError) {
                        console.error('[Generate API] Weave failed, falling back to raw prompt:', weaveError);
                        // Fallback to original prompt if weave fails
                    }
                }

                // 3. Final DNA Resolution: Ensure all [VAR] markers are resolved or neutralized before generator execution
                // Capture the pre-resolution version (with markers) for re-opening later
                const coreSynthesisPrompt = generationPrompt;

                console.log(`[Generate API] Resolving DNA markers for prompt. Current Variables:`, JSON.stringify(variables));
                generationPrompt = generationPrompt.replace(/(?<!')\[([A-Z0-9_]+)(?::([^\]]+))?\](?!')/gi, (match, name, defaultVal) => {
                    const key = name.toUpperCase();
                    const val = variables?.[key];

                    if (val !== undefined && val !== null && val !== '') {
                        console.log(`[Generate API] Resolved [${key}] -> "${val}"`);
                        return val;
                    }

                    // If the variable is completely absent from the payload, it might be a static default
                    // BUT for amnesia, we assume that if it's NOT in variables, it's purged.
                    console.log(`[Generate API] Neutralizing marker [${key}] (no value provided)`);
                    return '';
                });
                console.log(`[Generate API] Final Neutralized Prompt: "${generationPrompt}"`);

                let result;

                if (modality === 'video') {
                    result = await nanoBananaService.generateVideo({
                        prompt: generationPrompt,
                        aspectRatio,
                        count: count ?? 1,
                        onProgress: (current, total) => {
                            sendEvent({ type: 'progress', current, total, message: `Generating video...` });
                        }
                    });
                } else {
                    // Normalize reference images: handle legacy single field or new array
                    const refImages = referenceImages && referenceImages.length > 0
                        ? referenceImages.map((img: any) => img.imageUrl || img.url)
                        : referenceImageUrl
                            ? [referenceImageUrl]
                            : [];

                    result = await nanoBananaService.generateImage({
                        prompt: generationPrompt,
                        quality: quality as any,
                        aspectRatio,
                        count: count ?? 1,
                        seed: seed ?? undefined,
                        negativePrompt: negativePrompt ?? undefined,
                        guidanceScale: guidanceScale ?? undefined,
                        modelType,
                        referenceImages: refImages.length > 0 ? refImages.map((data: string) => ({
                            data,
                            mimeType: referenceMimeType,
                            usage: 'content' as const
                        })) : undefined,
                        onProgress: (current, total) => {
                            sendEvent({ type: 'progress', current, total, message: `Generating image ${current}/${total}...` });
                        }
                    });
                }

                if (!result || !result.images || result.images.length === 0) {
                    const errorMessage = (result as any)?.error || 'No media generated';
                    console.error(`[Generate API] Generation failed for userId: ${userId}. Error: ${errorMessage}`);
                    await sendEvent({ type: 'error', error: errorMessage });
                    await writer.close();
                    return;
                }

                const generatedMediaData: GeneratedImage[] = [];

                // 3. Save Media
                for (let i = 0; i < result.images.length; i++) {
                    const mediaData = await GenerationService.saveMedia(userId, result.images[i], {
                        prompt: coreSynthesisPrompt, quality: quality as any, aspectRatio, promptType, madlibsData, seed: seed ?? undefined, negativePrompt, guidanceScale: guidanceScale ?? undefined,
                        sourceImageId, promptSetID, promptSetName, collectionIds, requestedModality: modality, modality,
                        initialImageUrl: referenceImageUrl, modifiers, coreSubject,
                        variables: variables || undefined,
                        compiledPrompt: coreSynthesisPrompt,
                        attributionName,
                        attributionUrl,
                        originatorName,
                        originatorUrl,
                    });

                    generatedMediaData.push(mediaData);
                    await sendEvent({ type: 'image_ready', image: mediaData, index: i });
                }

                // 4. Deduct Credits
                const newBalance = await GenerationService.deductCredits(validation, result.images.length, {
                    modality, quality: quality as any, aspectRatio, promptType, isAdvanced: isUsingAdvanced,
                    prompt: generationPrompt, firstImageUrl: generatedMediaData[0]?.imageUrl
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
                try {
                    await writer.close();
                } catch (e) {
                    // Stream already closed
                }
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
