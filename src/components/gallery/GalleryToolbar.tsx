import { Collection } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Icons } from '@/components/ui/Icons';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface GalleryToolbarProps {
    viewMode: 'personal' | 'admin' | 'global';
    setViewMode: (mode: 'personal' | 'admin' | 'global') => void;
    isSu: boolean;
    isGrouped: boolean;
    onToggleGrouped: () => void;
    showHoverOverlay: boolean;
    onToggleHoverOverlay: () => void;
    selectionMode: boolean;
    onToggleSelectionMode: () => void;
    onClearSelection: () => void;
    filterTag: string;
    onFilterTagChange: (value: string) => void;
    filterExemplar: boolean;
    onFilterExemplarChange: (value: boolean) => void;
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
    viewMode, setViewMode, isSu,
    isGrouped, onToggleGrouped,
    showHoverOverlay, onToggleHoverOverlay,
    selectionMode, onToggleSelectionMode, onClearSelection,
    filterTag, onFilterTagChange,
    filterExemplar, onFilterExemplarChange,
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
    const hasActiveAdvanced = filterSeed || filterGuidanceMin || filterGuidanceMax || filterHasNegativePrompt !== 'all';

    return (
        <div className="space-y-6 sticky top-0 z-40 bg-background/50 backdrop-blur-3xl pb-6 -mx-4 px-4 pt-1 transition-all duration-300">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap gap-3 items-center shadow-xl">
                {/* Filters */}
                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="flex bg-black/40 rounded-[14px] p-1 border border-white/5 shadow-inner">
                        <Button
                            variant={!isGrouped ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => !isGrouped ? null : onToggleGrouped()}
                            className={cn(
                                "rounded-xl text-[10px] h-8 px-4 font-black tracking-widest uppercase transition-all",
                                !isGrouped ? "bg-primary/10 text-primary shadow-sm" : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icons.grid size={14} className="mr-2" />
                            Grid
                        </Button>
                        <Button
                            variant={isGrouped ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => isGrouped ? null : onToggleGrouped()}
                            className={cn(
                                "rounded-xl text-[10px] h-8 px-4 font-black tracking-widest uppercase transition-all",
                                isGrouped ? "bg-primary/10 text-primary shadow-sm" : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icons.stack size={14} className="mr-2" />
                            Sets
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                    <Button
                        variant={showHoverOverlay ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={onToggleHoverOverlay}
                        className={cn(
                            "h-10 w-10 p-0 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                            showHoverOverlay ? "bg-primary/20 text-primary border-primary/20" : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70"
                        )}
                        title={showHoverOverlay ? "Hide Text Overlays" : "Show Text Overlays"}
                    >
                        <Icons.eye size={16} className={!showHoverOverlay ? "opacity-50" : ""} />
                    </Button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                    <Button
                        variant={selectionMode ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => {
                            onToggleSelectionMode();
                            if (selectionMode) onClearSelection();
                        }}
                        className={cn(
                            "h-10 px-4 rounded-xl text-[10px] font-black tracking-widest uppercase gap-2 transition-all",
                            selectionMode ? "bg-primary/20 hover:bg-primary/30 text-primary border-primary/20" : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70"
                        )}
                    >
                        <Icons.check size={14} />
                        {selectionMode ? 'Finish' : 'Select'}
                    </Button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                    <Button
                        variant={filterExemplar ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => onFilterExemplarChange(!filterExemplar)}
                        className={cn(
                            "h-10 px-4 rounded-xl text-[10px] font-black tracking-widest uppercase gap-2 transition-all",
                            filterExemplar ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/20" : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70"
                        )}
                    >
                        <Icons.exemplar size={14} className={filterExemplar ? "fill-current" : ""} />
                        Exemplars
                    </Button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                    <div className="flex gap-2 items-center flex-1 md:flex-none min-w-[300px]">
                        <Select
                            value={filterTag}
                            onChange={(e) => onFilterTagChange(e.target.value)}
                            className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-white border-white/5 hover:bg-white/10"
                        >
                            <option value="all">Tags: All</option>
                            {Array.from(new Set(collections.flatMap(c => c.tags || []))).sort().map(tag => (
                                <option key={tag} value={tag}>#{tag.toUpperCase()}</option>
                            ))}
                        </Select>

                        <Select
                            value={filterQuality}
                            onChange={(e) => onFilterQualityChange(e.target.value as any)}
                            className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-white border-white/5 hover:bg-white/10"
                        >
                            <option value="all">Quality: All</option>
                            <option value="standard">Standard</option>
                            <option value="high">High Def</option>
                            <option value="ultra">Ultra 4K</option>
                        </Select>

                        <Select
                            value={filterAspectRatio}
                            onChange={(e) => onFilterAspectRatioChange(e.target.value)}
                            className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-white border-white/5 hover:bg-white/10"
                        >
                            <option value="all">Aspect: All</option>
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Wide</option>
                            <option value="9:16">9:16 Tall</option>
                            <option value="4:3">4:3 Photo</option>
                            <option value="3:4">3:4 Portrait</option>
                        </Select>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                    <Button
                        variant={(showAdvancedFilters || hasActiveAdvanced) ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={onToggleAdvancedFilters}
                        className={cn(
                            "h-10 px-4 rounded-xl text-[10px] font-black tracking-widest uppercase gap-2 transition-all relative",
                            (showAdvancedFilters || hasActiveAdvanced) ? "bg-primary/20 text-primary border-primary/20" : "bg-white/5 hover:bg-white/10 border-white/5 text-white/70"
                        )}
                    >
                        <Icons.filter size={14} />
                        Advanced
                        {hasActiveAdvanced && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background animate-pulse" />
                        )}
                    </Button>

                    {isSu && (
                        <>
                            <div className="h-6 w-px bg-border/50 mx-1 hidden md:block" />
                            <div className="flex bg-background-secondary/50 rounded-xl p-1 border border-primary/20 ring-1 ring-primary/10">
                                <Button
                                    variant={viewMode === 'personal' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('personal')}
                                    className={cn(
                                        "rounded-lg text-[9px] h-8 px-3 font-black tracking-widest uppercase transition-all",
                                        viewMode === 'personal' ? "shadow-lg shadow-primary/20" : "text-foreground-muted hover:text-foreground"
                                    )}
                                >
                                    Personal
                                </Button>
                                <Button
                                    variant={viewMode === 'admin' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('admin')}
                                    className={cn(
                                        "rounded-lg text-[9px] h-8 px-3 font-black tracking-widest uppercase transition-all",
                                        viewMode === 'admin' ? "bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground"
                                    )}
                                >
                                    Admins
                                </Button>
                                <Button
                                    variant={viewMode === 'global' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('global')}
                                    className={cn(
                                        "rounded-lg text-[9px] h-8 px-3 font-black tracking-widest uppercase transition-all",
                                        viewMode === 'global' ? "bg-error hover:bg-error-hover text-white shadow-lg shadow-error/20" : "text-foreground-muted hover:text-foreground"
                                    )}
                                >
                                    Global
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <div className="p-6 rounded-2xl border border-primary/20 bg-primary/[0.03] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Icons.filter size={16} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">Deep Filtering</h3>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground-muted mt-0.5">Filter by generation parameters</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearAdvancedFilters}
                            className="h-8 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary-hover px-3 bg-primary/5 hover:bg-primary/10"
                        >
                            Clear Parameters
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Input
                            label="Specific Seed"
                            placeholder="e.g. 198234"
                            value={filterSeed}
                            onChange={(e) => onFilterSeedChange(e.target.value)}
                            className="h-10 text-sm bg-background/50"
                        />

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1 mb-1 block">Guidance Range</label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={filterGuidanceMin}
                                    onChange={(e) => onFilterGuidanceMinChange(e.target.value)}
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    className="h-10 text-xs bg-background/50"
                                />
                                <span className="text-foreground-muted/30 font-black">—</span>
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filterGuidanceMax}
                                    onChange={(e) => onFilterGuidanceMaxChange(e.target.value)}
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    className="h-10 text-xs bg-background/50"
                                />
                            </div>
                        </div>

                        <Select
                            label="Negative Prompt"
                            value={filterHasNegativePrompt}
                            onChange={(e) => onFilterHasNegativePromptChange(e.target.value as any)}
                            className="h-10 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white border-zinc-800"
                        >
                            <option value="all">Ignore Filter</option>
                            <option value="yes">Only with Negatives</option>
                            <option value="no">Only without Negatives</option>
                        </Select>

                        <div className="flex items-end">
                            <div className="p-4 rounded-xl bg-background/40 border border-border/50 w-full">
                                <p className="text-[9px] font-bold text-foreground-muted leading-tight">
                                    <Icons.info size={10} className="inline mr-1 opacity-50 mb-0.5" />
                                    Advanced filters help you find specific generations within large collections.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
