import { Collection } from '@/lib/types';

interface GalleryToolbarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isGrouped: boolean;
    onToggleGrouped: () => void;
    selectionMode: boolean;
    onToggleSelectionMode: () => void;
    onClearSelection: () => void;
    filterTag: string;
    onFilterTagChange: (value: string) => void;
    filterQuality: string;
    onFilterQualityChange: (value: any) => void;
    filterAspectRatio: string;
    onFilterAspectRatioChange: (value: string) => void;
    collections: Collection[];
    showAdvancedFilters: boolean;
    onToggleAdvancedFilters: () => void;

    // Advanced Filter Props
    filterSeed: string;
    onFilterSeedChange: (value: string) => void;
    filterGuidanceMin: string;
    onFilterGuidanceMinChange: (value: string) => void;
    filterGuidanceMax: string;
    onFilterGuidanceMaxChange: (value: string) => void;
    filterHasNegativePrompt: string;
    onFilterHasNegativePromptChange: (value: any) => void;
    onClearAdvancedFilters: () => void;
}

export default function GalleryToolbar({
    searchQuery, onSearchChange,
    isGrouped, onToggleGrouped,
    selectionMode, onToggleSelectionMode, onClearSelection,
    filterTag, onFilterTagChange,
    filterQuality, onFilterQualityChange,
    filterAspectRatio, onFilterAspectRatioChange,
    collections,
    showAdvancedFilters, onToggleAdvancedFilters,
    filterSeed, onFilterSeedChange,
    filterGuidanceMin, onFilterGuidanceMinChange,
    filterGuidanceMax, onFilterGuidanceMaxChange,
    filterHasNegativePrompt, onFilterHasNegativePromptChange,
    onClearAdvancedFilters
}: GalleryToolbarProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 p-4 glass-card bg-background-secondary/30 rounded-xl">
                {/* Search */}
                <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by prompt..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm text-foreground placeholder:text-foreground-muted"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-4 items-center overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
                    <button
                        onClick={onToggleGrouped}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border border-border transition-all flex items-center gap-2 whitespace-nowrap ${isGrouped
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-background-secondary text-foreground hover:bg-background-secondary/80'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isGrouped ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            )}
                        </svg>
                        {isGrouped ? 'Grouped' : 'Grid'}
                    </button>

                    {/* Select Mode Toggle */}
                    <button
                        onClick={() => {
                            onToggleSelectionMode();
                            if (selectionMode) onClearSelection();
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border border-border transition-all flex items-center gap-2 whitespace-nowrap ${selectionMode
                            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                            : 'bg-background-secondary text-foreground hover:bg-background-secondary/80'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        {selectionMode ? 'Cancel' : 'Select'}
                    </button>

                    {/* Tag Filter */}
                    <div className="h-6 w-px bg-border mx-2" />

                    <select
                        value={filterTag}
                        onChange={(e) => onFilterTagChange(e.target.value)}
                        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                        <option value="all">All Tags</option>
                        {Array.from(new Set(collections.flatMap(c => c.tags || []))).sort().map(tag => (
                            <option key={tag} value={tag}>#{tag}</option>
                        ))}
                    </select>

                    <div className="h-6 w-px bg-border mx-2" />

                    <select
                        value={filterQuality}
                        onChange={(e) => onFilterQualityChange(e.target.value as any)}
                        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                        <option value="all">All Qualities</option>
                        <option value="standard">Standard</option>
                        <option value="high">High</option>
                        <option value="ultra">Ultra</option>
                    </select>

                    <select
                        value={filterAspectRatio}
                        onChange={(e) => onFilterAspectRatioChange(e.target.value)}
                        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                        <option value="all">All Aspects</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                        <option value="3:4">3:4 Portrait</option>
                    </select>

                    {/* Advanced Filters Toggle */}
                    <div className="h-6 w-px bg-border mx-2" />
                    <button
                        onClick={onToggleAdvancedFilters}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border border-border transition-all flex items-center gap-2 whitespace-nowrap ${showAdvancedFilters || filterSeed || filterGuidanceMin || filterGuidanceMax || filterHasNegativePrompt !== 'all'
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-background-secondary text-foreground hover:bg-background-secondary/80'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Advanced
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <div className="p-4 glass-card bg-background-secondary/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-muted">Advanced Filters</h3>
                        <button
                            onClick={onClearAdvancedFilters}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Seed Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-foreground-muted">Seed</label>
                            <input
                                type="text"
                                placeholder="e.g. 42"
                                value={filterSeed}
                                onChange={(e) => onFilterSeedChange(e.target.value)}
                                className="w-28 px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-foreground-muted"
                            />
                        </div>

                        {/* Guidance Scale Range */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-foreground-muted">Guidance Scale</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filterGuidanceMin}
                                    onChange={(e) => onFilterGuidanceMinChange(e.target.value)}
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    className="w-20 px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-foreground-muted"
                                />
                                <span className="text-foreground-muted text-xs">—</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filterGuidanceMax}
                                    onChange={(e) => onFilterGuidanceMaxChange(e.target.value)}
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    className="w-20 px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-foreground-muted"
                                />
                            </div>
                        </div>

                        {/* Negative Prompt Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-foreground-muted">Negative Prompt</label>
                            <select
                                value={filterHasNegativePrompt}
                                onChange={(e) => onFilterHasNegativePromptChange(e.target.value as any)}
                                className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            >
                                <option value="all">Any</option>
                                <option value="yes">Has Negative Prompt</option>
                                <option value="no">No Negative Prompt</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
