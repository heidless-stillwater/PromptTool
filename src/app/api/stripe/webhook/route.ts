import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { SubscriptionTier } from '@/lib/types';
import { getDynamicPlans } from '@/lib/services/plans';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;

    try {
        if (!sig || !endpointSecret) {
            console.error('[Stripe Webhook] Missing signature or secret');
            return NextResponse.json({ error: 'Webhook Secret not configured' }, { status: 400 });
        }
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`[Stripe Webhook] Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    try {
        const dynamicPlans = await getDynamicPlans();

        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as any;
                const userId = session.client_reference_id;
                const sessionType = session.metadata?.type;

                if (!userId) {
                    console.error('[Stripe Webhook] Missing userId in session', { userId });
                    break;
                }

                // 1. Handle One-Time Credit Purchase (Prepaid Model)
                if (sessionType === 'credit_purchase') {
                    const creditsAmount = parseInt(session.metadata?.credits || '0');
                    const packId = session.metadata?.packId;

                    if (!creditsAmount) {
                        console.error('[Stripe Webhook] Missing credits amount in metadata');
                        break;
                    }

                    console.log(`[Stripe Webhook] Granting ${creditsAmount} credits to user: ${userId}`);

                    const { AdminCreditsService } = await import('@/lib/services/admin-credits');
                    const creditsService = new AdminCreditsService(userId);

                    await creditsService.addCredits(
                        creditsAmount,
                        'purchase',
                        `Credit Pack Purchase: ${packId}`,
                        { stripeSessionId: session.id, packId }
                    );

                    break;
                }

                // 2. Handle Subscription (Legacy/Transition)
                const planId = session.metadata?.planId as SubscriptionTier;
                if (planId) {
                    console.log(`[Stripe Webhook] Processing successful subscription for user: ${userId}, plan: ${planId}`);

                    const plan = dynamicPlans[planId];
                    if (!plan) {
                        console.error('[Stripe Webhook] Plan not found in dynamic config:', planId);
                        break;
                    }

                    // Update User Profile
                    await adminDb.collection('users').doc(userId).update({
                        subscription: planId,
                        updatedAt: Timestamp.now(),
                    });

                    // Grant Bonus Credits via CreditsService (for proper ledger/recovery)
                    const { AdminCreditsService } = await import('@/lib/services/admin-credits');
                    const creditsService = new AdminCreditsService(userId);
                    await creditsService.addCredits(
                        plan.creditsPerMonth,
                        'subscription',
                        `Subscription Upgrade: ${plan.name}`,
                        { stripeSessionId: session.id, planId }
                    );
                }
                break;

            case 'customer.subscription.deleted':
                // Handle legacy cancellation
                const subscription = event.data.object as any;
                const subUserId = subscription.metadata?.userId;

                if (subUserId) {
                    await adminDb.collection('users').doc(subUserId).update({
                        subscription: 'free',
                        updatedAt: Timestamp.now(),
                    });
                }
                break;

            default:
                console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });

    } catch (err: any) {
        console.error('[Stripe Webhook] Processing Error:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

// Ensure the raw body is preserved for Stripe signature verification
// In App Router, we consume the body as text/buffer manually, so we don't need bodyParser: false config.
export const dynamic = 'force-dynamic';
