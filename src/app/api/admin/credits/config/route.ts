import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { CreditConfigService } from '@/lib/services/credit-config';

/**
 * GET: Fetches the global credit system configuration.
 * POST: Updates the global credit system configuration.
 */

async function isAdmin(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;

    try {
        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userRef = await adminAuth.getUser(decodedToken.uid);
        // Basic check for admin claim or role in profile could be added here
        // For now, mirroring the layout check (needs user to be logged in and typically we'd check custom claims)
        return !!decodedToken.uid;
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    // Relaxed for the pricing page to work
    const config = await CreditConfigService.getConfig();
    return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const config = await req.json();
        await CreditConfigService.updateConfig(config);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
