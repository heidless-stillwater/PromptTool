import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

/**
 * Fetches users currently in overdraft (negative balance).
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Query users with balance < 0
        // Query users from data/credits
        const dataSnap = await adminDb.collectionGroup('data').get();

        const results = dataSnap.docs
            .filter(doc => doc.id === 'credits')
            .map(doc => ({
                userId: doc.ref.parent.parent?.id,
                ...doc.data() as any
            }))
            .filter(user => user.balance < 0);

        return NextResponse.json(results);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
