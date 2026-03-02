import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { redis, getRedisKey } from '@/lib/redis';
import { getQuotasForTier } from '@/lib/services/plans';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionTier } from '@/lib/types';

export const POST = withApiHandler({
    requireAuth: true,
    handler: async (req, { userId }) => {
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const burstKey = getRedisKey.burst(userId);
        const authKey = getRedisKey.burstAuthorized(userId);

        // 1. Check if already used
        const isUsed = await redis.get<boolean>(burstKey);
        if (isUsed) {
            return NextResponse.json({ success: false, error: 'Oxygen Tank has already been depleted for this month.' }, { status: 400 });
        }

        // 2. Set authorized flag (expire in 24 hours if not used, or keep it?)
        // The plan says "manual activation", let's keep it authorized until consumed or next month?
        // Let's set it to expire in 48 hours to prevent "forgotten" authorizations, 
        // but high enough for a session.
        await redis.set(authKey, true, { ex: 48 * 3600 });

        return NextResponse.json({
            success: true,
            message: 'Oxygen Tank armed. Your next storage-heavy operation will utilize the burst credit.'
        });
    }
});
