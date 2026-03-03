'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CreditPack, CreditSystemConfig } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface RefillModalProps {
    isOpen: boolean;
    onClose: () => void;
    requiredAmount?: number; // Optional amount the user *needs* right now
}

export default function RefillModal({ isOpen, onClose, requiredAmount = 0 }: RefillModalProps) {
    const { user, credits } = useAuth();
    const [config, setConfig] = useState<CreditSystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingPack, setProcessingPack] = useState<string | null>(null);
    const [targetBalance, setTargetBalance] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/credits/config');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
                // Default target is a "Safe" amount above zero or current debt
                setTargetBalance(Math.max(100, Math.abs(credits?.balance || 0) + 50));
            }
        } catch (e) {
            console.error('Failed to fetch credit config', e);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (packId: string) => {
        if (!user) return;
        setProcessingPack(packId);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/stripe/checkout-one-time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ packId, refillTarget: targetBalance }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Purchase error:', err);
        } finally {
            setProcessingPack(null);
        }
    };

    if (!isOpen) return null;

    const balance = credits?.balance || 0;
    const isInDebt = balance < 0;
    const isOxygenAuthorized = credits?.isOxygenAuthorized || false;

    // Logic to suggest a pack based on "Refill to X"
    const suggestedPack = config?.packs.find(p => {
        if (!targetBalance) return false;
        const netAfterDebt = p.credits + balance;
        return netAfterDebt >= targetBalance;
    }) || config?.packs[0];

    return (
        <div data-testid="refill-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-[#050508] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col md:flex-row">
                {/* Visual Side */}
                <div className="w-full md:w-5/12 bg-primary/5 p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-50" />

                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-8 border border-primary/30">
                            <Icons.zap size={24} className="text-primary fill-primary animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight text-white">
                            Energy <br />Sub-System
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">INTELLIGENCE PROTOCOL</p>
                    </div>

                    <div className="relative z-10 space-y-6 pt-12">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Current State</p>
                            <p className={cn("text-2xl font-black", balance < 0 ? "text-error" : "text-white")}>
                                {balance} <span className="text-[10px] text-white/20">ENERGY</span>
                            </p>
                        </div>

                        {requiredAmount > 0 && !isOxygenAuthorized && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase">Oxygen Tank Offline</p>
                                <p className="text-[9px] font-bold text-amber-500/70 leading-relaxed italic">
                                    Emergency reserves require manual authorization in settings.
                                </p>
                            </div>
                        )}

                        {requiredAmount > 0 && isOxygenAuthorized && balance + (credits?.maxOverdraft || 0) < requiredAmount && (
                            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-error uppercase text-red-500">Oxygen Tank Depleted</p>
                                <p className="text-[9px] font-bold text-error/70 leading-relaxed italic text-red-400">
                                    Current batch exceeds emergency capacity.
                                </p>
                            </div>
                        )}

                        {isInDebt && !requiredAmount && (
                            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-error uppercase">Overdraft Detected</p>
                                <p className="text-[9px] font-bold text-error/70 leading-relaxed">
                                    Your system is running on Oxygen Tank reserves. Next purchase will automatically recover {Math.abs(balance)} credits.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Selection Side */}
                <div className="flex-1 p-10 space-y-8 flex flex-col h-full overflow-y-auto max-h-[80vh] md:max-h-none">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                {requiredAmount > 0 ? 'Energy Low' : 'Select Power Pack'}
                            </h3>
                            <p className="text-[10px] text-foreground-muted font-bold tracking-widest uppercase">
                                {requiredAmount > 0 ? `Required: ${requiredAmount} units` : 'ONE-TIME DEPLOYMENT'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-2">
                            <Icons.close size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
                            <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Syncing Matrix</p>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            {config?.packs.map((pack) => {
                                const isSuggested = suggestedPack?.id === pack.id;
                                return (
                                    <button
                                        key={pack.id}
                                        onClick={() => handlePurchase(pack.id)}
                                        disabled={processingPack !== null}
                                        className={cn(
                                            "w-full p-6 bg-white/[0.02] border rounded-3xl text-left transition-all duration-300 group flex items-center justify-between",
                                            isSuggested
                                                ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                                                : "border-white/5 hover:border-white/20",
                                            processingPack === pack.id && "animate-pulse"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-white">{pack.credits}</span>
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Credits</span>
                                                {isSuggested && (
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest ml-2 border border-primary/30">Suggested</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-white/30 uppercase">{pack.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-primary">${(pack.priceCents / 100).toFixed(2)}</p>
                                            <Icons.chevronRight className="text-white/10 group-hover:text-primary transition-all group-hover:translate-x-1" size={14} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="pt-6 border-t border-white/5 mt-auto">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Target Recovery Level</label>
                            <span className="text-[9px] font-bold text-primary">{targetBalance} Energy</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="50"
                            value={targetBalance || 100}
                            onChange={(e) => setTargetBalance(parseInt(e.target.value))}
                            className="w-full accent-primary h-1 bg-white/5 rounded-full appearance-none cursor-pointer mb-6"
                        />
                        <p className="text-[8px] font-bold text-white/20 uppercase text-center leading-relaxed">
                            Payments processed by **Stripe Connect**. <br /> Credits are added to your ledger instantly after verification.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
