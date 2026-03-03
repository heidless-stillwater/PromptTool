'use client';

import React, { useMemo, useState } from 'react';
import { ResourceQuotas, RESOURCE_LABELS } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/useQueryHooks';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ResourceVitalityProps {
    usage: Record<string, number>;
    quotas: ResourceQuotas;
    burstUsed: boolean;
    burstAuthorized: boolean;
    tier: string;
    loading?: boolean;
}

const ResourceVitality: React.FC<ResourceVitalityProps> = ({ usage, quotas, burstUsed, burstAuthorized, tier, loading }) => {
    const { user, isAdmin } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [isActivating, setIsActivating] = React.useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const resources = useMemo(() => {
        const items = [
            { key: 'storageBytes', current: usage.storageBytes || 0, max: quotas.storageBytes, unit: 'GB' },
            { key: 'dbWritesDaily', current: usage.dbWritesDaily || 0, max: quotas.dbWritesDaily, unit: '' },
            { key: 'cpuTimeMsPerMonth', current: usage.cpuTimeMsPerMonth || 0, max: quotas.cpuTimeMsPerMonth, unit: 's' }
        ];

        return items.map(item => {
            const maxVal = item.max ?? 0;
            const isUnlimited = maxVal === -1;
            const percentage = isUnlimited ? 0 : (maxVal > 0 ? Math.min(100, (item.current / maxVal) * 100) : 0);

            let displayCurrent = item.current.toString();
            let displayMax = maxVal.toString();

            if (item.key === 'storageBytes') {
                displayCurrent = (item.current / (1024 ** 3)).toFixed(2);
                displayMax = maxVal === -1 ? '∞' : (maxVal / (1024 ** 3)).toFixed(0);
            } else if (item.key === 'cpuTimeMsPerMonth') {
                displayCurrent = (item.current / 1000).toFixed(1);
                displayMax = maxVal === -1 ? '∞' : (maxVal / 1000).toFixed(0);
            }

            return {
                ...item,
                label: RESOURCE_LABELS[item.key as keyof typeof RESOURCE_LABELS],
                percentage,
                displayCurrent,
                displayMax,
                isUnlimited,
                isWarning: percentage >= 70 && percentage < 90,
                isCritical: percentage >= 90
            };
        });
    }, [usage, quotas]);

    if (loading) {
        return (
            <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="flex justify-between">
                                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-white/10 rounded-full animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Admin Tools */}
                    {isAdmin && (
                        <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isActivating}
                                onClick={async () => {
                                    if (!user) return;
                                    setIsActivating(true);
                                    try {
                                        const token = await user.getIdToken();
                                        const res = await fetch('/api/admin/recalculate-usage', {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ targetUid: user.uid })
                                        });
                                        if (!res.ok) throw new Error('Failed to recalculate');
                                        const data = await res.json();
                                        showToast(`Usage synced: ${data.newStorageGB} GB`, 'success');
                                        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.usage(user.uid) });
                                    } catch (e) {
                                        showToast('Recalculate failed', 'error');
                                    } finally {
                                        setIsActivating(false);
                                    }
                                }}
                                className="h-7 w-7 rounded-lg p-0 text-white/20 hover:text-white hover:bg-white/5 border border-white/10"
                                title="Recalculate Storage Usage"
                            >
                                <Icons.refresh size={12} className={isActivating ? 'animate-spin' : ''} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isActivating}
                                onClick={() => setShowResetModal(true)}
                                className="h-7 w-7 rounded-lg p-0 text-white/20 hover:text-red-400 hover:bg-red-500/5 border border-white/10"
                                title="Reset Oxygen Tank Status"
                            >
                                <Icons.delete size={12} />
                            </Button>

                            <ConfirmationModal
                                isOpen={showResetModal}
                                title="Reset Oxygen Tank?"
                                message="This will clear the 'Depleted' status and allow the user to arm the tank again for this month."
                                confirmLabel="Reset Status"
                                type="danger"
                                isLoading={isActivating}
                                onConfirm={async () => {
                                    if (!user) return;
                                    setIsActivating(true);
                                    try {
                                        const token = await user.getIdToken();
                                        const res = await fetch('/api/admin/reset-burst', {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ targetUid: user.uid })
                                        });
                                        if (!res.ok) throw new Error('Failed to reset burst');
                                        showToast(`Oxygen Tank Reset!`, 'success');
                                        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.usage(user.uid) });
                                        setShowResetModal(false);
                                    } catch (e) {
                                        showToast('Reset failed', 'error');
                                    } finally {
                                        setIsActivating(false);
                                    }
                                }}
                                onCancel={() => setShowResetModal(false)}
                            />
                        </div>
                    )}

                    {burstUsed ? (
                        <span className="text-[10px] px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            <Icons.activity size={10} className="animate-pulse" />
                            Oxygen Tank Deployed
                        </span>
                    ) : burstAuthorized ? (
                        <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Oxygen Tank Armed
                        </span>
                    ) : (usage?.storageBytes || 0) / (quotas?.storageBytes || 1) > 0.8 ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                if (!user) return;
                                setIsActivating(true);
                                try {
                                    const token = await user.getIdToken();
                                    const res = await fetch('/api/user/activate-credits-oxygen', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (!res.ok) throw new Error('Failed to arm tank');
                                    showToast('Oxygen Tank Armed!', 'success');
                                    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.usage(user.uid) });
                                } catch (e) {
                                    showToast('Failed to arm Oxygen Tank', 'error');
                                } finally {
                                    setIsActivating(false);
                                }
                            }}
                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 gap-2 px-3"
                        >
                            <Icons.zap size={10} />
                            Arm Oxygen Tank
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resources.map((res: any) => (
                    <div key={res.key} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-white/50">{res.label}</span>
                            <span className={`font-mono ${res.isCritical ? 'text-red-400 animate-pulse' : res.isWarning ? 'text-yellow-400' : 'text-white/70'}`}>
                                {res.isUnlimited ? '∞' : `${res.displayCurrent} / ${res.displayMax}${res.unit}`}
                            </span>
                        </div>

                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${res.isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                    res.isWarning ? 'bg-yellow-500' :
                                        'bg-emerald-500'
                                    }`}
                                style={{ width: `${res.isUnlimited ? 100 : res.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
};

export default ResourceVitality;
