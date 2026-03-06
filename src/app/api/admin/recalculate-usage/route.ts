import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { redis, getRedisKey } from '@/lib/redis';

/**
 * Admin API to recalculate a user's usage from the source of truth (Firestore/Storage)
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        // Verify SU/Admin role
        const adminUserDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (!adminUserDoc.exists || !['admin', 'su'].includes(adminUserDoc.data()?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { targetUid } = body;

        if (!targetUid) {
            return NextResponse.json({ error: 'targetUid is required' }, { status: 400 });
        }

        console.log(`[Recalculate] Recomputing usage for user: ${targetUid}`);

        // 1. Calculate Storage from Storage Bucket (Source of Truth)
        const bucket = adminStorage.bucket();
        const [files] = await bucket.getFiles({ prefix: `users/${targetUid}/` });

        let totalStorageBytes = 0;
        for (const file of files) {
            totalStorageBytes += parseInt(String(file.metadata.size || '0'));
        }

        // 2. Calculate DB Writes (Optional: Reset to a baseline? Usually we just keep the daily count)
        // For now, let's just update the storageBytes which is the "leakiest" counter.

        const usageKey = getRedisKey.usage(targetUid);
        await redis.hset(usageKey, {
            'storageBytes': totalStorageBytes.toString()
        });

        console.log(`[Recalculate] User ${targetUid} usage updated to: ${totalStorageBytes} bytes.`);

        return NextResponse.json({
            success: true,
            uid: targetUid,
            newStorageBytes: totalStorageBytes,
            newStorageGB: (totalStorageBytes / (1024 ** 3)).toFixed(2)
        });

    } catch (error: any) {
        console.error('Recalculate usage error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
