import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getDynamicPlans } from '@/lib/services/plans';
import { SubscriptionTier } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        // Verify SU/Admin role
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (!userDoc.exists || !['admin', 'su'].includes(userDoc.data()?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Aggregate Global Pulse
        const historySnap = await adminDb.collection('usage_history').get();

        const globalUsage = {
            storageBytes: 0,
            dbWritesDaily: 0,
            cpuTimeMsPerMonth: 0
        };

        const tierCounts: Record<string, number> = {
            free: 0,
            standard: 0,
            pro: 0
        };

        const userBreakdown: any[] = [];

        historySnap.docs.forEach(doc => {
            const data = doc.data();
            const usage = data.usage || {};

            globalUsage.storageBytes += Number(usage.storageBytes || 0);
            globalUsage.dbWritesDaily += Number(usage.dbWritesDaily || 0);
            globalUsage.cpuTimeMsPerMonth += Number(usage.cpuTimeMsPerMonth || 0);

            userBreakdown.push({
                uid: data.uid,
                usage: usage,
                lastSyncedAt: data.lastSyncedAt?.toDate()
            });
        });

        // Get total limits across all users (for capacity planning)
        const usersSnap = await adminDb.collection('users').get();
        const plans = await getDynamicPlans();

        let totalCapacityStorage = 0;

        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            const rawTier = data.subscription || 'free';
            const tier = rawTier as SubscriptionTier;

            tierCounts[tier] = (tierCounts[tier] || 0) + 1;

            const plan = plans[tier];
            if (plan?.resourceQuotas) {
                totalCapacityStorage += Number(plan.resourceQuotas.storageBytes || 0);
            }
        });

        return NextResponse.json({
            success: true,
            pulse: globalUsage,
            capacity: {
                totalStorageBytes: totalCapacityStorage,
                totalStorageGB: totalCapacityStorage / (1024 ** 3),
                activeUsersCount: historySnap.size,
                totalUsersCount: usersSnap.size,
                tierCounts
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Resource Pulse API error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
