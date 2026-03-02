import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Background Sync Job: Redis -> Firestore
 * - Iterates over all user keys in Redis.
 * - Persists usage totals to Firestore `usage_history`.
 * - Optional: Resets daily counters (if handled here).
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.DEV_SECRET;

    // Security check
    if (authHeader !== `Bearer ${cronSecret}` && req.nextUrl.searchParams.get('key') !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[Sync Usage] Starting Redis to Firestore sync...');

        // 1. Find all user usage keys
        // Note: For very large user bases, we should use SCAN instead of KEYS
        const keys = await redis.keys('user:*:usage');
        const syncResults = [];

        for (const key of keys) {
            const uid = key.split(':')[1];
            const usage = await redis.hgetall(key);

            if (usage) {
                // Update Firestore usage_history
                const historyRef = adminDb.collection('usage_history').doc(uid);
                await historyRef.set({
                    uid,
                    lastSyncedAt: Timestamp.now(),
                    usage: usage,
                }, { merge: true });

                syncResults.push(uid);
            }
        }

        console.log(`[Sync Usage] Successfully synced ${syncResults.length} users.`);

        return NextResponse.json({
            success: true,
            syncedCount: syncResults.length,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Sync Usage] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
