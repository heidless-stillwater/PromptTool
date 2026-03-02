import { redis, getRedisKey } from './redis';
import { getQuotasForTier } from './services/plans';
import { SubscriptionTier, ResourceQuotas, RESOURCE_LABELS } from './types';
import { adminDb } from './firebase-admin';

export interface ResourceCheckResult {
    success: boolean;
    error?: string;
    remaining?: number;
    isBurstActive?: boolean;
}

/**
 * Fetches the user's current subscription tier and caches it in Redis for 1 hour.
 */
export async function getUserTier(uid: string): Promise<SubscriptionTier> {
    const planKey = getRedisKey.plan(uid);

    // Check cache first
    const cachedTier = await redis.get<SubscriptionTier>(planKey);
    if (cachedTier) return cachedTier;

    // Fallback to Firestore
    const userRef = adminDb.collection('users').doc(uid);
    const snap = await userRef.get();
    const tier = (snap.data()?.subscription as SubscriptionTier) || 'free';

    // Cache for 1 hour
    await redis.set(planKey, tier, { ex: 3600 });
    return tier;
}

/**
 * Checks and increments resource usage in Redis with Hard-Cap enforcement.
 * Supports "Oxygen Tank" burst credit fallback.
 */
export async function checkResourceQuota(
    uid: string,
    resource: keyof Omit<ResourceQuotas, 'burstAllowanceBytes'>,
    amount: number = 1
): Promise<ResourceCheckResult> {
    const tier = await getUserTier(uid);
    const quotas = await getQuotasForTier(tier);
    const usageKey = getRedisKey.usage(uid);
    const burstKey = getRedisKey.burst(uid);
    const authKey = getRedisKey.burstAuthorized(uid);

    // Unlimited check
    const limit = (quotas as any)[resource];
    if (limit === -1) {
        const newUsage = await redis.hincrby(usageKey, resource, amount);
        return { success: true, remaining: Infinity };
    }

    // Atomic increment and check
    const currentUsage = await redis.hget<number>(usageKey, resource) || 0;

    if (currentUsage + amount > limit) {
        // Check if "Oxygen Tank" can be deployed
        // For simplicity in this first pass, we check if a burst hasn't been used yet for this resource
        // In a more complex system, we might have a specific 'burst' flag.
        const isBurstUsed = await redis.get<boolean>(burstKey) || false;
        const isBurstAuthorized = await redis.get<boolean>(authKey) || false;
        const burstQuota = quotas.burstAllowanceBytes;

        // If it's a storage resource and they have burst authorized and not yet used
        if (resource === 'storageBytes' && !isBurstUsed && isBurstAuthorized && currentUsage + amount <= limit + burstQuota) {
            // Apply and consume burst
            await redis.set(burstKey, true);
            await redis.del(authKey); // Consume authorization
            await redis.hincrby(usageKey, resource, amount);
            return { success: true, isBurstActive: true, remaining: (limit + burstQuota) - (currentUsage + amount) };
        }

        return {
            success: false,
            error: `QUOTA_EXCEEDED: You have reached your ${RESOURCE_LABELS[resource] || resource} limit for the ${tier} plan.`,
            remaining: 0
        };
    }

    // Increment usage
    const newUsage = await redis.hincrby(usageKey, resource, amount);
    return { success: true, remaining: limit - newUsage };
}

/**
 * Decrements resource usage in Redis (e.g. on deletion).
 */
export async function decrementResourceQuota(
    uid: string,
    resource: keyof Omit<ResourceQuotas, 'burstAllowanceBytes'>,
    amount: number
): Promise<void> {
    const usageKey = getRedisKey.usage(uid);
    // Use negative increment to decrement
    await redis.hincrby(usageKey, resource, -Math.abs(amount));
}
