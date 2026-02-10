// Image Generation API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { getNanoBananaService } from '@/lib/services/nanobanana';
import { CREDIT_COSTS, ImageQuality, AspectRatio, GeneratedImage, MadLibsSelection, SUBSCRIPTION_PLANS } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const maxDuration = 60; // Allow up to 60 seconds for execution (Vercel Pro/Hobby limit)

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

        // For development, allow requests with UID in body
        const body: GenerateRequest & { uid?: string } = await request.json();

        if (!userId && body.uid) {
            userId = body.uid;
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 401 });
        }

        const {
            prompt, quality, aspectRatio, promptType, madlibsData,
            count = 1, seed, negativePrompt, guidanceScale,
            referenceImage, referenceMimeType, sourceImageId, promptSetID
        } = body;

        // Validate request
        if (!prompt || !quality || !aspectRatio) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get user profile to check subscription
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userProfile = userDoc.data()!;
        const plan = SUBSCRIPTION_PLANS[userProfile.subscription as keyof typeof SUBSCRIPTION_PLANS];

        // Check if quality is allowed
        if (!plan.allowedQualities.includes(quality)) {
            return NextResponse.json({
                error: `${quality} quality requires ${quality === 'ultra' ? 'Pro' : 'Standard'} subscription`
            }, { status: 403 });
        }

        // Check if batch is allowed (Pro only)
        if (count > 1 && userProfile.subscription !== 'pro') {
            return NextResponse.json({
                error: 'Batch generation is a Pro-only feature'
            }, { status: 403 });
        }

        // Check if advanced controls are used (Pro only)
        const isUsingAdvanced = seed !== undefined || negativePrompt !== undefined || guidanceScale !== undefined;
        if (isUsingAdvanced && userProfile.subscription !== 'pro') {
            return NextResponse.json({
                error: 'Advanced precision controls are Pro-only features'
            }, { status: 403 });
        }

        // Get and validate credits
        const creditsRef = adminDb.collection('users').doc(userId).collection('data').doc('credits');
        const creditsDoc = await creditsRef.get();

        if (!creditsDoc.exists) {
            return NextResponse.json({ error: 'Credits not found' }, { status: 404 });
        }

        const credits = creditsDoc.data()!;
        const singleCost = CREDIT_COSTS[quality];
        const totalCost = singleCost * count;

        // Check for daily reset
        const lastReset = credits.lastDailyReset.toDate();
        const today = new Date();
        const isNewDay = lastReset.toDateString() !== today.toDateString();

        let currentDailyUsed = isNewDay ? 0 : credits.dailyAllowanceUsed;
        const remainingDaily = Math.max(0, credits.dailyAllowance - currentDailyUsed);
        const totalAvailable = credits.balance + remainingDaily;

        if (totalAvailable < totalCost) {
            return NextResponse.json({
                error: `Insufficient credits. Need ${totalCost}, have ${totalAvailable}`
            }, { status: 402 });
        }

        // Create a TransformStream for SSE
        const encoder = new TextEncoder();
        const transformStream = new TransformStream();
        const writer = transformStream.writable.getWriter();

        // Helper to send SSE data
        const sendEvent = async (data: any) => {
            await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Start generation process in the background (but don't wait for completion before returning the stream)
        (async () => {
            try {
                // Generate images
                const nanoBananaService = getNanoBananaService();
                const result = await nanoBananaService.generateImage({
                    prompt,
                    quality,
                    aspectRatio,
                    count,
                    seed,
                    negativePrompt,
                    guidanceScale,
                    referenceImage,
                    referenceMimeType,
                    onProgress: (current, total) => {
                        sendEvent({ type: 'progress', current, total, message: `Generated ${current} of ${total} images...` });
                    }
                });

                if (!result.success || !result.images || result.images.length === 0) {
                    await sendEvent({ type: 'error', error: result.error || 'Image generation failed' });
                    await writer.close();
                    return;
                }

                const actualCount = result.images.length;
                const actualTotalCost = singleCost * actualCount;

                // Process images
                const bucket = adminStorage.bucket();
                const generatedImagesData: GeneratedImage[] = [];

                for (let i = 0; i < result.images.length; i++) {
                    const img = result.images[i];
                    const filename = `users/${userId}/images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                    const file = bucket.file(filename);
                    const imageBuffer = Buffer.from(img.data, 'base64');

                    await file.save(imageBuffer, {
                        metadata: {
                            contentType: img.mimeType || 'image/png',
                        },
                    });

                    await file.makePublic();
                    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

                    const settings: any = {
                        quality,
                        aspectRatio,
                        prompt,
                        promptType,
                    };
                    if (madlibsData) {
                        settings.madlibsData = madlibsData;
                    }
                    if (seed !== undefined) settings.seed = seed;
                    if (negativePrompt) settings.negativePrompt = negativePrompt;
                    if (guidanceScale !== undefined) settings.guidanceScale = guidanceScale;

                    const imageData: Omit<GeneratedImage, 'id'> = {
                        userId,
                        prompt,
                        settings,
                        imageUrl,
                        storagePath: filename,
                        creditsCost: singleCost,
                        createdAt: Timestamp.now(),
                        downloadCount: 0,
                        ...(sourceImageId && { sourceImageId }),
                        ...(promptSetID && { promptSetID }),
                    };

                    const imageDoc = await adminDb.collection('users').doc(userId).collection('images').add(imageData);
                    generatedImagesData.push({ ...imageData, id: imageDoc.id });

                    // Send individual image completion event
                    await sendEvent({ type: 'image_ready', image: { ...imageData, id: imageDoc.id }, index: i });
                }

                // Deduct credits
                const dailyDeduction = Math.min(actualTotalCost, remainingDaily);
                const balanceDeduction = actualTotalCost - dailyDeduction;

                await creditsRef.update({
                    balance: FieldValue.increment(-balanceDeduction),
                    dailyAllowanceUsed: isNewDay ? dailyDeduction : FieldValue.increment(dailyDeduction),
                    lastDailyReset: isNewDay ? Timestamp.now() : credits.lastDailyReset,
                    totalUsed: FieldValue.increment(actualTotalCost),
                });

                // Add credit transaction
                await adminDb.collection('users').doc(userId).collection('creditHistory').add({
                    type: 'usage',
                    amount: -actualTotalCost,
                    description: `Generation (${actualCount} images, ${quality} quality)`,
                    metadata: {
                        quality,
                        aspectRatio,
                        promptType,
                        count: actualCount,
                        isAdvanced: isUsingAdvanced
                    },
                    createdAt: Timestamp.now(),
                });

                // Get updated credits
                const updatedCredits = (await creditsRef.get()).data()!;
                const newBalance = updatedCredits.balance + Math.max(0, updatedCredits.dailyAllowance - updatedCredits.dailyAllowanceUsed);

                // Send final completion event
                await sendEvent({
                    type: 'complete',
                    success: true,
                    images: generatedImagesData,
                    creditsUsed: actualTotalCost,
                    remainingBalance: newBalance,
                    warning: actualCount < count ? `Only ${actualCount} of ${count} images were generated successfully.` : undefined,
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
