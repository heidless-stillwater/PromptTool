'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SystemConfig } from '@/lib/types';
import Image from 'next/image';

export default function HomePage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();
    const [config, setConfig] = useState<SystemConfig | null>(null);

    // Redirect to dashboard if logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // Fetch system config for dynamic incentives
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const snap = await getDoc(doc(db, 'system', 'config'));
                if (snap.exists()) {
                    setConfig(snap.data() as SystemConfig);
                }
            } catch (e) {
                console.warn('Failed to fetch landing page config', e);
            }
        };
        fetchConfig();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#0a0a0f] text-foreground selection:bg-primary/30">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-stillwater-teal flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                            <Icons.sparkles className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-black uppercase tracking-tighter">Stillwater <span className="text-primary">Studio</span></span>
                    </div>
                    <Button
                        onClick={signInWithGoogle}
                        variant="ghost"
                        className="text-xs font-black uppercase tracking-widest hover:bg-white/5"
                    >
                        Sign In
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/assets/landing/hero.png"
                        alt="Stillwater Studio Hero"
                        fill
                        className="object-cover opacity-40 mix-blend-luminosity scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/80 via-[#0a0a0f]/20 to-[#0a0a0f]" />
                </div>

                <div className="relative z-10 text-center max-w-5xl mx-auto space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-1000">
                        <span className="w-2 h-2 rounded-full bg-stillwater-teal animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Redefining Digital Imagination</span>
                    </div>

                    <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.85] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        Where Imagery <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-stillwater-teal to-accent">Finds Perfection</span>
                    </h1>

                    <p className="text-lg md:text-2xl text-foreground-muted max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
                        The definitive studio for creators. From effortless AI concepts to master-grade cinematic production.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600">
                        <Button
                            onClick={signInWithGoogle}
                            size="lg"
                            className="h-16 px-12 group relative overflow-hidden bg-primary hover:bg-primary-hover rounded-2xl shadow-2xl shadow-primary/20"
                        >
                            <span className="relative z-10 flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                                Enter the Studio
                                <Icons.arrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Free to start • No card required</p>
                    </div>
                </div>
            </section>

            {/* Novice vs Master Showcase */}
            <section className="py-32 px-6 relative overflow-hidden bg-white/[0.01]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        {/* Novice Side */}
                        <div className="flex-1 space-y-8">
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">01 / The Novice</span>
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Effortless <br />Creation</h2>
                                <p className="text-foreground-muted font-medium leading-relaxed">
                                    Not a prompt engineer? No problem. Use our intuitive Mad Libs interface to assemble stunning visuals with zero learning curve.
                                </p>
                            </div>
                            <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl group border border-white/5">
                                <Image src="/assets/landing/novice.png" alt="Novice Result" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">"A cute golden retriever wearing a space suit, claymation style"</p>
                                </div>
                            </div>
                        </div>

                        {/* Master Side */}
                        <div className="flex-1 space-y-8 md:pt-24 line-glow">
                            <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl group border border-primary/20 bg-primary/5">
                                <Image src="/assets/landing/master.png" alt="Master Result" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">"Hyper-detailed iridescent mechanical butterfly wings, 8K Ultra, Seed 42201"</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent">02 / The Master</span>
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Professional <br />Precision</h2>
                                <p className="text-foreground-muted font-medium leading-relaxed">
                                    For the power users who demand total control. Access Negative Prompts, Guidance Scaling, Seed manipulation, and 4K Batching.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The League / Community */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto text-center space-y-16">
                    <div className="space-y-6 max-w-3xl mx-auto">
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">The League of <br /><span className="text-primary">Stillwater</span></h2>
                        <p className="text-lg text-foreground-muted font-medium">Join a competitive community of digital artists. Share your best prompt recipes and climb the influence rankings.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative group">
                                <Image
                                    src={`/assets/landing/league-${i}.png`}
                                    alt={`League Showcase ${i}`}
                                    fill
                                    className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 grayscale group-hover:grayscale-0"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm" />
                                    <div className="flex gap-1">
                                        <div className="w-12 h-2 rounded-full bg-white/20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Signup Incentives Funnel */}
            {config?.incentives && (
                <section className="py-32 px-6 relative">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <Card variant="glass" className="p-8 md:p-16 rounded-[3rem] border-primary/20 relative overflow-hidden shadow-2xl bg-primary/5">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <Icons.sparkles className="w-48 h-48 text-primary" />
                            </div>

                            <div className="relative z-10 text-center space-y-12">
                                <div className="space-y-4">
                                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight">
                                        Join for Free <br />
                                        <span className="text-primary">Claim Your Launch Kit</span>
                                    </h2>
                                    <p className="text-foreground-muted font-bold uppercase tracking-widest text-xs">Limited time early-access rewards</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {config.incentives.welcomeCredits.enabled && (
                                        <div className="p-6 rounded-3xl bg-black/50 border border-white/5 flex flex-col items-center gap-3">
                                            <span className="text-3xl">🪙</span>
                                            <div className="text-center">
                                                <p className="text-xl font-black tracking-tight">{config.incentives.welcomeCredits.amount} Credits</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Welcome Gift</p>
                                            </div>
                                        </div>
                                    )}
                                    {config.incentives.founderBadge.enabled && (
                                        <div className="p-6 rounded-3xl bg-black/50 border border-white/5 flex flex-col items-center gap-3">
                                            <span className="text-3xl text-founder-gold">🎖️</span>
                                            <div className="text-center">
                                                <p className="text-xl font-black tracking-tight">Founder Badge</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Early Access Role</p>
                                            </div>
                                        </div>
                                    )}
                                    {config.incentives.masterPass.enabled && (
                                        <div className="p-6 rounded-3xl bg-black/50 border border-white/5 flex flex-col items-center gap-3">
                                            <span className="text-3xl">🔑</span>
                                            <div className="text-center">
                                                <p className="text-xl font-black tracking-tight">{config.incentives.masterPass.durationHours}h Master Pass</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Pro Feature Eval</p>
                                            </div>
                                        </div>
                                    )}
                                    {config.incentives.communityBoost.enabled && (
                                        <div className="p-6 rounded-3xl bg-black/50 border border-white/5 flex flex-col items-center gap-3">
                                            <span className="text-3xl text-primary">🚀</span>
                                            <div className="text-center">
                                                <p className="text-xl font-black tracking-tight">{config.incentives.communityBoost.multiplier}x Influence</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Visibility Boost</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6 pt-6">
                                    <Button
                                        onClick={signInWithGoogle}
                                        size="lg"
                                        className="h-16 px-16 bg-white text-black hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-white/10"
                                    >
                                        Claim Rewards Now
                                    </Button>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Join 1,000+ artists in the Stillwater community</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="py-24 px-6 border-t border-white/5 bg-background">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <Icons.sparkles className="text-primary w-5 h-5" />
                            <span className="font-black uppercase tracking-tighter">Stillwater Studio</span>
                        </div>
                        <p className="text-xs text-foreground-muted font-medium max-w-xs">
                            The professional AI creative suite for modern designers, artists, and visionaries.
                        </p>
                    </div>

                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                        <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                        <a href="#" className="hover:text-primary transition-colors">Discord</a>
                        <a href="#" className="hover:text-primary transition-colors">Medium</a>
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-40">
                        © 2024 Stillwater Studio • NanoBanana
                    </div>
                </div>
            </footer>

            <style jsx>{`
                .line-glow {
                    position: relative;
                }
                .line-glow::before {
                    content: '';
                    position: absolute;
                    left: -24px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: linear-gradient(to bottom, transparent, var(--primary), transparent);
                    opacity: 0.3;
                }
                @media (max-width: 768px) {
                    .line-glow::before { display: none; }
                }
            `}</style>
        </main>
    );
}
