import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);

        // Verify admin role
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (!userDoc.exists || !['admin', 'su'].includes(userDoc.data()?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all users
        const usersSnap = await adminDb.collection('users').get();
        const totalUsers = usersSnap.size;
        const proUsers = usersSnap.docs.filter(d => d.data().subscription === 'pro').length;

        // Count total images
        const imagesSnap = await adminDb.collectionGroup('images').count().get();
        const totalImages = imagesSnap.data().count;

        // Aggregate credits from each user's data/credits doc
        let totalCreditsHeld = 0;
        let totalLifetimeUsed = 0;

        await Promise.all(usersSnap.docs.map(async (userDoc) => {
            try {
                const creditDoc = await adminDb.collection('users').doc(userDoc.id).collection('data').doc('credits').get();
                if (creditDoc.exists) {
                    const data = creditDoc.data()!;
                    totalCreditsHeld += (data.balance || 0) + Math.max(0, (data.dailyAllowance || 0) - (data.dailyAllowanceUsed || 0));
                    totalLifetimeUsed += (data.totalUsed || 0);
                }
            } catch (e) {
                // Skip
            }
        }));

        return NextResponse.json({
            totalUsers,
            proUsers,
            totalImages,
            totalCreditsHeld,
            totalLifetimeUsed,
        });
    } catch (error: any) {
        console.error('Admin stats error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
