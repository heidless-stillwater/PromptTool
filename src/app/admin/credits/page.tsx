'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { CreditSystemConfig, CreditPack } from '@/lib/types';

export default function AdminCreditsPage() {
    const { user } = useAuth();
    const [config, setConfig] = useState<CreditSystemConfig | null>(null);
    const [overdrafts, setOverdrafts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'packs' | 'overdrafts' | 'settings' | 'analytics'>('packs');
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [editingPack, setEditingPack] = useState<CreditPack | null>(null);
    const [isPackModalOpen, setIsPackModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const [configRes, overdraftRes, analyticsRes] = await Promise.all([
                fetch('/api/admin/credits/config', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/credits/overdraft-report', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/admin/credits/analytics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (configRes.ok) setConfig(await configRes.json());
            if (overdraftRes.ok) setOverdrafts(await overdraftRes.json());

            if (analyticsRes.ok) {
                setAnalyticsData(await analyticsRes.json());
                setError(null);
            } else {
                const errJson = await analyticsRes.json().catch(() => ({ error: 'Unknown Analytics Error' }));
                setError(errJson.error || 'Failed to load analytics');
            }
        } catch (err: any) {
            console.error('Error fetching admin credit data:', err);
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (newConfig: CreditSystemConfig) => {
        setIsSaving(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch('/api/admin/credits/config', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newConfig)
            });
            if (res.ok) {
                setConfig(newConfig);
                alert('Configuration saved successfully!');
            }
        } catch (err) {
            alert('Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePack = async (pack: CreditPack) => {
        if (!config) return;
        const newPacks = [...config.packs];
        const idx = newPacks.findIndex(p => p.id === pack.id);

        if (idx >= 0) newPacks[idx] = pack;
        else newPacks.push(pack);

        await handleSaveConfig({ ...config, packs: newPacks });
        setIsPackModalOpen(false);
    };

    const handleDeletePack = async (packId: string) => {
        if (!config || !confirm('Are you sure?')) return;
        const newPacks = config.packs.filter(p => p.id !== packId);
        await handleSaveConfig({ ...config, packs: newPacks });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Loading Financial Data</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-background-secondary border border-border rounded-2xl w-fit">
                {[
                    { id: 'packs', label: 'Pricing Packs', icon: '💰' },
                    { id: 'analytics', label: 'Analytics', icon: '📊' },
                    { id: 'overdrafts', label: 'Overdraft Risk', icon: '⚠️' },
                    { id: 'settings', label: 'Global Settings', icon: '⚙️' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-foreground-muted hover:text-foreground hover:bg-white/5'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'analytics' && error && (
                <div className="bg-error/10 border border-error/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                    <Icons.zap className="text-error w-12 h-12" />
                    <div className="text-center">
                        <h3 className="text-lg font-black uppercase text-error mb-2">Analytics Engine Offline</h3>
                        <p className="text-xs text-foreground-muted font-bold uppercase tracking-widest leading-relaxed">
                            The system encountered an error while processing financial snapshots.<br />
                            Reason: <span className="text-error">{error}</span>
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchData()}
                        className="text-[10px] font-black uppercase tracking-widest text-error/60 border border-error/20 hover:bg-error/10"
                    >
                        Attempt Re-Sync
                    </Button>
                </div>
            )}

            {activeTab === 'analytics' && analyticsData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-background-secondary p-6 rounded-[2rem] border border-border">
                            <p className="text-[10px] font-black uppercase text-foreground-muted tracking-widest mb-1">Total Revenue</p>
                            <h4 className="text-3xl font-black text-success">
                                ${(analyticsData.totalRevenue || 0).toLocaleString()}
                            </h4>
                        </div>
                        <div className="bg-background-secondary p-6 rounded-[2rem] border border-border">
                            <p className="text-[10px] font-black uppercase text-foreground-muted tracking-widest mb-1">Overdraft Exposure</p>
                            <h4 className="text-3xl font-black text-error">
                                {(analyticsData.totalOverdraft || 0).toLocaleString()} <span className="text-xs uppercase">Units</span>
                            </h4>
                        </div>
                        <div className="bg-background-secondary p-6 rounded-[2rem] border border-border">
                            <p className="text-[10px] font-black uppercase text-foreground-muted tracking-widest mb-1">Unique Buyers</p>
                            <h4 className="text-3xl font-black text-primary">
                                {analyticsData.topUsers?.length || 0}
                            </h4>
                        </div>
                        <div className="bg-background-secondary p-6 rounded-[2rem] border border-border">
                            <p className="text-[10px] font-black uppercase text-foreground-muted tracking-widest mb-1">Last Data Sync</p>
                            <h4 className="text-[10px] font-mono text-foreground-muted mt-4">
                                {new Date(analyticsData.statsTimestamp).toLocaleString()}
                            </h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-background-secondary p-8 rounded-[2.5rem] border border-border">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-6">Top 10 Users by Spend</h3>
                            <div className="space-y-4">
                                {analyticsData.topUsers.map((u: any, i: number) => (
                                    <div key={u.userId} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-foreground-muted w-4">{i + 1}</span>
                                            <div>
                                                <p className="text-[10px] font-mono text-foreground-muted truncate max-w-[200px]">{u.userId}</p>
                                                <p className="text-xs font-bold">Balance: <span className={u.balance < 0 ? 'text-error' : 'text-success'}>{u.balance}</span></p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-primary">{u.totalPurchased}</p>
                                            <p className="text-[8px] font-black uppercase text-foreground-muted">Total Credits</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-background-secondary p-8 rounded-[2.5rem] border border-border">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-6">Daily Generation Volume</h3>
                            <div className="flex items-end justify-between h-[200px] gap-1 px-2">
                                {analyticsData.dailyVolumes?.length > 0 ? (
                                    analyticsData.dailyVolumes.map((d: any) => {
                                        const maxCount = Math.max(...analyticsData.dailyVolumes.map((v: any) => v.count)) || 1;
                                        return (
                                            <div
                                                key={d.date}
                                                className="bg-primary/20 hover:bg-primary/40 transition-colors w-full rounded-t-sm relative group"
                                                style={{ height: `${Math.max(5, (d.count / maxCount) * 100)}%` }}
                                            >
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-[8px] font-black p-2 rounded whitespace-nowrap z-10 border border-white/10">
                                                    {d.date}: {d.count} gens
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="w-full flex items-center justify-center text-[10px] font-black uppercase text-foreground-muted">No Activity Data</div>
                                )}
                            </div>
                            <div className="flex justify-between mt-4 text-[8px] font-black uppercase text-foreground-muted">
                                <span>30 Days Ago</span>
                                <span>Today</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'packs' && config && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.packs.map((pack) => (
                        <div key={pack.id} className="p-6 bg-background-secondary border border-border rounded-[2rem] space-y-4 group hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">{pack.name}</h3>
                                    <p className="text-xs text-foreground-muted font-bold uppercase tracking-wider">{pack.id}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-primary">{pack.credits} <span className="text-xs text-foreground-muted">CREDITS</span></div>
                                    <div className="text-sm font-bold text-foreground-muted">${(pack.priceCents / 100).toFixed(2)}</div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex gap-2">
                                <code className="text-[10px] bg-black px-2 py-1 rounded text-primary border border-primary/20 flex-1 truncate">
                                    {pack.stripePriceId || 'NO STRIPE ID'}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] font-black uppercase"
                                    onClick={() => {
                                        setEditingPack(pack);
                                        setIsPackModalOpen(true);
                                    }}
                                >Edit</Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] font-black uppercase text-error hover:bg-error/10"
                                    onClick={() => handleDeletePack(pack.id)}
                                >Delete</Button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            setEditingPack({ id: '', name: '', credits: 100, priceCents: 1000, stripePriceId: '' });
                            setIsPackModalOpen(true);
                        }}
                        className="h-full min-h-[160px] border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-2 text-foreground-muted hover:text-primary hover:border-primary/50 transition-all group"
                    >
                        <span className="text-3xl group-hover:scale-125 transition-transform">+</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Create New Pack</span>
                    </button>
                </div>
            )}

            {activeTab === 'overdrafts' && (
                <div className="bg-background-secondary border border-border rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-foreground-muted">User ID</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-foreground-muted">Balance</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-foreground-muted">Status</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-foreground-muted">Total Used</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdrafts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-xs italic text-foreground-muted">
                                        No users are currently in overdraft. System health is optimal.
                                    </td>
                                </tr>
                            ) : (
                                overdrafts.map((o) => (
                                    <tr key={o.userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-4 font-mono text-[10px] text-foreground-muted">{o.userId}</td>
                                        <td className="px-8 py-4 font-black text-error">{o.balance}</td>
                                        <td className="px-8 py-4">
                                            <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase bg-error/20 text-error border border-error/50">
                                                Overdraft
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-xs font-bold">{o.totalUsed || 0}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'settings' && config && (
                <div className="max-w-2xl bg-background-secondary border border-border rounded-[2rem] p-8 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">Overdraft Controls</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-foreground-muted">Default Burst Limit</label>
                                <input
                                    type="number"
                                    value={config.defaultOverdraftLimit}
                                    onChange={(e) => setConfig({ ...config, defaultOverdraftLimit: parseInt(e.target.value) })}
                                    className="w-full bg-black border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-foreground-muted">System-Wide Max Burst</label>
                                <input
                                    type="number"
                                    value={config.systemMaxOverdraft}
                                    onChange={(e) => setConfig({ ...config, systemMaxOverdraft: parseInt(e.target.value) })}
                                    className="w-full bg-black border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-foreground-muted">Hard Lock Threshold (Debt)</label>
                                <input
                                    type="number"
                                    value={config.overdraftGraceThreshold}
                                    onChange={(e) => setConfig({ ...config, overdraftGraceThreshold: parseInt(e.target.value) })}
                                    className="w-full bg-black border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-foreground-muted">Min "Refill to X" Value</label>
                                <input
                                    type="number"
                                    value={config.minRefillAmount}
                                    onChange={(e) => setConfig({ ...config, minRefillAmount: parseInt(e.target.value) })}
                                    className="w-full bg-black border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">Global Features</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black uppercase text-foreground-muted">Auto-Refill Prompts</span>
                                <input
                                    type="checkbox"
                                    checked={config.autoRefillGlobalEnabled}
                                    onChange={(e) => setConfig({ ...config, autoRefillGlobalEnabled: e.target.checked })}
                                    className="w-4 h-4 accent-primary"
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black uppercase text-foreground-muted">Highlight Overdraft on Invoice</span>
                                <input
                                    type="checkbox"
                                    checked={config.highlightOverdraftInvoices}
                                    onChange={(e) => setConfig({ ...config, highlightOverdraftInvoices: e.target.checked })}
                                    className="w-4 h-4 accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <Button
                            onClick={() => handleSaveConfig(config)}
                            isLoading={isSaving}
                            className="w-full bg-primary text-white font-black uppercase py-4 rounded-2xl shadow-xl shadow-primary/20"
                        >
                            Save Global Configuration
                        </Button>
                    </div>
                </div>
            )}

            {/* Pack Edit Modal */}
            {isPackModalOpen && editingPack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-background-secondary border border-border rounded-[2.5rem] p-8 space-y-6 shadow-2xl overflow-hidden relative border-primary/20">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

                        <div className="space-y-1">
                            <h2 className="text-xl font-black uppercase tracking-tight">Edit Pricing Pack</h2>
                            <p className="text-[10px] text-foreground-muted font-bold tracking-widest">CONFIGURATION CORE</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-foreground-muted tracking-widest">Pack ID</label>
                                <input
                                    className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-mono"
                                    value={editingPack.id}
                                    onChange={(e) => setEditingPack({ ...editingPack, id: e.target.value })}
                                    placeholder="starter_100"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-foreground-muted tracking-widest">Display Name</label>
                                <input
                                    className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-bold"
                                    value={editingPack.name}
                                    onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                                    placeholder="Starter Pack"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-foreground-muted tracking-widest">Credits</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                        value={editingPack.credits}
                                        onChange={(e) => setEditingPack({ ...editingPack, credits: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-foreground-muted tracking-widest">Price (Cents)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                        value={editingPack.priceCents}
                                        onChange={(e) => setEditingPack({ ...editingPack, priceCents: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-foreground-muted tracking-widest">Stripe Price ID</label>
                                <input
                                    className="w-full bg-black border border-border rounded-xl px-4 py-3 text-[10px] focus:outline-none focus:border-primary font-mono"
                                    value={editingPack.stripePriceId}
                                    onChange={(e) => setEditingPack({ ...editingPack, stripePriceId: e.target.value })}
                                    placeholder="price_..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="ghost"
                                className="flex-1 uppercase font-black text-xs h-12"
                                onClick={() => setIsPackModalOpen(false)}
                            >Cancel</Button>
                            <Button
                                className="flex-[2] bg-primary text-white uppercase font-black text-xs h-12 rounded-xl shadow-lg shadow-primary/20"
                                onClick={() => handleSavePack(editingPack)}
                                isLoading={isSaving}
                            >Save Pack</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
