import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-handler';
import { getDynamicPlans, updateDynamicPlans, syncPlansToFirestore } from '@/lib/services/plans';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET: Fetch current active plans (dynamic or fallback)
 */
export async function GET() {
    try {
        const plans = await getDynamicPlans();
        return NextResponse.json(plans);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST: Update plans or trigger sync
 */
export async function POST(req: Request) {
    try {
        const { user } = await getAuthContext(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch role from Firestore for source of truth
        const userRef = adminDb.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        const role = userDoc.data()?.role;

        if (!['admin', 'su'].includes(role)) {
            return NextResponse.json({ error: 'Forbidden: Admin or SU access required' }, { status: 403 });
        }

        const data = await req.json();
        const { action, plans } = data;

        if (action === 'sync') {
            await syncPlansToFirestore();
            return NextResponse.json({ success: true, message: 'Plans synced from code to Firestore' });
        }

        if (action === 'update' && plans) {
            await updateDynamicPlans(plans);
            return NextResponse.json({ success: true, message: 'Plans updated successfully' });
        }

        return NextResponse.json({ error: 'Invalid action or missing plans data' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
