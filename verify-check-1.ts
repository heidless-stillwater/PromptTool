import { redis } from './src/lib/redis';
import { SUBSCRIPTION_PLANS } from './src/lib/types';

async function verifyCheck1() {
    console.log('--- Check 1: Configuration & Infra Setup ---');

    // 1. Redis Connection Test
    try {
        const ping = await redis.ping();
        console.log(`✅ Redis Connection: ${ping === 'PONG' ? 'SUCCESS' : 'Unexpected response: ' + ping}`);
        console.log('Logs: [Redis] Client initialized and responding.');
    } catch (error) {
        console.error('❌ Redis Connection FAILED:', error);
        console.log('Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.');
    }

    // 2. Quota Manifest Verification
    console.log('\n--- Quota Manifest ---');
    const tiers = ['free', 'standard', 'pro'] as const;

    tiers.forEach(tier => {
        const plan = SUBSCRIPTION_PLANS[tier];
        const q = plan.resourceQuotas;
        console.log(`[${tier.toUpperCase()}]`);
        console.log(` - Storage: ${q.storageBytes / (1024 ** 3)} GB`);
        console.log(` - DB Writes: ${q.dbWritesDaily}`);
        console.log(` - Collections: ${q.maxCollections === -1 ? 'Unlimited' : q.maxCollections}`);
    });

    const proStorage = SUBSCRIPTION_PLANS.pro.resourceQuotas.storageBytes;
    const standardStorage = SUBSCRIPTION_PLANS.standard.resourceQuotas.storageBytes;
    const freeStorage = SUBSCRIPTION_PLANS.free.resourceQuotas.storageBytes;

    if (proStorage > standardStorage && standardStorage > freeStorage) {
        console.log('\n✅ Quota Hierarchy: PRO > STANDARD > FREE');
    } else {
        console.log('\n❌ Quota Hierarchy: Hierarchy is incorrect!');
    }
}

verifyCheck1();
