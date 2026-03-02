import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { decrementResourceQuota } from '@/lib/resource-guard';

/**
 * Robust User API for deleting images with full cleanup:
 * 1. Deletes Firestore Document
 * 2. Deletes Cloud Storage Object
 * 3. Decrements Redis Usage Quota
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = await adminAuth.verifyIdToken(token);
        const userId = decoded.uid;

        const { imageIds } = await request.json();
        if (!Array.isArray(imageIds) || imageIds.length === 0) {
            return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
        }

        const bucket = adminStorage.bucket();
        const results = {
            deleted: 0,
            failed: 0,
            totalBytesFreed: 0
        };

        for (const id of imageIds) {
            try {
                const imgRef = adminDb.collection('users').doc(userId).collection('images').doc(id);
                const imgSnap = await imgRef.get();

                if (imgSnap.exists) {
                    const data = imgSnap.data();
                    const byteSize = Number(data?.byteSize || 0);
                    const storagePath = data?.storagePath;

                    // A. Delete from Cloud Storage
                    if (storagePath) {
                        try {
                            await bucket.file(storagePath).delete();
                        } catch (e) {
                            console.warn(`[Delete API] Storage file not found: ${storagePath}`);
                        }
                    }

                    // B. Delete Firestore Doc
                    await imgRef.delete();

                    // C. Decrement Redis quota
                    if (byteSize > 0) {
                        await decrementResourceQuota(userId, 'storageBytes', byteSize);
                        results.totalBytesFreed += byteSize;
                    }

                    results.deleted++;
                }
            } catch (err) {
                console.error(`[Delete API] Failed to delete image ${id}:`, err);
                results.failed++;
            }
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error('Delete API error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
