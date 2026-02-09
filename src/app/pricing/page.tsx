'use client';

import { useAuth } from '@/lib/auth-context';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
    const { user, profile, loading } = useAuth();
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleUpgrade = async (planId: SubscriptionTier) => {
        if (!user) {
            window.location.href = '/';
            return;
        }

        setProcessingPlan(planId);
        setError(null);

        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ planId }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (err: any) {
            console.error('Upgrade error:', err);
            setError(err.message);
        } finally {
            setProcessingPlan(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Nav */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>
                    <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                        ← Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-4">
                        Choose Your <span className="gradient-text">Creative Power</span>
                    </h1>
                    <p className="text-foreground-muted text-lg max-w-2xl mx-auto">
                        Unlock high-resolution generation, professional tools, and a massive daily credit allowance.
                    </p>
                </div>

                {error && (
                    <div className="max-w-md mx-auto mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-center text-sm">
                        {error}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-8 items-start">
                    {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
                        const isCurrent = profile?.subscription === plan.id;
                        const isPro = plan.id === 'pro';
                        const isFree = plan.id === 'free';

                        return (
                            <div
                                key={plan.id}
                                className={`relative group p-8 rounded-3xl border transition-all duration-300 ${isPro
                                        ? 'bg-accent/5 border-accent/20 shadow-[0_0_40px_rgba(217,70,239,0.1)] scale-105 z-10'
                                        : 'bg-background-secondary border-border hover:border-primary/30'
                                    }`}
                            >
                                {isPro && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-accent/20">
                                        Best Value
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black">
                                            ${plan.price === 0 ? '0' : (plan.price / 100).toFixed(2)}
                                        </span>
                                        <span className="text-foreground-muted">/mo</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex gap-3 text-sm">
                                            <svg className={`shrink-0 w-5 h-5 ${isPro ? 'text-accent' : 'text-primary'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                            <span className="text-foreground-muted group-hover:text-foreground transition-colors">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => !isCurrent && !isFree && handleUpgrade(plan.id)}
                                    disabled={isCurrent || isFree || processingPlan === plan.id}
                                    className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${isCurrent
                                            ? 'bg-foreground/5 text-foreground-muted cursor-default border border-border'
                                            : isFree
                                                ? 'bg-foreground/5 text-foreground-muted cursor-default'
                                                : isPro
                                                    ? 'bg-accent text-white hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-1'
                                                    : 'bg-primary text-white hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-1'
                                        }`}
                                >
                                    {processingPlan === plan.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </span>
                                    ) : isCurrent ? (
                                        'Active Plan'
                                    ) : isFree ? (
                                        'Default'
                                    ) : (
                                        `Upgrade to ${plan.name}`
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-20 text-center">
                    <p className="text-foreground-muted text-sm italic">
                        All payments are processed securely via Stripe.
                        Bonus credits are added instantly upon successful checkout.
                    </p>
                </div>
            </main>
        </div>
    );
}
