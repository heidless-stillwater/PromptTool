import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. Parse Request
        const { sessionId } = await req.json();
        console.log(`[Stripe Verify] Received verification request:`, { userId, sessionId });
        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        console.log(`[Stripe Verify] Verifying session ${sessionId} for user ${userId}`);

        // 3. Retrieve Session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // 4. Security Check: Ensure session belongs to this user
        if (session.client_reference_id !== userId && session.metadata?.userId !== userId) {
            console.error('[Stripe Verify] Session user mismatch', {
                sessionUser: session.client_reference_id || session.metadata?.userId,
                authUserId: userId
            });
            return NextResponse.json({ error: 'Session does not belong to user' }, { status: 403 });
        }

        // 5. Check Session Status
        if (session.status !== 'complete' || session.payment_status !== 'paid') {
            console.log(`[Stripe Verify] Session not paid. Status: ${session.status}, Payment: ${session.payment_status}`);
            return NextResponse.json({
                success: false,
                status: session.status,
                paymentStatus: session.payment_status,
                message: 'Payment not yet confirmed by Stripe'
            });
        }

        const sessionType = session.metadata?.type;

        // 6. Handle One-Time Credit Purchase
        if (sessionType === 'credit_purchase') {
            const creditsAmount = parseInt(session.metadata?.credits || '0');
            const packId = session.metadata?.packId;

            if (!creditsAmount) {
                return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
            }

            // Check for existing transaction with this session ID
            const historyQuery = await adminDb.collection('users').doc(userId)
                .collection('creditHistory')
                .where('metadata.stripeSessionId', '==', session.id)
                .limit(1)
                .get();

            if (!historyQuery.empty) {
                return NextResponse.json({ success: true, alreadyProcessed: true });
            }

            console.log(`[Stripe Verify] Granting ${creditsAmount} credits to ${userId} (Pack: ${packId})`);

            const { AdminCreditsService } = await import('@/lib/services/admin-credits');
            const creditsService = new AdminCreditsService(userId);

            await creditsService.addCredits(
                creditsAmount,
                'purchase',
                `Credit Pack Purchase (Manual Verify): ${packId}`,
                { stripeSessionId: session.id, packId }
            );

            return NextResponse.json({
                success: true,
                message: `Successfully added ${creditsAmount} credits!`,
                credits: creditsAmount
            });
        }

        // 7. Handle Subscription (Legacy/Transition)
        const planId = session.metadata?.planId as SubscriptionTier;
        if (!planId) return NextResponse.json({ error: 'Unrecognized session type' }, { status: 400 });

        const plan = SUBSCRIPTION_PLANS[planId];
        if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

        // Update Profile & Credits
        await adminDb.collection('users').doc(userId).update({
            subscription: planId,
            updatedAt: Timestamp.now(),
        });

        const { AdminCreditsService } = await import('@/lib/services/admin-credits');
        const creditsService = new AdminCreditsService(userId);
        await creditsService.addCredits(
            plan.creditsPerMonth,
            'subscription',
            `Subscription Upgrade (Manual Verify): ${plan.name}`,
            { stripeSessionId: session.id, planId }
        );

        return NextResponse.json({
            success: true,
            message: `Successfully upgraded to ${plan.name}!`,
            plan: planId
        });

    } catch (err: any) {
        console.error('[Stripe Verify] Error:', err);
        return NextResponse.json({
            error: 'Failed to verify session',
            details: err.message || 'Unknown error'
        }, { status: 500 });
    }
}
