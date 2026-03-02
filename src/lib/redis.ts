import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing Upstash Redis environment variables');
    } else {
        console.warn('⚠️ Missing Upstash Redis environment variables. Resource quotas will not be enforced.');
    }
}

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const getRedisKey = {
    usage: (uid: string) => `user:${uid}:usage`,
    plan: (uid: string) => `user:${uid}:plan`,
    burst: (uid: string) => `user:${uid}:burst_used`,
    burstAuthorized: (uid: string) => `user:${uid}:burst_authorized`,
};
