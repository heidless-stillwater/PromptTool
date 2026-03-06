'use client';

import { Icons } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface UserPulseStatsProps {
    dashboardData: any;
}

export default function UserPulseStats({ dashboardData }: UserPulseStatsProps) {
    const { credits, recentImages, profile } = dashboardData;

    const availableCredits = credits
        ? credits.balance
        : 0;

    const dailyRemaining = credits
        ? 0
        : 0;

    return (
        <Card variant="glass" className="mb-8 p-6 border-primary/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none text-primary">
                <Icons.zap size={120} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
                {/* Energy Balance */}
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/50 bg-primary/20 text-primary shadow-lg shadow-primary/20">
                            <Icons.zap size={24} className="animate-pulse" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-background border-2 border-border rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground-muted mb-0.5">Energy Flux</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black gradient-text">
                                {availableCredits}
                            </span>
                            <span className="text-xs font-bold text-foreground-muted">Units Available</span>
                        </div>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block w-px h-12 bg-border/50" />

                {/* Daily Allowance */}
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3 flex items-center gap-2">
                        <Icons.sparkles size={12} className="text-yellow-500" />
                        Daily Allowance
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-white">{dailyRemaining}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Standard Units</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-white">{credits?.balance || 0}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Vault Reserve</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-white capitalize">{profile?.subscription || 'Free'}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Intelligence Tier</span>
                        </div>
                    </div>
                </div>

                {/* Global Scale */}
                <div className="flex flex-col items-end">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Neural Output</p>
                        <p className="text-lg font-black text-primary">
                            {recentImages.length} Artifacts
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    );
}
