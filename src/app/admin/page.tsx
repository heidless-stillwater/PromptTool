'use client';

import { useState } from 'react';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ConfirmationModal from '@/components/ConfirmationModal';
import { StatCard } from './components/StatCard';
import { RewardTierCard } from './components/RewardTierCard';

export default function AdminDashboard() {
    const {
        stats,
        loading,
        rewardAmounts,
        setRewardAmounts,
        savingRewards,
        leaderPreview,
        loadingPreview,
        awarding,
        isBackfilling,
        handleUpdateRewards,
        confirmAwardWeekly,
        confirmBackfill
    } = useAdminOverview();

    const [showAwardModal, setShowAwardModal] = useState(false);
    const [showBackfillModal, setShowBackfillModal] = useState(false);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Loading System Stats</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Quick Actions & Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Community" value={stats.totalUsers} unit="Users" variant="primary" />
                <StatCard label="Pro Membership" value={stats.proUsers} unit="Active" variant="accent" />
                <StatCard label="Total Assets" value={stats.totalImages} unit="Images" variant="success" />
                <StatCard label="Platform Consumption" value={stats.totalLifetimeUsed} unit="Credits" variant="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Rewards System */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Weekly League Rewards</h2>
                            <p className="text-sm text-foreground-muted">Configure and grant automated rewards to top creators</p>
                        </div>
                        <Button
                            onClick={() => setShowAwardModal(true)}
                            disabled={awarding || leaderPreview.length === 0}
                            size="lg"
                            className="gap-2 px-6 shadow-xl shadow-primary/30 font-black uppercase tracking-widest text-xs h-12"
                            isLoading={awarding}
                        >
                            {!awarding && <span className="text-xl">🏆</span>}
                            Grant Weekly Awards
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {rewardAmounts.map((amount, idx) => (
                            <RewardTierCard
                                key={idx}
                                index={idx}
                                amount={amount}
                                onAmountChange={(newAmt) => {
                                    const newAmounts = [...rewardAmounts];
                                    newAmounts[idx] = newAmt;
                                    setRewardAmounts(newAmounts);
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleUpdateRewards}
                            disabled={savingRewards}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                            isLoading={savingRewards}
                        >
                            Update Reward Tiers
                        </Button>
                    </div>

                    {/* Current Leaderboard Preview */}
                    <Card variant="glass" className="overflow-hidden border-border/50 rounded-3xl">
                        <div className="p-6 border-b border-border bg-background-secondary/30">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Live Rewards Preview</h3>
                        </div>
                        <div className="divide-y divide-border">
                            {loadingPreview ? (
                                <div className="p-12 flex justify-center">
                                    <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : leaderPreview.length === 0 ? (
                                <div className="p-12 text-center text-foreground-muted text-sm italic">No ranking data available for this week.</div>
                            ) : (
                                leaderPreview.slice(0, 3).map((leader, idx) => (
                                    <div key={leader.uid} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${idx === 0 ? 'bg-amber-400 text-amber-950' :
                                                idx === 1 ? 'bg-slate-300 text-slate-900' :
                                                    'bg-amber-700 text-amber-50'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {leader.photoURL ? (
                                                    <img src={leader.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-border group-hover:border-primary/50 transition-colors" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center text-lg border-2 border-border group-hover:border-primary/50 transition-colors">👤</div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight">{leader.displayName}</p>
                                                    <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-black">@{leader.username}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-primary">+{rewardAmounts[idx]} <span className="text-[10px] font-bold">Credits</span></p>
                                            <div className="flex flex-col items-end gap-1">
                                                <p className="text-[10px] text-foreground-muted uppercase tracking-tighter leading-none font-black">{leader.score} Influence</p>
                                                <p className="text-[10px] text-primary/70 uppercase tracking-tighter leading-none font-black">{leader.publishedCount || 0} Published</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* System Alerts & Quick Stats */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-black uppercase tracking-tight">System Status</h2>
                    <div className="space-y-4">
                        <Card variant="glass" className="p-6 border-r-4 border-r-success rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 blur-2xl rounded-full -mr-12 -mt-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-4 text-right">API Availability</p>
                            <div className="flex items-center justify-between relative z-10">
                                <span className="text-xs font-bold">Cloud Infrastructure</span>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                                    <span className="text-success font-black text-xs uppercase tracking-widest">Operational</span>
                                </div>
                            </div>
                        </Card>

                        <Card variant="glass" className="p-6 border-r-4 border-r-primary rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-12 -mt-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-4 text-right">League Status</p>
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <span className="text-xs font-bold">Active Contestants</span>
                                <span className="text-primary font-black text-sm uppercase tracking-tighter">{stats.activeContestants || 0} <span className="text-[10px]">Creators</span></span>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setShowBackfillModal(true)}
                                disabled={isBackfilling}
                                className="w-full text-[10px] font-black uppercase tracking-widest h-11 gap-2"
                                isLoading={isBackfilling}
                            >
                                {!isBackfilling && <span>🛠️</span>}
                                Repair League Data
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Award Modal */}
            <ConfirmationModal
                isOpen={showAwardModal}
                onCancel={() => setShowAwardModal(false)}
                onConfirm={confirmAwardWeekly}
                title="Grant Weekly Rewards?"
                message={`This will grant credits to the top 3 creators based on this week's ranking. This action cannot be undone.`}
            >
                <div className="mt-4 bg-background-secondary/50 rounded-2xl p-4 border border-border/50 space-y-2">
                    {leaderPreview.map((leader, i) => (
                        <div key={leader.uid} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <span className={`font-black w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-600'}`}>#{i + 1}</span>
                                <span className="text-sm font-bold tracking-tight">@{leader.username}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-black text-primary">+{rewardAmounts[i]}</span>
                            </div>
                        </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center text-xs font-black uppercase tracking-widest">
                        <span>Total Distribution</span>
                        <span className="text-primary">{rewardAmounts.reduce((a, b) => a + (b || 0), 0)} credits</span>
                    </div>
                </div>
            </ConfirmationModal>

            {/* Backfill Confirmation Modal */}
            <ConfirmationModal
                isOpen={showBackfillModal}
                onCancel={() => setShowBackfillModal(false)}
                onConfirm={confirmBackfill}
                title="Repair League Data?"
                message="This will re-sync all community league posts with the latest author profiles and source image data. This is useful for fixing missing thumbnails, updating avatars, and adding video playback to older entries."
                confirmLabel="Repair Now"
                type="warning"
            />
        </div>
    );
}
