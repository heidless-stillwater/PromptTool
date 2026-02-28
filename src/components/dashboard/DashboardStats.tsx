'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';

interface DashboardStatsProps {
    availableCredits: number;
    dailyRemaining: number;
    balance: number;
    imageCount: number;
    subscription: string;
}

export default function DashboardStats({
    availableCredits,
    dailyRemaining,
    balance,
    imageCount,
    subscription
}: DashboardStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-primary/50 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/50">Available Credits</span>
                    <Icons.zap className="text-primary group-hover:scale-110 transition-transform" size={20} />
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-4xl font-black text-white">{availableCredits}</p>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mt-1">
                            <span className="text-white/80">{dailyRemaining}</span> daily + <span className="text-white/80">{balance}</span> purchased
                        </p>
                    </div>
                    {subscription !== 'pro' && (
                        <Link href="/pricing">
                            <Button variant="secondary" size="sm" className="font-black text-[10px] tracking-widest uppercase bg-white/5 hover:bg-white/10 border-white/5 text-white/70">
                                Upgrade
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-primary/50 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/50">Images Created</span>
                    <Icons.image className="text-accent group-hover:scale-110 transition-transform" size={20} />
                </div>
                <p className="text-4xl font-black text-white">{imageCount}</p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mt-1">Total generations</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-primary/50 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/50">Current Plan</span>
                    <Icons.trophy className="text-yellow-400 group-hover:scale-110 transition-transform" size={20} />
                </div>
                <p className="text-4xl font-black text-white capitalize">{subscription}</p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mt-1">
                    {subscription === 'free' ? 'Upgrade for more features' : 'Premium features active'}
                </p>
            </div>
        </div>
    );
}
