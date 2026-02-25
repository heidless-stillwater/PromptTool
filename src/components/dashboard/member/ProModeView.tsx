'use client';

import { Card } from '@/components/ui/Card';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentCreations from '@/components/dashboard/RecentCreations';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import CollectionSelectModal from '@/components/CollectionSelectModal';
import BulkTagModal from '@/components/BulkTagModal';
import CommunityPulse from '@/components/dashboard/CommunityPulse';
import MiniAnalytics from '@/components/dashboard/MiniAnalytics';
import { useRouter } from 'next/navigation';

interface ProModeViewProps {
    dashboardData: any;
}

export default function ProModeView({ dashboardData }: ProModeViewProps) {
    const {
        user, profile, credits, availableCredits, dailyRemaining, recentImages,
        loadingImages, isGrouped, setIsGrouped, selectionMode, toggleSelectionMode,
        selectedIds, toggleImageSelection, toggleImageGroupSelection, groupImagesByPromptSet,
        isCollectionModalOpen, setIsCollectionModalOpen, isTagModalOpen, setIsTagModalOpen,
        handleBulkAddTags, handleBulkAddToCollection, isBulkTagging, isBulkCollecting,
        collections
    } = dashboardData;
    const router = useRouter();

    const handleQuickTool = (tool: string) => {
        if (!selectionMode) {
            toggleSelectionMode();
            return;
        }

        if (selectedIds.size === 0) {
            alert(`Please select some images first to use ${tool}.`);
            return;
        }

        if (tool === 'Bulk Tagging') setIsTagModalOpen(true);
        if (tool === 'Manage Collections') setIsCollectionModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-black uppercase tracking-tighter">Pro Workstation</h1>
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold rounded uppercase tracking-widest border border-accent/20">Advanced Analytics Enabled</span>
                </div>
            </div>

            <DashboardStats
                availableCredits={availableCredits}
                dailyRemaining={dailyRemaining}
                balance={credits?.balance || 0}
                imageCount={recentImages.length}
                subscription={profile.subscription}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
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
                        dense={true}
                    />
                </div>
                <div className="space-y-6">
                    <MiniAnalytics userId={user.uid} />
                    <Card variant="glass" className="p-4 bg-background-secondary/30 border-primary/10">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Icons.settings size={14} className="text-primary" />
                            Quick Tools
                        </h3>
                        <div className="grid gap-2">
                            {/* --- Primary Action --- */}
                            <button
                                onClick={() => router.push('/generate?newset=1')}
                                className="w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="opacity-80">✨</span>
                                    Create New Image Set
                                </span>
                                <Icons.arrowRight size={12} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            <div className="border-t border-border/40 my-1" />

                            {/* --- Selection-mode tools --- */}
                            {[
                                { name: 'Bulk Tagging', icon: '🏷️' },
                                { name: 'Manage Collections', icon: '📁' },
                                { name: 'Batch Export', icon: '📦' }
                            ].map(tool => (
                                <button
                                    key={tool.name}
                                    onClick={() => handleQuickTool(tool.name)}
                                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${selectionMode && selectedIds.size > 0
                                        ? 'bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/10'
                                        : 'bg-background-secondary hover:bg-primary/10 border border-transparent'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="opacity-70">{tool.icon}</span>
                                        {tool.name}
                                    </span>
                                    <span className={`opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase ${selectionMode ? 'text-primary' : 'text-foreground-muted'}`}>
                                        {selectionMode && selectedIds.size > 0 ? 'Apply' : 'Select'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-border/50 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-2 px-1">Social Discovery</p>
                            <Button
                                variant="secondary"
                                onClick={() => router.push('/community')}
                                className="w-full justify-start gap-3 h-11 border-emerald-500/10 hover:border-emerald-500/40 group/hub"
                            >
                                <Icons.globe size={16} className="text-emerald-500 group-hover/hub:rotate-12 transition-transform" />
                                <span className="text-xs font-bold transition-colors">Community Hub</span>
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => router.push('/community/leaderboard')}
                                className="w-full justify-start gap-3 h-11 border-yellow-500/10 hover:border-yellow-500/40 group/hof"
                            >
                                <Icons.trophy size={16} className="text-yellow-500 group-hover/hof:scale-110 transition-transform" />
                                <span className="text-xs font-bold transition-colors">Hall of Fame</span>
                            </Button>
                        </div>

                        {selectionMode && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSelectionMode}
                                className="w-full mt-4 text-[10px] uppercase font-black tracking-widest text-foreground-muted hover:text-foreground"
                            >
                                Cancel Selection
                            </Button>
                        )}
                    </Card>
                </div>
            </div>

            <div className="pt-8 border-t border-border/50">
                <CommunityPulse entries={dashboardData.recentCommunityEntries} />
            </div>

            {/* Modals */}
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
