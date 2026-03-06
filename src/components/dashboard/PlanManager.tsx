'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { SubscriptionTier, SubscriptionPlan } from '@/lib/types';

export default function PlanManager() {
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const [plans, setPlans] = useState<Record<SubscriptionTier, SubscriptionPlan> | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editedPlans, setEditedPlans] = useState<Record<SubscriptionTier, SubscriptionPlan> | null>(null);

    useEffect(() => {
        fetchPlans();
    }, [user]);

    const fetchPlans = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/plans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch plans');
            const data = await res.json();
            setPlans(data);
            setEditedPlans(JSON.parse(JSON.stringify(data))); // Deep clone
        } catch (error) {
            console.error('Error fetching plans:', error);
            showToast('Failed to load plan configurations', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = (tier: SubscriptionTier, path: string, value: any) => {
        if (!editedPlans) return;

        const newPlans = { ...editedPlans };
        const keys = path.split('.');
        let current: any = newPlans[tier];

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        setEditedPlans(newPlans);
    };

    const handleSave = async () => {
        if (!user || !editedPlans) return;
        try {
            setSaving(true);
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/plans', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update',
                    plans: editedPlans
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update plans');
            }

            showToast('Neural Plan Sovereignty updated successfully', 'success');
            setPlans(JSON.parse(JSON.stringify(editedPlans)));
        } catch (error) {
            console.error('Error saving plans:', error);
            showToast('Failed to commit plan changes', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        if (!user || !confirm('Reset plans to code-defined constants? This will overwrite Firestore data.')) return;
        try {
            setSaving(true);
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/plans', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'sync' })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to sync plans');
            }

            showToast('Plans synchronized with code constants', 'success');
            fetchPlans();
        } catch (error) {
            console.error('Error syncing plans:', error);
            showToast('Sync failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-10 bg-white/5 rounded-xl animate-pulse w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (!editedPlans) return null;

    const tiers: SubscriptionTier[] = ['free', 'standard', 'pro'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                    <Icons.terminal size={12} className="text-primary" />
                    Dynamic Plan Management
                </h2>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSync}
                        disabled={saving}
                        className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white"
                    >
                        Reset to Defaults
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/80 text-[9px] font-black uppercase tracking-widest px-6 h-8 rounded-lg shadow-lg shadow-primary/20"
                    >
                        {saving ? <Icons.spinner size={12} className="animate-spin" /> : 'Commit Changes'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {tiers.map(tier => {
                    const plan = editedPlans[tier];
                    return (
                        <Card key={tier} variant="glass" className="p-6 border-white/5 space-y-6 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Icons.zap size={48} className={tier === 'pro' ? 'text-accent' : tier === 'standard' ? 'text-primary' : 'text-white'} />
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wider">{plan.name}</h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Tier Level {tier === 'pro' ? 3 : tier === 'standard' ? 2 : 1}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Price (Cents)</label>
                                    <Input
                                        type="number"
                                        value={plan.price}
                                        onChange={(e) => handleUpdateField(tier, 'price', parseInt(e.target.value))}
                                        className="bg-black/40 border-white/5 h-10 text-sm font-bold focus:border-primary/50"
                                    />
                                </div>



                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Storage Quota (GB)</label>
                                    <Input
                                        type="number"
                                        value={Math.round(plan.resourceQuotas.storageBytes / (1024 ** 3))}
                                        onChange={(e) => handleUpdateField(tier, 'resourceQuotas.storageBytes', parseInt(e.target.value) * 1024 ** 3)}
                                        className="bg-black/40 border-white/5 h-10 text-sm font-bold focus:border-primary/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Monthly Sync Credits</label>
                                    <Input
                                        type="number"
                                        value={plan.creditsPerMonth}
                                        onChange={(e) => handleUpdateField(tier, 'creditsPerMonth', parseInt(e.target.value))}
                                        className="bg-black/40 border-white/5 h-10 text-sm font-bold focus:border-primary/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Max Collections</label>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.maxCollections}
                                            onChange={(e) => handleUpdateField(tier, 'resourceQuotas.maxCollections', parseInt(e.target.value))}
                                            className="bg-black/40 border-white/5 h-9 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Concurrent Gens</label>
                                        <Input
                                            type="number"
                                            value={plan.resourceQuotas.maxConcurrentGens}
                                            onChange={(e) => handleUpdateField(tier, 'resourceQuotas.maxConcurrentGens', parseInt(e.target.value))}
                                            className="bg-black/40 border-white/5 h-9 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] italic text-center pb-4">
                * Note: Changes to prices will only affect new subscribers. Quotas update instantly for all active neural cells.
            </p>
        </div>
    );
}
