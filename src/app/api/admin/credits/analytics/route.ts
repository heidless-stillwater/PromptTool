import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { CreditTransaction } from '@/lib/types';

async function isAdmin(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;

    try {
        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        return !!decodedToken.uid;
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Overdraft Exposure & Top Users (from data/credits documents)
        const creditsSnap = await adminDb.collectionGroup('data').get();

        let totalOverdraft = 0;
        const usersBySpend: { userId: string, totalPurchased: number, balance: number }[] = [];

        creditsSnap.docs.forEach(doc => {
            if (doc.id !== 'credits') return;
            const data = doc.data();
            const balance = data.balance || 0;
            if (balance < 0) totalOverdraft += Math.abs(balance);

            usersBySpend.push({
                userId: doc.ref.parent.parent?.id || 'unknown',
                totalPurchased: data.totalPurchased || 0,
                balance: balance
            });
        });

        const topUsers = usersBySpend
            .sort((a, b) => b.totalPurchased - a.totalPurchased)
            .slice(0, 10);

        // 2. Revenue & Volume (from transaction history)
        let totalRevenue = 0;
        const dailyVolumes: Record<string, number> = {};

        try {
            const historySnap = await adminDb.collectionGroup('creditHistory')
                .orderBy('createdAt', 'desc')
                .limit(1000)
                .get();

            console.log(`Analytics: Found ${historySnap.docs.length} history records`);

            historySnap.docs.forEach(doc => {
                const tx = doc.data() as CreditTransaction;
                if (tx.type === 'purchase') {
                    totalRevenue += (tx.amount || 0);
                }

                if (tx.type === 'usage' && tx.createdAt) {
                    try {
                        const date = tx.createdAt.toDate().toISOString().split('T')[0];
                        dailyVolumes[date] = (dailyVolumes[date] || 0) + 1;
                    } catch (e) {
                        console.warn('Invalid timestamp in creditHistory', doc.id);
                    }
                }
            });
        } catch (historyErr: any) {
            console.error('History Query Failed (index likely missing):', historyErr.message);
            // Don't crash the whole response if only history fails
        }

        // Format daily volumes for sparkline (last 30 days)
        const last30Days: { date: string, count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            last30Days.push({
                date: ds,
                count: dailyVolumes[ds] || 0
            });
        }

        return NextResponse.json({
            totalRevenue,
            totalOverdraft,
            topUsers,
            dailyVolumes: last30Days,
            statsTimestamp: new Date().toISOString(),
            dbId: adminDb.databaseId, // Log which DB we are using
            recordsProcessed: {
                credits: usersBySpend.length,
                history: dailyVolumes ? Object.keys(dailyVolumes).length : 0
            }
        });
    } catch (err: any) {
        console.error('Analytics Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
