import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
        const { displayName, bio, socialLinks, bannerUrl } = body;

        // Basic Validation
        if (displayName && displayName.trim().length > 50) {
            return NextResponse.json({ error: 'Display name too long (max 50 chars)' }, { status: 400 });
        }
        if (bio && bio.length > 500) {
            return NextResponse.json({ error: 'Bio too long (max 500 chars)' }, { status: 400 });
        }

        const updateData: any = {
            updatedAt: Timestamp.now()
        };

        if (displayName !== undefined) updateData.displayName = displayName.trim();
        if (bio !== undefined) updateData.bio = bio;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;

        await adminDb.collection('users').doc(userId).update(updateData);

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error: any) {
        console.error('[API] Profile Update Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to update profile'
        }, { status: 500 });
    }
}
