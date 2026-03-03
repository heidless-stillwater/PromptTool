import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminAuth } from '@/lib/firebase-admin';
import { CreditConfigService } from '@/lib/services/credit-config';

/**
 * Creates a Stripe Checkout Session for a one-time credit pack purchase.
 */
// Trivial comment to trigger rebuild
export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Request & Validate Pack
        const { packId, refillTarget } = await req.json();
        const config = await CreditConfigService.getConfig();
        const pack = config.packs.find(p => p.id === packId);

        if (!pack) {
            return NextResponse.json({ error: 'Invalid credit pack ID' }, { status: 400 });
        }

        // 3. Create Stripe Checkout Session (One-time payment mode)
        console.log('[Stripe] Creating checkout session:', {
            userId,
            packId: pack.id,
            priceId: pack.stripePriceId,
            appUrl: process.env.NEXT_PUBLIC_APP_URL
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: pack.name,
                            description: `${pack.credits} Energy Credits for Stillwater Studio`,
                        },
                        unit_amount: pack.priceCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time purchase
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                packId: pack.id,
                credits: pack.credits,
                type: 'credit_purchase',
                refillTarget: refillTarget || ''
            }
        });

        console.log('[Stripe] Session created:', session.id);
        return NextResponse.json({ url: session.url });

    } catch (err: any) {
        console.error('[Stripe One-Time Checkout] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
