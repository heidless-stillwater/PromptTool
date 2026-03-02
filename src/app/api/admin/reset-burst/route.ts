import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { redis, getRedisKey } from '@/lib/redis';

/**
 * Admin API to reset a user's burst credit (Oxygen Tank) status.
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

        const burstKey = getRedisKey.burst(targetUid);
        const authKey = getRedisKey.burstAuthorized(targetUid);

        // Clear both used and authorized flag
        await Promise.all([
            redis.del(burstKey),
            redis.del(authKey)
        ]);

        console.log(`[Burst Reset] User ${targetUid} burst status cleared.`);

        return NextResponse.json({
            success: true,
            uid: targetUid,
            status: 'Reset successful'
        });

    } catch (error: any) {
        console.error('Reset burst status error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
