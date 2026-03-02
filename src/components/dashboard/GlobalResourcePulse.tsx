'use client';

import React from 'react';
import { Icons } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';

export default function GlobalResourcePulse() {
    const { user } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'resource-pulse'],
        queryFn: async () => {
            if (!user) return null;
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/resource-pulse', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch pulse');
            return res.json();
        },
        refetchInterval: 30000, // Refresh every 30s for the pulse effect
        enabled: !!user
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (!data?.success) return null;

    const { pulse, capacity } = data;

    const totalStorageBytes = capacity.totalStorageBytes || 0;
    const storageUsagePercent = totalStorageBytes > 0
        ? Math.round((pulse.storageBytes / totalStorageBytes) * 100)
        : 0;
    const storageGB = (pulse.storageBytes / (1024 ** 3)).toFixed(2);
    const capacityGB = capacity.totalStorageGB !== undefined
        ? capacity.totalStorageGB.toFixed(0)
        : (totalStorageBytes / (1024 ** 3)).toFixed(0);

    return (
        <div className="space-y-6 mb-10">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    Global Infrastructure Pulse
                </h2>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-right">
                    Live Feed · {capacity.activeUsersCount} Active Nodes · {capacity.totalUsersCount} Node Population
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Storage Pulse */}
                <Card variant="glass" className="p-6 border-white/5 group hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Icons.database size={20} />
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Storage</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-white">{storageGB}</span>
                        <span className="text-xs font-bold text-white/30 uppercase">GB / {capacityGB}GB System Aggregate</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${storageUsagePercent}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-3">
                        Collective Sovereignty Index: {100 - storageUsagePercent}% Free
                    </p>
                </Card>

                {/* Compute Pulse (DB Writes) */}
                <Card variant="glass" className="p-6 border-white/5 group hover:border-accent/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                            <Icons.zap size={20} />
                        </div>
                        <span className="text-[10px] font-black text-accent uppercase tracking-widest">Operations</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-white">{pulse.dbWritesDaily.toLocaleString()}</span>
                        <span className="text-xs font-bold text-white/30 uppercase">Daily Writes</span>
                    </div>
                    <div className="flex gap-1 h-1.5 items-end">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-accent/30 rounded-t-sm animate-pulse"
                                style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </div>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-3">
                        Throughput Stability: Nominal
                    </p>
                </Card>

                {/* User Distribution */}
                <Card variant="glass" className="p-6 border-white/5 group hover:border-yellow-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                            <Icons.users size={20} />
                        </div>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Tiers</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xl font-black text-white">{capacity.tierCounts.pro || 0}</span>
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Pro</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xl font-black text-white">{capacity.tierCounts.standard || 0}</span>
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Std</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xl font-black text-white">{capacity.tierCounts.free || 0}</span>
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Free</span>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-0.5 h-1 rounded-full overflow-hidden bg-white/5">
                        <div className="bg-amber-500" style={{ width: `${(capacity.tierCounts.pro / capacity.activeUsersCount) * 100}%` }} />
                        <div className="bg-primary" style={{ width: `${(capacity.tierCounts.standard / capacity.activeUsersCount) * 100}%` }} />
                        <div className="bg-white/20" style={{ width: `${(capacity.tierCounts.free / capacity.activeUsersCount) * 100}%` }} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
