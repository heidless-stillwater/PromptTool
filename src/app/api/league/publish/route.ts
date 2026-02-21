// League Publish/Unpublish API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { LeagueService } from '@/lib/services/league';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('Authorization');
        let userId: string;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageId, action } = body; // action: 'publish' | 'unpublish'

        if (!imageId || !action) {
            return NextResponse.json({ error: 'Missing imageId or action' }, { status: 400 });
        }

        if (action === 'publish') {
            const result = await LeagueService.publishImage({ userId, imageId });
            return NextResponse.json({
                success: true,
                ...result
            });
        } else if (action === 'unpublish') {
            const result = await LeagueService.unpublishImage({ userId, imageId });
            return NextResponse.json({
                success: true,
                ...result
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[League Publish] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
