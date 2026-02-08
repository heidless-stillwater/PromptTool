// Image Generation API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { getNanoBananaService } from '@/lib/services/nanobanana';
import { CREDIT_COSTS, ImageQuality, AspectRatio, GeneratedImage, MadLibsSelection, SUBSCRIPTION_PLANS } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

interface GenerateRequest {
    prompt: string;
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    promptType: 'freeform' | 'madlibs';
    madlibsData?: MadLibsSelection;
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

        const { prompt, quality, aspectRatio, promptType, madlibsData } = body;

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

        // Get and validate credits
        const creditsRef = adminDb.collection('users').doc(userId).collection('data').doc('credits');
        const creditsDoc = await creditsRef.get();

        if (!creditsDoc.exists) {
            return NextResponse.json({ error: 'Credits not found' }, { status: 404 });
        }

        const credits = creditsDoc.data()!;
        const cost = CREDIT_COSTS[quality];

        // Check for daily reset
        const lastReset = credits.lastDailyReset.toDate();
        const today = new Date();
        const isNewDay = lastReset.toDateString() !== today.toDateString();

        let currentDailyUsed = isNewDay ? 0 : credits.dailyAllowanceUsed;
        const remainingDaily = Math.max(0, credits.dailyAllowance - currentDailyUsed);
        const totalAvailable = credits.balance + remainingDaily;

        if (totalAvailable < cost) {
            return NextResponse.json({
                error: `Insufficient credits. Need ${cost}, have ${totalAvailable}`
            }, { status: 402 });
        }

        // Generate image
        const nanoBananaService = getNanoBananaService();
        const result = await nanoBananaService.generateImage({
            prompt,
            quality,
            aspectRatio,
        });

        if (!result.success || !result.imageData) {
            return NextResponse.json({ error: result.error || 'Image generation failed' }, { status: 500 });
        }

        // Upload to Firebase Storage
        const bucket = adminStorage.bucket();
        const filename = `users/${userId}/images/${Date.now()}.png`;
        const file = bucket.file(filename);

        const imageBuffer = Buffer.from(result.imageData, 'base64');
        await file.save(imageBuffer, {
            metadata: {
                contentType: result.mimeType || 'image/png',
            },
        });

        // Make the file publicly accessible
        await file.makePublic();
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        // Deduct credits
        const dailyDeduction = Math.min(cost, remainingDaily);
        const balanceDeduction = cost - dailyDeduction;

        await creditsRef.update({
            balance: FieldValue.increment(-balanceDeduction),
            dailyAllowanceUsed: isNewDay ? dailyDeduction : FieldValue.increment(dailyDeduction),
            lastDailyReset: isNewDay ? Timestamp.now() : credits.lastDailyReset,
            totalUsed: FieldValue.increment(cost),
        });

        // Add credit transaction
        await adminDb.collection('users').doc(userId).collection('creditHistory').add({
            type: 'usage',
            amount: -cost,
            description: `Image generation (${quality} quality)`,
            metadata: { quality, aspectRatio, promptType },
            createdAt: Timestamp.now(),
        });

        // Save image metadata
        const imageData: Omit<GeneratedImage, 'id'> = {
            userId,
            prompt,
            settings: {
                quality,
                aspectRatio,
                prompt,
                promptType,
                madlibsData,
            },
            imageUrl,
            storagePath: filename,
            creditsCost: cost,
            createdAt: Timestamp.now(),
            downloadCount: 0,
        };

        const imageDoc = await adminDb.collection('users').doc(userId).collection('images').add(imageData);

        // Get updated credits
        const updatedCredits = (await creditsRef.get()).data()!;
        const newBalance = updatedCredits.balance + Math.max(0, updatedCredits.dailyAllowance - updatedCredits.dailyAllowanceUsed);

        return NextResponse.json({
            success: true,
            imageUrl,
            imageId: imageDoc.id,
            creditsUsed: cost,
            remainingBalance: newBalance,
        });

    } catch (error: any) {
        console.error('Generate API error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
