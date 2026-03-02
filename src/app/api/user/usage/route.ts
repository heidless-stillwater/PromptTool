import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { redis, getRedisKey } from '@/lib/redis';
import { getQuotasForTier } from '@/lib/services/plans';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionTier } from '@/lib/types';

export const GET = withApiHandler({
    requireAuth: true,
    handler: async (req, { userId }) => {
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const usageKey = getRedisKey.usage(userId);
        const burstKey = getRedisKey.burst(userId);

        // Fetch usage and burst status from Redis
        const [usage, burstUsed, burstAuthorized] = await Promise.all([
            redis.hgetall<Record<string, number>>(usageKey),
            redis.get<boolean>(burstKey),
            redis.get<boolean>(getRedisKey.burstAuthorized(userId))
        ]);

        // Fetch user tier (cached in getUserTier logic, but here we'll pull it fresh to be safe)
        const userRef = adminDb.collection('users').doc(userId);
        const snap = await userRef.get();
        const tier = (snap.data()?.subscription as SubscriptionTier) || 'free';
        const quotas = await getQuotasForTier(tier);

        return NextResponse.json({
            success: true,
            usage: usage || {},
            quotas,
            burstUsed: !!burstUsed,
            burstAuthorized: !!burstAuthorized,
            tier
        });
    }
});
