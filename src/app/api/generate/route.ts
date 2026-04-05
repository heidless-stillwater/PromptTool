// Image & Video Generation API Route (Refactored for CORS resilience)
import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
    try {
        // Dynamic imports to prevent top-level initialization crashes during OPTIONS preflights
        const { adminAuth } = await import('@/lib/firebase-admin');
        const { getNanoBananaService } = await import('@/lib/services/nanobanana');
        const { GenerationService } = await import('@/lib/services/generation');
        const { generationSchema } = await import('@/lib/validations/generation');

        // Verify authentication
        const authHeader = request.headers.get('Authorization');
        let userId: string;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } else {
            const sessionCookie = request.cookies.get('session')?.value;
            if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
            const decodedCookie = await adminAuth.verifySessionCookie(sessionCookie);
            userId = decodedCookie.uid;
        }

        const body = await request.json();
        if (!userId && body.uid) userId = body.uid;
        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 401, headers: CORS_HEADERS });

        const result = generationSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400, headers: CORS_HEADERS });
        }

        const validatedData = result.data;
        const { prompt, rawPrompt, quality, aspectRatio, modality, count, seed, negativePrompt, guidanceScale, referenceImage, referenceImageUrl, referenceMimeType, sourceImageId, promptSetID, collectionIds, title } = validatedData;

        await GenerationService.validateTier(userId, validatedData);
        const validation = await GenerationService.validateCredits(userId, modality as any, quality as any, count);

        const isUsingAdvanced = seed !== undefined || (negativePrompt?.trim() !== '') || (guidanceScale !== undefined && guidanceScale !== 7.0);

        const encoder = new TextEncoder();
        const transformStream = new TransformStream();
        const writer = transformStream.writable.getWriter();
        const sendEvent = async (data: any) => { await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); };

        (async () => {
            try {
                const nanoBananaService = getNanoBananaService();
                let genResult;

                if (modality === 'video') {
                    genResult = await nanoBananaService.generateVideo({
                        prompt, aspectRatio,
                        onProgress: (current, total) => sendEvent({ type: 'progress', current, total, message: `Generating video...` })
                    });
                } else {
                    genResult = await nanoBananaService.generateImage({
                        prompt, quality: quality as any, aspectRatio, count,
                        seed: seed ?? undefined, negativePrompt: negativePrompt ?? undefined, guidanceScale: guidanceScale ?? undefined,
                        referenceImage: referenceImage ?? undefined, referenceMimeType: referenceMimeType ?? undefined,
                        onProgress: (current, total) => sendEvent({ type: 'progress', current, total, message: `Generated ${current} of ${total} images...` })
                    });
                }

                if (!genResult.success || !genResult.images?.length) {
                    await sendEvent({ type: 'error', error: genResult.error || 'Generation failed' });
                    return;
                }

                const generatedMediaData = [];
                for (let i = 0; i < genResult.images.length; i++) {
                    const mediaData = await GenerationService.saveMedia(userId, genResult.images[i], {
                        prompt: prompt, rawPrompt: rawPrompt || prompt, quality: quality as any, aspectRatio, promptType: validatedData.promptType as any,
                        madlibsData: validatedData.madlibsData as any, seed: seed ?? undefined, negativePrompt: negativePrompt ?? undefined,
                        guidanceScale: guidanceScale ?? undefined, sourceImageId: sourceImageId ?? undefined,
                        promptSetID: promptSetID ?? undefined, collectionIds: collectionIds ?? undefined,
                        requestedModality: modality as any, modality: modality as any, initialImageUrl: referenceImageUrl ?? undefined,
                        targetVariationId: i === 0 ? validatedData.targetVariationId : undefined,
                        title: title ?? undefined
                    });
                    generatedMediaData.push(mediaData);
                    await sendEvent({ type: 'image_ready', image: mediaData, index: i });
                }

                const newBalance = await GenerationService.deductCredits(validation, genResult.images.length, {
                    modality, quality: quality as any, aspectRatio, promptType: validatedData.promptType, isAdvanced: isUsingAdvanced,
                    prompt, firstImageUrl: generatedMediaData[0]?.imageUrl
                });

                await sendEvent({
                    type: 'complete',
                    success: true,
                    creditsUsed: validation.costs.single * genResult.images.length,
                    remainingBalance: newBalance,
                });
            } catch (err: any) {
                console.error('SSE Error:', err);
                await sendEvent({ type: 'error', error: err.message || 'Generation processor error' });
            } finally {
                await writer.close();
            }
        })();

        return new NextResponse(transformStream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...CORS_HEADERS
            },
        });

    } catch (error: any) {
        console.error('Critical API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
    }
}
