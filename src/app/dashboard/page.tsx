'use client';

import Link from 'next/link';
import { useDashboard } from '@/hooks/useDashboard';
import { CREDIT_COSTS } from '@/lib/types';
import CollectionSelectModal from '@/components/CollectionSelectModal';
import BulkTagModal from '@/components/BulkTagModal';

// Sub-components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardStats from '@/components/dashboard/DashboardStats';
import CreditActivity from '@/components/dashboard/CreditActivity';
import RecentCreations from '@/components/dashboard/RecentCreations';

import { Suspense } from 'react';

function DashboardContent() {
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
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
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
                    <Link href="/generate" className="btn-primary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Create New Image
                    </Link>
                    <Link href="/gallery" className="btn-secondary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        View Gallery
                    </Link>
                    <Link href="/collections" className="btn-secondary flex items-center gap-2">
                        <span className="text-lg">📁</span>
                        My Collections
                    </Link>
                    <Link href="/league" className="btn-secondary flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        Community League
                    </Link>
                    <Link href="/analytics" className="btn-secondary flex items-center gap-2 border-accent/20 hover:border-accent/50 group transition-all">
                        <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                        Creator Analytics
                    </Link>
                    {profile.subscription === 'free' && (
                        <Link href="/pricing" className="btn-secondary flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Upgrade Plan
                        </Link>
                    )}
                </div>

                {/* Credit Costs */}
                <div className="glass-card p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4">Credit Costs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">Standard</p>
                                <p className="text-sm text-foreground-muted">1024px</p>
                            </div>
                            <span className="text-lg font-bold text-primary">{CREDIT_COSTS.standard} credit</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">High</p>
                                <p className="text-sm text-foreground-muted">2K resolution</p>
                            </div>
                            <span className="text-lg font-bold text-primary">{CREDIT_COSTS.high} credits</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">Ultra</p>
                                <p className="text-sm text-foreground-muted">4K (Pro only)</p>
                            </div>
                            <span className="text-lg font-bold text-accent">{CREDIT_COSTS.ultra} credits</span>
                        </div>
                    </div>
                </div>

                {/* Pulse Widget */}
                {recentLeagueEntries.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🔥</span>
                                <h2 className="text-xl font-bold">Community Pulse</h2>
                            </div>
                            <Link href="/league" className="text-sm text-primary font-bold hover:underline">
                                View All Activity →
                            </Link>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                            {recentLeagueEntries.map((entry) => (
                                <Link key={entry.id} href={`/league?entry=${entry.id}`} className="flex-shrink-0 w-64 group snap-start">
                                    <div className="aspect-video rounded-xl overflow-hidden relative mb-2 border border-border/50">
                                        <img src={entry.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                            <div className="text-white text-xs font-medium truncate w-full">by {entry.authorName}</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground-muted line-clamp-1 group-hover:text-foreground transition-colors">{entry.prompt}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

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
                <div className="glass-card flex items-center gap-6 px-6 py-4 shadow-2xl border-primary/20">
                    <div className="flex items-center gap-3 pr-6 border-r border-border">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">{selectedIds.size}</span>
                        <span className="text-sm font-semibold">Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll} className="btn-secondary text-xs px-3 py-2">Select All</button>
                        <button onClick={() => setSelectedIds(new Set())} className="btn-secondary text-xs px-3 py-2">Clear</button>
                        <div className="w-px h-6 bg-border mx-2" />
                        <button onClick={() => setIsCollectionModalOpen(true)} className="btn-secondary text-xs px-3 py-2">📁 Collection</button>
                        <button onClick={handleBulkPublishToLeague} disabled={isBulkPublishing} className="btn-secondary text-xs px-3 py-2 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10">
                            {isBulkPublishing ? <div className="spinner w-3 h-3" /> : '🏆 League'}
                        </button>
                        <button onClick={() => setIsTagModalOpen(true)} className="btn-secondary text-xs px-3 py-2">🏷️ Tag</button>
                        <button onClick={handleBulkDelete} disabled={isBulkDeleting} className="btn-primary !bg-error hover:!bg-error-hover text-xs px-4 py-2 flex items-center gap-2">
                            {isBulkDeleting ? <div className="spinner w-3 h-3" /> : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                            )}
                            Delete
                        </button>
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
            />
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
            <DashboardContent />
        </Suspense>
    );
}
