'use client';

import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { Collection } from '@/lib/types';

export type SortMode = 'trending' | 'newest' | 'alltime' | 'liked' | 'shared' | 'variations' | 'recent' | 'creations' | 'influence' | 'images' | 'followed';
export type ViewMode = 'grid' | 'feed' | 'compact' | 'creators';

interface CommunityHeaderProps {
    sortMode: SortMode;
    onSortChange: (mode: SortMode) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    isGrouped: boolean;
    onToggleGrouped: () => void;
    isGroupedByUser: boolean;
    onToggleGroupedByUser: () => void;
    isGroupedByCollection: boolean;
    onToggleGroupedByCollection: () => void;
    filterUserName: string | null;
    filterCollectionName?: string | null;
    onClearFilter: () => void;
    collections?: Collection[];
    onFilterCollection?: (colId: string, colName: string) => void;
    onManageCollections?: () => void;
    canManageCollections?: boolean;
}

export default function CommunityHeader({
    sortMode,
    onSortChange,
    viewMode,
    onViewModeChange,
    isGrouped,
    onToggleGrouped,
    isGroupedByUser,
    onToggleGroupedByUser,
    isGroupedByCollection,
    onToggleGroupedByCollection,
    filterUserName,
    filterCollectionName,
    onClearFilter,
    collections,
    onFilterCollection,
    onManageCollections,
    canManageCollections = false
}: CommunityHeaderProps) {
    const tabs = [
        { key: 'trending', label: 'Trending', icon: <Icons.zap size={16} className="text-orange-400" /> },
        { key: 'newest', label: 'Newest', icon: <Icons.sparkles size={16} className="text-blue-400" /> },
        { key: 'alltime', label: 'All Time', icon: <Icons.trophy size={16} className="text-yellow-400" /> },
    ] as const;

    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Icons.globe className="text-emerald-500 w-8 h-8" />
                        Community Hub
                    </h1>
                    <p className="text-foreground-muted mt-1">
                        Vote for your favorite AI-generated images from the community
                    </p>

                    {(filterUserName || filterCollectionName) && (
                        <div className="flex items-center gap-2 mt-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                                {filterUserName ? (
                                    <>
                                        <Icons.user size={14} className="text-primary" />
                                        <span className="text-xs font-bold text-primary">Creator: {filterUserName}</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.stack size={14} className="text-primary" />
                                        <span className="text-xs font-bold text-primary">Collection: {filterCollectionName}</span>
                                    </>
                                )}
                                <button
                                    onClick={onClearFilter}
                                    className="ml-1 hover:bg-primary/20 rounded-full transition-colors p-0.5"
                                    title="Clear filter"
                                >
                                    <Icons.close size={12} className="text-primary" />
                                </button>
                            </div>
                            <span className="text-[10px] uppercase tracking-widest font-black text-foreground-muted opacity-40">Filtering feed</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                    {/* Sort Tabs */}
                    <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 shadow-inner">
                        {tabs.map(tab => (
                            <Button
                                key={tab.key}
                                variant={sortMode === tab.key ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => onSortChange(tab.key)}
                                className={`rounded-lg gap-2 ${sortMode !== tab.key ? 'text-foreground-muted hover:text-foreground' : ''}`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </Button>
                        ))}
                    </div>

                    {/* View Options */}
                    <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 shadow-inner">
                        {[
                            { key: 'grid', label: 'Grid', icon: <Icons.grid size={16} /> },
                            { key: 'feed', label: 'Feed', icon: <Icons.feed size={16} /> },
                            { key: 'compact', label: 'Compact', icon: <Icons.list size={16} /> },
                            { key: 'creators', label: 'Creators', icon: <Icons.users size={16} /> },
                        ].map(view => (
                            <Button
                                key={view.key}
                                variant={viewMode === view.key ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange(view.key as any)}
                                className={`rounded-lg px-3 ${viewMode !== view.key ? 'text-foreground-muted hover:text-foreground' : 'bg-background shadow-sm text-foreground'}`}
                                title={view.label}
                            >
                                {view.icon}
                                <span className="hidden lg:inline ml-2">{view.label}</span>
                            </Button>
                        ))}
                    </div>

                    {/* Collection Selector */}
                    {collections && collections.length > 0 && onFilterCollection && (
                        <div className="flex bg-background-secondary rounded-xl border border-border/50 shadow-inner px-2 py-0 items-center h-[40px] relative group h-full">
                            <Icons.stack size={14} className="text-foreground-muted mx-2 shrink-0 pointer-events-none absolute left-0" />
                            <select
                                className="bg-transparent pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-0 font-medium appearance-none text-foreground-muted hover:text-foreground cursor-pointer h-full border-none w-full"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) {
                                        onClearFilter();
                                        return;
                                    }
                                    const col = collections.find(c => c.id === val);
                                    if (col) onFilterCollection(col.id, col.name);
                                }}
                                value={filterCollectionName ? collections.find(c => c.name === filterCollectionName)?.id || "" : ""}
                                title="Filter by collection"
                            >
                                <option value="" className="bg-background text-foreground">All Collections</option>
                                {collections.map(c => (
                                    <option key={c.id} value={c.id} className="bg-background text-foreground">
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <Icons.chevronDown size={14} className="text-foreground-muted pointer-events-none absolute right-3 shrink-0" />
                        </div>
                    )}

                    <div className="flex gap-2 h-full">
                        {canManageCollections && onManageCollections && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onManageCollections}
                                className="rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] h-10 px-3 sm:px-4 text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                                title="Manage Community Collections"
                            >
                                <Icons.stack size={16} />
                                <span className="hidden sm:inline">Collections</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
