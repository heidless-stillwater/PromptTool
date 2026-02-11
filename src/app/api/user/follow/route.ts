// User Follow API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('Authorization');
        let currentUserId: string;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth.verifyIdToken(token);
            currentUserId = decodedToken.uid;
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { targetUserId, action } = body; // action: 'follow' | 'unfollow'

        if (!targetUserId || !action) {
            return NextResponse.json({ error: 'Missing targetUserId or action' }, { status: 400 });
        }

        if (currentUserId === targetUserId) {
            return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
        }

        const currentUserRef = adminDb.collection('users').doc(currentUserId);
        const targetUserRef = adminDb.collection('users').doc(targetUserId);

        const followingRef = currentUserRef.collection('following').doc(targetUserId);
        const followerRef = targetUserRef.collection('followers').doc(currentUserId);

        if (action === 'follow') {
            const followingDoc = await followingRef.get();
            if (followingDoc.exists) {
                return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
            }

            // Get user profiles for denormalized data
            const [currentUserDoc, targetUserDoc] = await Promise.all([
                currentUserRef.get(),
                targetUserRef.get()
            ]);

            if (!targetUserDoc.exists) {
                return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
            }

            const currentUserData = currentUserDoc.data()!;
            const targetUserData = targetUserDoc.data()!;

            const batch = adminDb.batch();

            // 1. Add to current user's following
            batch.set(followingRef, {
                uid: targetUserId,
                displayName: targetUserData.displayName || 'Anonymous',
                photoURL: targetUserData.photoURL || null,
                followedAt: Timestamp.now()
            });

            // 2. Add to target user's followers
            batch.set(followerRef, {
                uid: currentUserId,
                displayName: currentUserData.displayName || 'Anonymous',
                photoURL: currentUserData.photoURL || null,
                followedAt: Timestamp.now()
            });

            // 3. Update counts
            batch.set(currentUserRef, { followingCount: FieldValue.increment(1) }, { merge: true });
            batch.set(targetUserRef, { followerCount: FieldValue.increment(1) }, { merge: true });

            // 4. Send Notification to target
            const notifRef = targetUserRef.collection('notifications').doc();
            batch.set(notifRef, {
                userId: targetUserId,
                type: 'follow',
                actorId: currentUserId,
                actorName: currentUserData.displayName || 'Anonymous',
                actorPhotoURL: currentUserData.photoURL || null,
                read: false,
                createdAt: Timestamp.now()
            });

            await batch.commit();

            return NextResponse.json({
                success: true,
                message: 'User followed',
            });

        } else if (action === 'unfollow') {
            const followingDoc = await followingRef.get();
            if (!followingDoc.exists) {
                return NextResponse.json({ error: 'Not following this user' }, { status: 400 });
            }

            const batch = adminDb.batch();

            // 1. Remove from following
            batch.delete(followingRef);

            // 2. Remove from followers
            batch.delete(followerRef);

            // 3. Update counts
            batch.set(currentUserRef, { followingCount: FieldValue.increment(-1) }, { merge: true });
            batch.set(targetUserRef, { followerCount: FieldValue.increment(-1) }, { merge: true });

            await batch.commit();

            return NextResponse.json({
                success: true,
                message: 'User unfollowed',
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[User Follow] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
