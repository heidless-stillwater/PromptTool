'use client';
import { Suspense } from 'react';

import { useAuth } from '@/lib/auth-context';
import { CreditPack, CreditSystemConfig } from '@/lib/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

function PricingPageContent() {
    const { user, profile, credits, loading: authLoading } = useAuth();
    const [config, setConfig] = useState<CreditSystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingPack, setProcessingPack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const justPurchased = searchParams.get('success') === 'true';

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/admin/credits/config');
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data);
                }
            } catch (e) {
                console.error('Failed to fetch credit config', e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handlePurchase = async (packId: string) => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        setProcessingPack(packId);
        setError(null);

        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/stripe/checkout-one-time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ packId }),
            });

            const data = await response.json();

            if (data.url) {
                // Stripe will redirect back to success_url which points to /dashboard
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (err: any) {
            console.error('Purchase error:', err);
            setError(err.message);
        } finally {
            setProcessingPack(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const availableCredits = credits?.balance || 0;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Icons.zap size={16} className="text-primary fill-primary" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-tighter">Stillwater <span className="text-primary">Studio</span></span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Current Balance</span>
                            <span className={cn("text-xs font-black", availableCredits < 0 ? "text-error" : "text-primary")}>
                                {availableCredits} ENERGY
                            </span>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:text-white transition-colors">
                            <Icons.arrowLeft size={12} /> Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-8 py-20">
                <div className="text-center mb-20 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary mb-4">
                        <Icons.zap size={12} className="fill-primary" /> Secure Top-Up System
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                        Recharge Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-stillwater-teal to-accent">Neural Engine</span>
                    </h1>
                    <p className="text-foreground-muted text-lg max-w-xl mx-auto font-medium">
                        Pure prepaid credits. No subscriptions. No expiring daily limits. Just pure creative power whenever you need it.
                    </p>
                </div>

                {error && (
                    <div className="max-w-md mx-auto mb-12 p-6 bg-error/10 border border-error/20 rounded-[2rem] text-error text-center text-xs font-black uppercase tracking-widest shadow-2xl">
                        <Icons.alert className="mx-auto mb-2" size={20} />
                        {error}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6 items-stretch min-h-[400px]">
                    {!loading && (!config || config.packs.length === 0) ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-error/10 flex items-center justify-center text-error border border-error/20">
                                <Icons.alert size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Deployment Data Missing</h3>
                                <p className="text-foreground-muted text-sm max-w-sm mx-auto mt-2">
                                    The secure refill gateway is currently unavailable. Please verify your connection or contact system administration.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="mt-4 uppercase font-black text-[10px] tracking-widest text-primary hover:bg-primary/10 border border-primary/20"
                                onClick={() => window.location.reload()}
                            >
                                Retry Connection
                            </Button>
                        </div>
                    ) : (
                        config?.packs.map((pack) => {
                            const isMostPopular = pack.isMostPopular;

                            return (
                                <Card
                                    key={pack.id}
                                    variant={isMostPopular ? 'glass' : 'default'}
                                    className={cn(
                                        "relative group p-10 rounded-[3rem] transition-all duration-500 border flex flex-col justify-between",
                                        isMostPopular
                                            ? "bg-primary/5 border-primary/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] scale-105 z-10"
                                            : "bg-background-secondary/50 border-white/5 hover:border-primary/20"
                                    )}
                                >
                                    {isMostPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white shadow-xl shadow-primary/30 rounded-full px-6 py-1.5 text-[9px] font-black uppercase tracking-widest">
                                            Best Value
                                        </div>
                                    )}

                                    <div>
                                        <div className="mb-10">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground-muted mb-6">{pack.name}</h3>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-6xl font-black tracking-tighter text-white">
                                                    {pack.credits}
                                                </span>
                                                <span className="text-primary font-black text-xs uppercase tracking-widest">Credits</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-12">
                                            <div className="flex items-center gap-3 text-[11px] font-bold text-white/60">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <Icons.check className="text-emerald-500" size={12} />
                                                </div>
                                                Universal Priority Access
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] font-bold text-white/60">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <Icons.check className="text-emerald-500" size={12} />
                                                </div>
                                                Never Expire Status
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] font-bold text-white/60">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <Icons.check className="text-emerald-500" size={12} />
                                                </div>
                                                100% Commercial Usage
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-center mb-2">
                                            <span className="text-2xl font-black text-white/90">
                                                ${(pack.priceCents / 100).toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-white/20 font-black uppercase tracking-widest ml-2">One-time</span>
                                        </div>

                                        <Button
                                            onClick={() => handlePurchase(pack.id)}
                                            disabled={processingPack === pack.id}
                                            isLoading={processingPack === pack.id}
                                            className={cn(
                                                "w-full h-16 rounded-2xl font-black uppercase tracking-widest transition-all duration-500 text-xs shadow-2xl",
                                                isMostPopular
                                                    ? "bg-primary text-white hover:shadow-primary/40 hover:-translate-y-1"
                                                    : "bg-white text-black hover:bg-white/90 hover:-translate-y-1"
                                            )}
                                        >
                                            Deploy Pack
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>

                <div className="mt-32 p-12 rounded-[3.5rem] bg-white/[0.02] border border-white/5 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 space-y-6">
                        <Icons.info className="mx-auto text-primary" size={32} />
                        <h3 className="text-2xl font-black uppercase tracking-tight italic">Low Energy Protocols</h3>
                        <p className="text-foreground-muted text-sm max-w-lg mx-auto font-medium">
                            Running low? Our **Oxygen Tank** system allows masters to complete critical generations even when at zero balance. Enable it in your settings to never miss a breakthrough.
                        </p>
                        <Link href="/settings">
                            <Button variant="ghost" className="uppercase font-black text-[10px] tracking-[0.2em] text-primary hover:bg-primary/10 border border-primary/20 px-8 h-12 rounded-xl">
                                Configure Overdraft Settings
                            </Button>
                        </Link>
                    </div>
                </div>

                <footer className="mt-20 text-center space-y-4">
                    <p className="text-foreground-muted text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                        Institutional Grade Security • Stripe Global Processing • Zero Transaction Fees
                    </p>
                </footer>
            </main >
        </div >
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <PricingPageContent />
        </Suspense>
    );
}
