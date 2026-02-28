'use client';

import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentCreations from '@/components/dashboard/RecentCreations';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import CollectionSelectModal from '@/components/CollectionSelectModal';
import BulkTagModal from '@/components/BulkTagModal';
import CommunityPulse from '@/components/dashboard/CommunityPulse';
import Exemplars from '@/components/dashboard/Exemplars';
import MiniAnalytics from '@/components/dashboard/MiniAnalytics';
import { useRouter } from 'next/navigation';
import UserPulseStats from '@/components/dashboard/UserPulseStats';

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
        <div className="space-y-10 animate-in fade-in duration-700 pb-24">
            {/* Unified Pro Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 mb-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-widest leading-none">
                        <Icons.zap className="text-primary w-8 h-8" />
                        Pro Workstation
                    </h1>
                    <p className="text-white/40 mt-3 font-bold uppercase tracking-widest text-[10px]">
                        Neural Operations Command Center · High-Fidelity Infrastructure
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <Icons.circle size={8} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">System Online</span>
                    </div>
                </div>
            </div>

            <UserPulseStats dashboardData={dashboardData} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8" id="recent-creations">
                    <div className="flex items-center gap-4 px-4">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Manifested Work</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
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
                <div className="space-y-8" id="analytics">
                    <div className="flex flex-col gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-6 px-2">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Real-time Performance</h2>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>
                            <MiniAnalytics userId={user.uid} />
                        </div>

                        <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[32px] backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 flex items-center gap-3 text-white/60">
                                <Icons.settings size={16} className="text-primary" />
                                Operations
                            </h3>
                            <div className="grid gap-4">
                                {/* --- Primary Action --- */}
                                <button
                                    onClick={() => router.push('/generate?newset=1')}
                                    className="w-full text-left p-5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-between group bg-primary text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-[1.02] transform duration-300"
                                >
                                    <span className="flex items-center gap-4">
                                        <Icons.wand size={16} className="group-hover:rotate-12 transition-transform" />
                                        <span className="uppercase tracking-[0.2em]">Initialize Sequence</span>
                                    </span>
                                    <Icons.arrowRight size={14} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <div className="h-px bg-white/5 my-2" />

                                {/* --- Selection-mode tools --- */}
                                {[
                                    { name: 'Bulk Tagging', icon: <Icons.plus size={14} />, label: 'Tag Metadata' },
                                    { name: 'Manage Collections', icon: <Icons.grid size={14} />, label: 'Vault Allocation' },
                                    { name: 'Batch Export', icon: <Icons.download size={14} />, label: 'Neural Export' }
                                ].map(tool => (
                                    <button
                                        key={tool.name}
                                        onClick={() => handleQuickTool(tool.name)}
                                        className={`w-full text-left p-5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-between group border ${selectionMode && selectedIds.size > 0
                                            ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                                            : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/40 hover:text-white hover:border-white/20'
                                            }`}
                                    >
                                        <span className="flex items-center gap-4">
                                            <span className="opacity-70">{tool.icon}</span>
                                            <span className="uppercase tracking-[0.2em]">{tool.label}</span>
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${selectionMode && selectedIds.size > 0 ? 'text-primary' : 'opacity-0 group-hover:opacity-40'}`}>
                                            {selectionMode && selectedIds.size > 0 ? 'EXECUTE' : 'SELECT'}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {selectionMode && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleSelectionMode}
                                    className="w-full mt-6 text-[9px] uppercase font-black tracking-[0.3em] text-white/20 hover:text-red-400 transition-all"
                                >
                                    Aborted Selection
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-24 space-y-24 border-t border-white/5">
                <div id="community-pulse">
                    <div className="flex items-center gap-4 mb-10 px-4">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Synchronized Commons</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <CommunityPulse entries={dashboardData.recentCommunityEntries} />
                </div>
                <div id="curated-exemplars">
                    <div className="flex items-center gap-4 mb-10 px-4">
                        <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Validated Prototypes</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    </div>
                    <Exemplars entries={dashboardData.exemplars} />
                </div>
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
