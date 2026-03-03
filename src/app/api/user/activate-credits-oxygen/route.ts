import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { CreditsService } from '@/lib/services/credits';

/**
 * POST: Arms/Disarms the Oxygen Tank for the authenticated user.
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const { authorized } = await req.json();

        const creditsService = new CreditsService(userId);
        await creditsService.setOxygenAuthorization(authorized !== false); // default to true if not specified

        return NextResponse.json({ success: true, authorized: authorized !== false });

    } catch (err: any) {
        console.error('[Oxygen Activation] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
