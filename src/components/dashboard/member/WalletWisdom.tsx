'use client';

import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';

import Link from 'next/link';

interface WalletWisdomProps {
    credits: any;
}

export default function WalletWisdom({ credits }: WalletWisdomProps) {
    const purchasedBalance = credits?.balance || 0;
    const dailyRemaining = 0;

    // Total available = Purchased + Daily Bonus
    const totalAvailable = purchasedBalance + dailyRemaining;

    // percentage logic: if user has > 0 purchased, they are "Full" (>100%) or we show relative to a pack size
    // For now, let's make it a "Tank" that shows balance relative to their last/typical refill (e.g. 100)
    const baseCapacity = 100;
    const percentage = Math.min(100, Math.round((totalAvailable / baseCapacity) * 100));

    const dashArray = 2 * Math.PI * 45; // 45 is radius
    const dashOffset = dashArray - (dashArray * percentage) / 100;

    return (
        <div className="p-8 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-md overflow-hidden relative group hover:border-white/20 transition-all duration-500">
            {/* Background Decorative Elements */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />

            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                {/* Visual Level 1: Circular Progress */}
                <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="85"
                            className="stroke-white/5 fill-none"
                            strokeWidth="12"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r="85"
                            className="stroke-primary fill-none transition-all duration-1000 ease-out"
                            strokeWidth="12"
                            strokeLinecap="round"
                            style={{
                                strokeDasharray: 534,
                                strokeDashoffset: 534 - (534 * percentage) / 100
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">{totalAvailable}</span>
                        <span className="text-[10px] uppercase font-black text-primary tracking-widest mt-1">Total Power</span>
                    </div>
                </div>

                {/* Visual Level 2: Plain English Labels */}
                <div className="flex-1 space-y-6 text-center md:text-left">
                    <div>
                        <h2 className="text-3xl font-black mb-2 flex items-center justify-center md:justify-start gap-3 text-white uppercase tracking-widest leading-none mt-4">
                            Your Creative Energy
                            <Icons.sparkles className="text-yellow-500 animate-[pulse_3s_ease-in-out_infinite]" size={24} />
                        </h2>
                        <p className="text-lg text-white/50 leading-relaxed font-bold mt-4">
                            You have <span className="text-primary font-black px-2 py-1 bg-primary/20 rounded-xl uppercase tracking-widest text-[10px] mx-1">{totalAvailable} Credits</span> ready for your next masterpiece.
                        </p>
                    </div>

                    {/* Level 3: Action-Oriented Logic */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6">
                        <div className="p-4 bg-background-secondary rounded-xl border border-primary/20 flex items-center gap-4 hover:border-primary/50 transition-colors shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                                <Icons.activity size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-white/50 tracking-widest">Daily Bonus</p>
                                <p className="font-bold text-white text-sm">{dailyRemaining} Standard</p>
                            </div>
                        </div>

                        <div className="p-4 bg-background-secondary rounded-xl border border-primary/20 flex items-center gap-4 hover:border-primary/50 transition-colors shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                <Icons.plus size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-white/50 tracking-widest">Permanent Cache</p>
                                <p className="font-bold text-white text-sm">{purchasedBalance} Pro Credits</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Link href="/generate">
                            <Button className="h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all border-none bg-primary text-white hover:bg-primary-hover">
                                Start Creating Now
                            </Button>
                        </Link>
                        <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white/50 hover:text-white underline decoration-white/10 hover:decoration-white/30 underline-offset-4 transition-all">
                            How do credits work?
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
