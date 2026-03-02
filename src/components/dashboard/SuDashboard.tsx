'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { CREDIT_COSTS } from '@/lib/types';
import CollectionSelectModal from '@/components/CollectionSelectModal';
import BulkTagModal from '@/components/BulkTagModal';

// Sub-components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import CreditActivity from '@/components/dashboard/CreditActivity';
import RecentCreations from '@/components/dashboard/RecentCreations';
import CommunityPulse from '@/components/dashboard/CommunityPulse';
import Exemplars from '@/components/dashboard/Exemplars';
import UserPulseStats from '@/components/dashboard/UserPulseStats';
import ResourceVitality from './ResourceVitality';
import GlobalResourcePulse from './GlobalResourcePulse';
import PlanManager from './PlanManager';

interface SuDashboardProps {
    dashboardData: any; // Using existing data from useDashboard hook
}

export default function SuDashboard({ dashboardData }: SuDashboardProps) {
    const router = useRouter();
    const {
        user, profile, credits, recentImages, creditHistory, recentCommunityEntries,
        collections, loadingImages, loadingCommunity, loadingHistory, isHistoryExpanded,
        isGrouped, selectionMode, selectedIds, isBulkDeleting, isBulkPublishing,
        isBulkCollecting, isBulkTagging, isCollectionModalOpen, isTagModalOpen, effectiveRole,
        signOut, switchRole, setAudienceMode, setIsHistoryExpanded, setIsGrouped,
        toggleSelectionMode, toggleImageSelection, toggleImageGroupSelection,
        handleSelectAll, handleBulkDelete, handleBulkAddToCollection,
        handleBulkPublishToCommunity, handleBulkAddTags, setIsCollectionModalOpen,
        setIsTagModalOpen, groupImagesByPromptSet, setSelectedIds, isAdmin, viewMode, setViewMode
    } = dashboardData;

    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const dailyRemaining = credits
        ? Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    return (
        <div className="min-h-screen bg-black text-white relative">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none" />
            <DashboardHeader
                user={user}
                profile={profile}
                credits={credits}
                availableCredits={availableCredits}
                isAdminOrSu={isAdmin}
                effectiveRole={effectiveRole}
                switchRole={switchRole}
                setAudienceMode={setAudienceMode}
                signOut={signOut}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 relative z-10">
                {/* Unified SU Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-widest leading-none">
                            <Icons.terminal className="text-red-500 w-8 h-8" />
                            SU Command Center
                        </h1>
                        <p className="text-white/40 mt-3 font-bold uppercase tracking-widest text-[10px]">
                            Global Oversight · Neural Infrastructure Sovereignty
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 shadow-inner backdrop-blur-md">
                            <Button
                                variant={viewMode === 'personal' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('personal')}
                                className={cn(
                                    "rounded-lg text-[10px] h-9 px-4 font-black tracking-widest uppercase transition-all duration-300",
                                    viewMode === 'personal' ? "bg-primary/20 text-primary shadow-sm" : "text-white/40 hover:text-white"
                                )}
                            >
                                My Feed
                            </Button>
                            <Button
                                variant={viewMode === 'admin' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('admin')}
                                className={cn(
                                    "rounded-lg text-[10px] h-9 px-4 font-black tracking-widest uppercase transition-all duration-300",
                                    viewMode === 'admin' ? "bg-accent/20 text-accent shadow-sm" : "text-white/40 hover:text-white"
                                )}
                            >
                                Admin
                            </Button>
                            <Button
                                variant={viewMode === 'global' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('global')}
                                className={cn(
                                    "rounded-lg text-[10px] h-9 px-4 font-black tracking-widest uppercase transition-all duration-300",
                                    viewMode === 'global' ? "bg-red-500/20 text-red-500 shadow-sm" : "text-white/40 hover:text-white"
                                )}
                            >
                                Global
                            </Button>
                            <Button
                                variant={viewMode === 'plans' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('plans')}
                                className={cn(
                                    "rounded-lg text-[10px] h-9 px-4 font-black tracking-widest uppercase transition-all duration-300",
                                    viewMode === 'plans' ? "bg-amber-500/20 text-amber-500 shadow-sm" : "text-white/40 hover:text-white"
                                )}
                            >
                                Plans
                            </Button>
                        </div>
                    </div>
                </div>

                <UserPulseStats dashboardData={dashboardData} />

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4 mb-10">
                    <Button onClick={() => router.push('/generate')} className="flex items-center gap-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 shadow-lg shadow-primary/20">
                        <Icons.plus size={20} />
                        New Image
                    </Button>
                    <Button onClick={() => router.push('/admin')} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 transition-all">
                        <Icons.settings size={20} />
                        Admin Panel
                    </Button>
                    <Button onClick={() => router.push('/community')} className="flex items-center gap-2 bg-white/5 border border-white/10 text-emerald-500/70 hover:text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 transition-all group">
                        <Icons.globe size={20} className="group-hover:rotate-12 transition-transform" />
                        Community
                    </Button>
                    <Button onClick={() => router.push('/community/leaderboard')} className="flex items-center gap-2 bg-white/5 border border-white/10 text-yellow-500/70 hover:text-yellow-500 rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 transition-all group">
                        <Icons.trophy size={20} className="group-hover:scale-110 transition-transform" />
                        Leaderboard
                    </Button>
                    <Button onClick={() => router.push('/gallery')} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 transition-all">
                        <Icons.image size={20} />
                        Gallery
                    </Button>
                    <Button onClick={() => router.push('/collections')} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 transition-all">
                        <Icons.stack size={20} />
                        Collections
                    </Button>
                    <Button onClick={() => router.push('/analytics')} className="flex items-center gap-2 bg-white/5 border border-white/10 text-accent/70 hover:text-accent rounded-xl text-[10px] font-black uppercase tracking-widest h-12 px-6 transition-all group">
                        <Icons.activity size={20} className="group-hover:scale-110 transition-transform" />
                        Analytics
                    </Button>
                </div>

                <div className="mb-10">
                    {viewMode === 'global' ? (
                        <GlobalResourcePulse />
                    ) : viewMode === 'plans' ? (
                        <PlanManager />
                    ) : (
                        <ResourceVitality
                            usage={dashboardData.resourceUsageData?.usage || {}}
                            quotas={dashboardData.resourceUsageData?.quotas || { storageBytes: 0, dbWritesDaily: 0, cpuTimeMsPerMonth: 0, burstAllowanceBytes: 0 }}
                            burstUsed={dashboardData.resourceUsageData?.burstUsed || false}
                            burstAuthorized={dashboardData.resourceUsageData?.burstAuthorized || false}
                            tier={dashboardData.resourceUsageData?.tier || 'free'}
                            loading={dashboardData.resourceUsageLoading}
                        />
                    )}
                </div>


                <div className="p-6 mb-10 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                        <Icons.zap size={12} className="text-primary" />
                        Resource Economics
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                            <div>
                                <p className="font-black uppercase tracking-widest text-[10px] text-white/90">Standard</p>
                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-1">1024px Image</p>
                            </div>
                            <span className="text-xl font-black text-primary group-hover:scale-110 transition-transform">{CREDIT_COSTS.standard}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                            <div>
                                <p className="font-black uppercase tracking-widest text-[10px] text-white/90">High Def</p>
                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-1">2K resolution</p>
                            </div>
                            <span className="text-xl font-black text-primary group-hover:scale-110 transition-transform">{CREDIT_COSTS.high}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                            <div>
                                <p className="font-black uppercase tracking-widest text-[10px] text-white/90">Ultra 4K</p>
                                <p className="text-[9px] text-accent uppercase tracking-widest font-bold mt-1">Pro only</p>
                            </div>
                            <span className="text-xl font-black text-accent group-hover:scale-110 transition-transform">{CREDIT_COSTS.ultra}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:border-primary/40 transition-all group ring-1 ring-primary/20">
                            <div>
                                <p className="font-black uppercase tracking-widest text-[10px] text-primary">Video</p>
                                <p className="text-[9px] text-primary/50 uppercase tracking-widest font-bold mt-1">Pro · 5-sec</p>
                            </div>
                            <span className="text-xl font-black text-primary group-hover:scale-110 transition-transform">{CREDIT_COSTS.video}</span>
                        </div>
                    </div>
                </div>

                <CommunityPulse entries={recentCommunityEntries} />
                <Exemplars entries={dashboardData.exemplars} />

                <CreditActivity
                    isExpanded={isHistoryExpanded}
                    setIsExpanded={setIsHistoryExpanded}
                    loading={loadingHistory}
                    history={creditHistory}
                    recentImages={recentImages}
                />

                <RecentCreations
                    title={viewMode === 'personal' ? "Your Recent Creations" :
                        viewMode === 'admin' ? "Recent Admin Activity" : "Global Creation Feed"}
                    images={recentImages}
                    loading={loadingImages}
                    isGrouped={isGrouped}
                    setIsGrouped={setIsGrouped}
                    selectionMode={selectionMode}
                    toggleSelectionMode={toggleSelectionMode}
                    selectedIds={selectedIds}
                    toggleImageSelection={toggleImageSelection}
                    toggleImageGroupSelection={toggleImageGroupSelection}
                    groupImagesByPromptSet={groupImagesByPromptSet}
                />
            </main>

            {/* Floating Bulk Actions */}
            {/* Floating Bulk Actions - Focused Style */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-6 px-6 py-4 bg-black/80 backdrop-blur-2xl border border-primary/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                        <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-white font-black text-[10px] uppercase shadow-[0_0_15px_rgba(99,102,241,0.4)]">{selectedIds.size}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Selected</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white">All</Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white">Clear</Button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <Button variant="secondary" size="sm" onClick={() => setIsCollectionModalOpen(true)} className="bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4 text-white/70">
                            Collection
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleBulkPublishToCommunity}
                            disabled={isBulkPublishing}
                            className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4"
                        >
                            {isBulkPublishing ? <Icons.spinner className="w-3 h-3 animate-spin" /> : 'Community'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setIsTagModalOpen(true)} className="bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4 text-white/70">
                            Tag
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-red-500/20 border border-red-500/30 text-red-500 hover:bg-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4 flex items-center gap-2"
                        >
                            {isBulkDeleting ? <Icons.spinner className="w-3 h-3 animate-spin" /> : <Icons.delete size={12} />}
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <CollectionSelectModal
                isOpen={isCollectionModalOpen}
                onClose={() => setIsCollectionModalOpen(false)}
                onSelect={handleBulkAddToCollection}
                collections={collections}
                isProcessing={isBulkCollecting}
            />

            <BulkTagModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                onApply={handleBulkAddTags}
                isProcessing={isBulkTagging}
                selectedPrompts={recentImages.filter((img: any) => selectedIds.has(img.id)).map((img: any) => img.prompt)}
            />
        </div>
    );
}
