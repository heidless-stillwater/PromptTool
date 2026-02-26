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
        <div className="min-h-screen">
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

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Onboarding prototype link */}
                <Link href="/prototypes/onboarding" className="block mb-6">
                    <Card className="p-4 border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">🚀</div>
                            <div>
                                <h3 className="font-bold text-sm">Onboarding Prototype</h3>
                                <p className="text-xs text-foreground-muted">Preview the new user onboarding experience</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[9px] uppercase tracking-widest">Preview →</Badge>
                    </Card>
                </Link>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">SU Command Center</h1>
                        <p className="text-foreground-muted">Global oversight and system management</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-background-secondary rounded-xl p-1 border border-primary/20 shadow-lg shadow-primary/5">
                            <Button
                                variant={viewMode === 'personal' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('personal')}
                                className={cn(
                                    "rounded-lg text-[9px] h-8 px-4 font-black tracking-widest uppercase transition-all",
                                    viewMode === 'personal' ? "shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-foreground"
                                )}
                            >
                                My Feed
                            </Button>
                            <Button
                                variant={viewMode === 'admin' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('admin')}
                                className={cn(
                                    "rounded-lg text-[9px] h-8 px-4 font-black tracking-widest uppercase transition-all",
                                    viewMode === 'admin' ? "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20" : "text-zinc-500 hover:text-foreground"
                                )}
                            >
                                Admin Activity
                            </Button>
                            <Button
                                variant={viewMode === 'global' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('global')}
                                className={cn(
                                    "rounded-lg text-[9px] h-8 px-4 font-black tracking-widest uppercase transition-all",
                                    viewMode === 'global' ? "bg-error hover:bg-error-hover text-white shadow-lg shadow-error/20" : "text-zinc-500 hover:text-foreground"
                                )}
                            >
                                Global Feed
                            </Button>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                            SUPER USER ACCESS
                        </Badge>

                        {/* Experience Mode toggle — same as MemberDashboard */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Mode</span>
                            <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 shadow-inner">
                                <Button
                                    variant={profile.audienceMode !== 'professional' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setAudienceMode('casual')}
                                    className="px-4 py-1.5 rounded-lg text-[9px] h-8 font-black tracking-widest uppercase transition-all"
                                >
                                    Casual
                                </Button>
                                <Button
                                    variant={profile.audienceMode === 'professional' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setAudienceMode('professional')}
                                    className="px-4 py-1.5 rounded-lg text-[9px] h-8 font-black tracking-widest uppercase transition-all"
                                >
                                    Professional
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

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
                    <Button variant="secondary" onClick={() => router.push('/admin')} className="flex items-center gap-2 border-primary/20">
                        <Icons.settings size={20} />
                        Admin Panel
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/community')} className="flex items-center gap-2 border-emerald-500/20 hover:border-emerald-500/50 group transition-all">
                        <Icons.globe size={20} className="group-hover:rotate-12 transition-transform text-emerald-500" />
                        Community Hub
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/community/leaderboard')} className="flex items-center gap-2 border-yellow-500/20 hover:border-yellow-500/50 group transition-all">
                        <Icons.trophy size={20} className="group-hover:scale-110 transition-transform text-yellow-500" />
                        Hall of Fame
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/gallery')} className="flex items-center gap-2">
                        <Icons.image size={20} />
                        View Gallery
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/collections')} className="flex items-center gap-2">
                        <Icons.stack size={20} />
                        My Collections
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/analytics')} className="flex items-center gap-2 border-accent/20 hover:border-accent/50 group transition-all">
                        <Icons.activity size={20} className="group-hover:scale-110 transition-transform" />
                        Global Analytics
                    </Button>
                </div>

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

                <CommunityPulse entries={recentCommunityEntries} />

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
                            onClick={handleBulkPublishToCommunity}
                            disabled={isBulkPublishing}
                            className="border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
                        >
                            {isBulkPublishing ? <Icons.spinner className="w-3 h-3 animate-spin" /> : <><span className="mr-2">🏆</span> Community</>}
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
                selectedPrompts={recentImages.filter((img: any) => selectedIds.has(img.id)).map((img: any) => img.prompt)}
            />
        </div>
    );
}
