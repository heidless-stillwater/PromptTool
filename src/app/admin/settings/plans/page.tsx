'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { SubscriptionPlan, SubscriptionTier } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function PlansManagementPage() {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [plans, setPlans] = useState<Record<SubscriptionTier, SubscriptionPlan> | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans');
            const data = await res.json();
            setPlans(data);
        } catch (e) {
            showToast('Failed to fetch plans', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!plans) return;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', plans })
            });
            if (res.ok) {
                showToast('Plans updated successfully', 'success');
            } else {
                throw new Error('Update failed');
            }
        } catch (e) {
            showToast('Failed to update plans', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync' })
            });
            if (res.ok) {
                showToast('Plans synced from code', 'success');
                fetchPlans();
            }
        } catch (e) {
            showToast('Sync failed', 'error');
        } finally {
            setSaving(false);
            setShowSyncModal(false);
        }
    };

    const updatePlanField = (tier: SubscriptionTier, field: string, value: any) => {
        if (!plans) return;
        setPlans({
            ...plans,
            [tier]: {
                ...plans[tier],
                [field]: value
            }
        });
    };

    const updateQuotaField = (tier: SubscriptionTier, field: string, value: number) => {
        if (!plans) return;
        setPlans({
            ...plans,
            [tier]: {
                ...plans[tier],
                resourceQuotas: {
                    ...plans[tier].resourceQuotas,
                    [field]: value
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (profile?.role !== 'su') {
        return <div className="p-8 text-center text-red-400">Restricted: SU Access Required</div>;
    }

    return (
        <div className="space-y-10 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white">Subscription Architecture</h1>
                    <p className="text-sm text-foreground-muted">Configure global limits, credits, and resource allocations</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setShowSyncModal(true)} disabled={saving} className="bg-white/5 border-white/10 text-white/50 hover:text-white">
                        Sync from Code
                    </Button>
                    <Button onClick={handleUpdate} isLoading={saving} className="bg-primary shadow-lg shadow-primary/20 text-white">
                        Deploy Config
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {(Object.keys(plans || {}) as SubscriptionTier[]).map((tier) => {
                    const plan = plans![tier];
                    return (
                        <Card key={tier} variant="glass" className="p-6 border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black uppercase tracking-widest text-primary">{plan.name}</h3>
                                <div className="text-[10px] font-black uppercase bg-white/5 px-2 py-1 rounded text-white/40">{tier}</div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 pb-2">Allowances</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-white/50">Daily Energy</label>
                                        <Input
                                            type="number"
                                            value={plan.dailyAllowance}
                                            onChange={(e) => updatePlanField(tier, 'dailyAllowance', parseInt(e.target.value))}
                                            className="bg-white/5 border-white/5 h-9 text-xs font-bold text-white uppercase"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-white/50">Monthly Bonus</label>
                                        <Input
                                            type="number"
                                            value={plan.creditsPerMonth}
                                            onChange={(e) => updatePlanField(tier, 'creditsPerMonth', parseInt(e.target.value))}
                                            className="bg-white/5 border-white/5 h-9 text-xs font-bold text-white uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 pb-2">Resource Quotas</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold text-white/70 uppercase">Storage (Bytes)</span>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.storageBytes}
                                            onChange={(e) => updateQuotaField(tier, 'storageBytes', parseInt(e.target.value))}
                                            className="w-32 bg-white/5 border-white/5 h-9 text-[10px] font-mono text-primary uppercase text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold text-white/70 uppercase">Daily DB Writes</span>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.dbWritesDaily}
                                            onChange={(e) => updateQuotaField(tier, 'dbWritesDaily', parseInt(e.target.value))}
                                            className="w-32 bg-white/5 border-white/5 h-9 text-[10px] font-mono text-primary uppercase text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold text-white/70 uppercase">Monthly CPU (ms)</span>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.cpuTimeMsPerMonth}
                                            onChange={(e) => updateQuotaField(tier, 'cpuTimeMsPerMonth', parseInt(e.target.value))}
                                            className="w-32 bg-white/5 border-white/5 h-9 text-[10px] font-mono text-primary uppercase text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold text-white/70 uppercase">Max Collections</span>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.maxCollections}
                                            onChange={(e) => updateQuotaField(tier, 'maxCollections', parseInt(e.target.value))}
                                            className="w-32 bg-white/5 border-white/5 h-9 text-[10px] font-mono text-primary uppercase text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold text-white/70 uppercase">Parallel Gens</span>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.maxConcurrentGens}
                                            onChange={(e) => updateQuotaField(tier, 'maxConcurrentGens', parseInt(e.target.value))}
                                            className="w-32 bg-white/5 border-white/5 h-9 text-[10px] font-mono text-primary uppercase text-right"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-bold text-white/70 uppercase">Oxygen Tank (Bytes)</span>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.burstAllowanceBytes}
                                            onChange={(e) => updateQuotaField(tier, 'burstAllowanceBytes', parseInt(e.target.value))}
                                            className="w-32 bg-white/5 border-white/5 h-9 text-[10px] font-mono text-primary uppercase text-right"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <ConfirmationModal
                isOpen={showSyncModal}
                onCancel={() => setShowSyncModal(false)}
                onConfirm={handleSync}
                title="Reset Plans to Defaults?"
                message="This will overwrite all dynamic plan configurations in Firestore with the hardcoded defaults from lib/types.ts. This cannot be undone."
                type="warning"
                confirmLabel="Reset & Sync"
            />
        </div>
    );
}
