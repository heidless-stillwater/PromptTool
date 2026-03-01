/**
 * Simple Memory-based Token Bucket Rate Limiter
 * Suitable for low-scale production launch.
 * In a multi-instance/serverless environment, this should be moved to Redis (Upstash)
 */

type RateLimitStore = {
    [key: string]: {
        tokens: number;
        lastRefill: number;
    };
};

const store: RateLimitStore = {};

type RateLimitConfig = {
    limit: number;      // Max tokens
    window: number;     // Window in milliseconds
    keyPrefix?: string;
};

export async function rateLimit(key: string, config: RateLimitConfig): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const fullKey = `${config.keyPrefix || 'rl'}:${key}`;
    const entry = store[fullKey] || { tokens: config.limit, lastRefill: now };

    // Calculate refill
    const timePassed = now - entry.lastRefill;
    const refillTokens = Math.floor(timePassed / (config.window / config.limit));

    entry.tokens = Math.min(config.limit, entry.tokens + refillTokens);
    entry.lastRefill = now;

    if (entry.tokens > 0) {
        entry.tokens -= 1;
        store[fullKey] = entry;
        return { success: true, remaining: entry.tokens };
    }

    store[fullKey] = entry;
    return { success: false, remaining: 0 };
}

/**
 * Cleanup expired entries to prevent memory leaks
 */
setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
        // If an entry hasn't been Refilled in 1 hour, remove it
        if (now - store[key].lastRefill > 60 * 60 * 1000) {
            delete store[key];
        }
    });
}, 15 * 60 * 1000); // Every 15 minutes
