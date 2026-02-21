'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { CREDIT_COSTS } from '@/lib/types';
import CollectionSelectModal from '@/components/CollectionSelectModal';
import BulkTagModal from '@/components/BulkTagModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';

// Sub-components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardStats from '@/components/dashboard/DashboardStats';
import CreditActivity from '@/components/dashboard/CreditActivity';
import RecentCreations from '@/components/dashboard/RecentCreations';
import CommunityPulse from '@/components/dashboard/CommunityPulse';

import { Suspense } from 'react';
import { SkeletonDashboard } from '@/components/ui/SkeletonDashboard';

function DashboardContent() {
    const router = useRouter();
    const {
        user, profile, authLoading, credits, recentImages, creditHistory, recentLeagueEntries,
        collections, loadingImages, loadingLeague, loadingHistory, isHistoryExpanded,
        isGrouped, selectionMode, selectedIds, isBulkDeleting, isBulkPublishing,
        isBulkCollecting, isBulkTagging, isCollectionModalOpen, isTagModalOpen, effectiveRole,
        signOut, switchRole, setAudienceMode, setIsHistoryExpanded, setIsGrouped,
        toggleSelectionMode, toggleImageSelection, toggleImageGroupSelection,
        handleSelectAll, handleBulkDelete, handleBulkAddToCollection,
        handleBulkPublishToLeague, handleBulkAddTags, setIsCollectionModalOpen,
        setIsTagModalOpen, groupImagesByPromptSet, setSelectedIds
    } = useDashboard();

    if (authLoading) {
        return <SkeletonDashboard />;
    }

    if (!user || !profile) return null;

    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const dailyRemaining = credits
        ? Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const isAdminOrSu = profile.role === 'admin' || profile.role === 'su';

    return (
        <div className="min-h-screen">
            <DashboardHeader
                user={user}
                profile={profile}
                credits={credits}
                availableCredits={availableCredits}
                isAdminOrSu={isAdminOrSu}
                effectiveRole={effectiveRole}
                switchRole={switchRole}
                setAudienceMode={setAudienceMode}
                signOut={signOut}
            />

            <main className="max-w-7xl mx-auto px-4 py-8">
                <DashboardHero
                    audienceMode={profile.audienceMode}
                    userId={user.uid}
                />

                <DashboardStats
                    availableCredits={availableCredits}
                    dailyRemaining={dailyRemaining}
                    balance={credits?.balance || 0}
                    imageCount={recentImages.length}
                    subscription={profile.subscription}
                />

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <Button onClick={() => router.push('/generate')} className="flex items-center gap-2">
                        <Icons.plus size={20} />
                        Create New Image
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/gallery')} className="flex items-center gap-2">
                        <Icons.image size={20} />
                        View Gallery
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/collections')} className="flex items-center gap-2">
                        <Icons.stack size={20} />
                        My Collections
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/league')} className="flex items-center gap-2">
                        <Icons.trophy size={20} />
                        Community League
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/analytics')} className="flex items-center gap-2 border-accent/20 hover:border-accent/50 group transition-all">
                        <Icons.activity size={20} className="group-hover:scale-110 transition-transform" />
                        Creator Analytics
                    </Button>
                    {profile.subscription === 'free' && (
                        <Button variant="secondary" onClick={() => router.push('/pricing')} className="flex items-center gap-2">
                            <Icons.sparkles size={20} />
                            Upgrade Plan
                        </Button>
                    )}
                </div>

                {/* Credit Costs */}
                <Card variant="glass" className="p-6 mb-8">
                    <h2 className="text-xs font-black uppercase tracking-widest text-foreground-muted mb-4 opacity-70">Credit Consumption</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-4 bg-background-secondary/50 rounded-2xl border border-border/50">
                            <div>
                                <p className="font-bold">Standard</p>
                                <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">1024px Image</p>
                            </div>
                            <span className="text-xl font-black text-primary">{CREDIT_COSTS.standard}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-background-secondary/50 rounded-2xl border border-border/50">
                            <div>
                                <p className="font-bold">High Def</p>
                                <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">2K resolution</p>
                            </div>
                            <span className="text-xl font-black text-primary">{CREDIT_COSTS.high}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-background-secondary/50 rounded-2xl border border-border/50">
                            <div>
                                <p className="font-bold">Ultra 4K</p>
                                <p className="text-[10px] text-accent uppercase tracking-widest font-bold">Pro only</p>
                            </div>
                            <span className="text-xl font-black text-accent">{CREDIT_COSTS.ultra}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-background-secondary/50 rounded-2xl border border-border/50 ring-1 ring-primary/20">
                            <div>
                                <p className="font-bold">Video</p>
                                <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Pro · 5-sec</p>
                            </div>
                            <span className="text-xl font-black text-primary">{CREDIT_COSTS.video}</span>
                        </div>
                    </div>
                </Card>

                <CommunityPulse entries={recentLeagueEntries} />

                <CreditActivity
                    isExpanded={isHistoryExpanded}
                    setIsExpanded={setIsHistoryExpanded}
                    loading={loadingHistory}
                    history={creditHistory}
                    recentImages={recentImages}
                />

                <RecentCreations
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
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <Card variant="glass" className="flex items-center gap-6 px-6 py-4 shadow-2xl border-primary/20">
                    <div className="flex items-center gap-3 pr-6 border-r border-border">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">{selectedIds.size}</span>
                        <span className="text-sm font-semibold">Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={handleSelectAll}>Select All</Button>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                        <div className="w-px h-6 bg-border mx-2" />
                        <Button variant="secondary" size="sm" onClick={() => setIsCollectionModalOpen(true)}>
                            <span className="mr-2">📁</span> Collection
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleBulkPublishToLeague}
                            disabled={isBulkPublishing}
                            className="border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
                        >
                            {isBulkPublishing ? <Icons.spinner className="w-3 h-3 animate-spin" /> : <><span className="mr-2">🏆</span> League</>}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setIsTagModalOpen(true)}>
                            <span className="mr-2">🏷️</span> Tag
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="flex items-center gap-2"
                        >
                            {isBulkDeleting ? <Icons.spinner className="w-3 h-3 animate-spin" /> : <Icons.delete size={14} />}
                            Delete
                        </Button>
                    </div>
                </Card>
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
                selectedPrompts={recentImages.filter(img => selectedIds.has(img.id)).map(img => img.prompt)}
            />
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<SkeletonDashboard />}>
            <DashboardContent />
        </Suspense>
    );
}
