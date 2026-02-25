import { useState, useMemo } from 'react';
import { CommunityEntry, CommunityComment, GeneratedImage } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import CommunityEntryCard from '@/components/community/CommunityEntryCard';
import CommunityEntryModal from '@/components/community/CommunityEntryModal';

export type PortfolioViewMode = 'grid' | 'feed' | 'compact' | 'list';

interface ProfilePortfolioProps {
    images: GeneratedImage[];
    communityEntries: CommunityEntry[];
    communityEntryMap: Map<string, CommunityEntry>;
    currentUser: any;
    userRole?: string;
    selectedEntry: CommunityEntry | null;
    setSelectedEntry: (entryId: string | null) => void;
    queryError: string | null;
    viewMode: PortfolioViewMode;
    onViewModeChange: (mode: PortfolioViewMode) => void;
    isGrouped: boolean;
    onToggleGrouped: () => void;
    showOnlyCommunity: boolean;
    onToggleOnlyCommunity: () => void;

    // Interaction Props
    comments: CommunityComment[];
    loadingComments: boolean;
    votingEntryId: string | null;
    isFollowingEntry: boolean;
    followLoadingEntry: boolean;
    onVote: (id: string) => void;
    onReact: (id: string, emoji: string) => void;
    reactingEmoji: string | null;
    onAddComment: (text: string) => Promise<any>;
    onDeleteComment: (id: string) => Promise<any>;
    onToggleFollowEntry: () => void;
    onReport: (id: string) => Promise<any>;
    onUnpublishEntry?: () => Promise<any>;
    isUnpublishingEntry?: boolean;
    collections?: any[];
    viewerCollectionIds?: string[];
    loadingViewerCollections?: boolean;
    onToggleCollection?: (collectionId: string) => Promise<any>;
    onCreateCollection?: (name: string) => Promise<any>;
}

/** Group images by promptSetID; images without one each get their own bucket */
function groupByPromptSet(images: GeneratedImage[]): Record<string, GeneratedImage[]> {
    const groups: Record<string, GeneratedImage[]> = {};
    for (const img of images) {
        const key = img.promptSetID || `solo-${img.id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(img);
    }
    return groups;
}

// ─── Card variants ──────────────────────────────────────────────────────────

function MediaThumb({
    image,
    className,
    onError,
}: {
    image: GeneratedImage;
    className?: string;
    onError: () => void;
}) {
    const isVideo = !!(image.videoUrl || image.settings?.modality === 'video');
    return isVideo ? (
        <video
            src={image.videoUrl || image.imageUrl}
            className={cn('object-cover', className)}
            muted loop playsInline preload="metadata"
            onError={onError}
        />
    ) : (
        <img
            src={image.imageUrl}
            alt={image.prompt}
            className={cn('object-cover', className)}
            loading="lazy"
            onError={onError}
        />
    );
}

/** Grid / feed / compact card */
function TileCard({
    image,
    viewMode,
    count = 1,
    isGrouped,
}: {
    image: GeneratedImage;
    viewMode: PortfolioViewMode;
    count?: number;
    isGrouped?: boolean;
}) {
    const [error, setError] = useState(false);
    const isVideo = !!(image.videoUrl || image.settings?.modality === 'video');
    const showStack = isGrouped && count > 1;

    return (
        <Card
            className={cn(
                'overflow-visible group cursor-pointer hover:ring-2 hover:ring-border/80 transition-all hover:shadow-xl hover:shadow-black/10',
                viewMode === 'feed' ? 'rounded-3xl border-border/60' : 'rounded-2xl'
            )}
            variant="glass"
        >
            <div className="relative">
                {/* Stack shadow layers */}
                {showStack && (
                    <>
                        <div className="absolute inset-x-3 -bottom-1.5 h-full bg-background-secondary border border-border/40 rounded-2xl z-0 pointer-events-none" />
                        {count > 2 && (
                            <div className="absolute inset-x-5 -bottom-3 h-full bg-background-secondary/60 border border-border/30 rounded-2xl z-[-1] pointer-events-none" />
                        )}
                    </>
                )}

                <div
                    className={cn(
                        'relative overflow-hidden rounded-t-2xl z-10',
                        viewMode === 'feed' ? 'aspect-video' : 'aspect-square'
                    )}
                    onMouseEnter={e => {
                        const v = e.currentTarget.querySelector('video');
                        if (v && v.paused) v.play().catch(() => { });
                    }}
                    onMouseLeave={e => {
                        const v = e.currentTarget.querySelector('video');
                        if (v) { v.pause(); v.currentTime = 0; }
                    }}
                >
                    {error ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-background-secondary text-foreground-muted">
                            <Icons.error className="w-10 h-10 opacity-20 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Unavailable</span>
                        </div>
                    ) : (
                        <MediaThumb
                            image={image}
                            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                            onError={() => setError(true)}
                        />
                    )}

                    {/* Group count badge */}
                    {showStack && (
                        <div className="absolute top-2 right-2 z-10 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10 pointer-events-none">
                            <Icons.stack className="w-3 h-3" />
                            <span className="text-[10px] font-black">{count}</span>
                        </div>
                    )}

                    {/* Video badge */}
                    {isVideo && (
                        <div className="absolute bottom-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 pointer-events-none">
                            {image.duration ? (
                                <span className="text-[11px] font-bold font-mono">
                                    0:{Math.round(image.duration).toString().padStart(2, '0')}
                                </span>
                            ) : (
                                <Icons.sparkles className="w-3.5 h-3.5" />
                            )}
                        </div>
                    )}

                    {/* Prompt overlay */}
                    <div className={cn(
                        'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity',
                        viewMode === 'compact'
                            ? 'opacity-0 group-hover:opacity-100'
                            : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                    )}>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className={cn(
                                'text-white leading-snug',
                                viewMode === 'compact' ? 'text-[10px] line-clamp-1' : 'text-sm line-clamp-2'
                            )}>{image.prompt}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            {viewMode !== 'compact' && (
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                            {image.settings?.quality || 'standard'} · {image.settings?.aspectRatio || '1:1'}
                        </span>
                        {showStack && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80">
                                {count} variations
                            </span>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

/** List-mode row: fixed thumbnail left, metadata right */
function ListCard({
    image,
    count = 1,
    isGrouped,
}: {
    image: GeneratedImage;
    count?: number;
    isGrouped?: boolean;
}) {
    const [error, setError] = useState(false);
    const isVideo = !!(image.videoUrl || image.settings?.modality === 'video');
    const showStack = isGrouped && count > 1;

    return (
        <Card
            variant="glass"
            className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-border/80 transition-all hover:shadow-lg hover:shadow-black/10 rounded-2xl"
        >
            <div className="flex items-stretch gap-0">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 overflow-hidden rounded-l-2xl"
                    onMouseEnter={e => {
                        const v = e.currentTarget.querySelector('video');
                        if (v && v.paused) v.play().catch(() => { });
                    }}
                    onMouseLeave={e => {
                        const v = e.currentTarget.querySelector('video');
                        if (v) { v.pause(); v.currentTime = 0; }
                    }}
                >
                    {error ? (
                        <div className="w-full h-full flex items-center justify-center bg-background-secondary text-foreground-muted">
                            <Icons.error className="w-6 h-6 opacity-20" />
                        </div>
                    ) : (
                        <MediaThumb
                            image={image}
                            className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                            onError={() => setError(true)}
                        />
                    )}

                    {/* Stack badge overlay */}
                    {showStack && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                                <Icons.stack className="w-3 h-3" />
                                <span className="text-[10px] font-black">{count}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-1.5 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground">
                        {image.prompt}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                            {image.settings?.quality || 'standard'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                            {image.settings?.aspectRatio || '1:1'}
                        </span>
                        {isVideo && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80 flex items-center gap-1">
                                <Icons.sparkles className="w-3 h-3" />
                                {image.duration ? `0:${Math.round(image.duration).toString().padStart(2, '0')}` : 'Video'}
                            </span>
                        )}
                        {showStack && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80">
                                {count} variations
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ─── View config ─────────────────────────────────────────────────────────────

const VIEW_OPTIONS: { key: PortfolioViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'grid', label: 'Grid', icon: <Icons.grid size={14} /> },
    { key: 'feed', label: 'Feed', icon: <Icons.feed size={14} /> },
    { key: 'compact', label: 'Compact', icon: <Icons.list size={14} /> },
    { key: 'list', label: 'List', icon: <Icons.rows size={14} /> },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePortfolio({
    images,
    communityEntries,
    communityEntryMap,
    currentUser,
    userRole,
    selectedEntry,
    setSelectedEntry,
    queryError,
    viewMode,
    onViewModeChange,
    isGrouped,
    onToggleGrouped,
    showOnlyCommunity,
    onToggleOnlyCommunity,

    // Interaction Props
    comments,
    loadingComments,
    votingEntryId,
    isFollowingEntry,
    followLoadingEntry,
    onVote,
    onReact,
    reactingEmoji,
    onAddComment,
    onDeleteComment,
    onToggleFollowEntry,
    onReport,
    onUnpublishEntry,
    isUnpublishingEntry,
    collections = [],
    viewerCollectionIds = [],
    loadingViewerCollections = false,
    onToggleCollection,
    onCreateCollection,
}: ProfilePortfolioProps) {


    // The items to render
    type RenderItem =
        | { kind: 'image'; image: GeneratedImage; count: number }
        | { kind: 'community'; entry: CommunityEntry; image: GeneratedImage };

    const renderItems = useMemo<RenderItem[]>(() => {
        let filteredImages = images;
        if (showOnlyCommunity) {
            filteredImages = images.filter(img => img.publishedToCommunity && img.communityEntryId);
        }

        if (isGrouped) {
            const groups = groupByPromptSet(filteredImages);
            return Object.values(groups).map(group => {
                const first = group[0];
                const entry = first.publishedToCommunity && first.communityEntryId
                    ? communityEntryMap.get(first.communityEntryId)
                    : undefined;
                if (entry) return { kind: 'community', entry, image: first };
                return { kind: 'image', image: first, count: group.length };
            });
        }
        return filteredImages.map(img => {
            const entry = img.publishedToCommunity && img.communityEntryId
                ? communityEntryMap.get(img.communityEntryId)
                : undefined;
            if (entry) return { kind: 'community', entry, image: img };
            return { kind: 'image', image: img, count: 1 };
        });
    }, [images, isGrouped, communityEntryMap, showOnlyCommunity]);

    const displayCount = renderItems.length;

    const gridClass = cn(
        'transition-all duration-300',
        viewMode === 'list'
            ? 'flex flex-col gap-3'
            : cn(
                'grid',
                viewMode === 'grid' && 'gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                viewMode === 'feed' && 'gap-12 grid-cols-1 max-w-2xl mx-auto',
                viewMode === 'compact' && 'gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
            )
    );

    /** Renders one item in the current layout */
    function renderItem(item: RenderItem, key: string) {
        if (item.kind === 'community') {
            if (viewMode === 'list') {
                // List mode: render community entry as a list card (show pill via overlay)
                return (
                    <div key={key} className="relative" onClick={() => setSelectedEntry(item.entry.id)}>
                        <ListCard image={item.image} count={1} isGrouped={false} />
                        <div className="absolute top-2 left-28 sm:left-36 z-10 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm text-white rounded-full px-2.5 py-1 border border-primary/40 shadow-lg shadow-primary/20 pointer-events-none">
                            <Icons.trophy className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Community Hub</span>
                        </div>
                    </div>
                );
            }
            return (
                <CommunityEntryCard
                    key={key}
                    entry={item.entry}
                    userId={currentUser?.uid}
                    onVote={onVote}
                    isVoting={votingEntryId === item.entry.id}
                    onSelect={setSelectedEntry}
                    onReact={onReact}
                    reactingEmoji={reactingEmoji}
                    viewMode={viewMode === 'compact' ? 'compact' : viewMode === 'feed' ? 'feed' : 'grid'}
                    showCommunityPill={true}
                />
            );
        }

        // Plain image
        if (viewMode === 'list') {
            return (
                <ListCard
                    key={key}
                    image={item.image}
                    count={item.count}
                    isGrouped={isGrouped}
                />
            );
        }

        return (
            <TileCard
                key={key}
                image={item.image}
                viewMode={viewMode}
                count={item.count}
                isGrouped={isGrouped}
            />
        );
    }

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-background-secondary border border-border/50">
                        <Icons.image className="text-primary" size={20} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">Creation Portfolio</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">
                            {isGrouped ? 'Grouped by Prompt Set' : 'All Creations'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* View mode buttons */}
                    <div className="flex bg-background-secondary rounded-xl p-1 border border-border/50 shadow-inner">
                        {VIEW_OPTIONS.map(view => (
                            <Button
                                key={view.key}
                                variant={viewMode === view.key ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange(view.key)}
                                className={cn(
                                    'rounded-lg px-2.5 h-8 gap-1.5 font-black uppercase tracking-widest text-[9px]',
                                    viewMode !== view.key
                                        ? 'text-foreground-muted hover:text-foreground'
                                        : 'bg-background shadow-sm text-foreground'
                                )}
                                title={view.label}
                            >
                                {view.icon}
                                <span className="hidden lg:inline">{view.label}</span>
                            </Button>
                        ))}
                    </div>

                    <Button
                        variant={isGrouped ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={onToggleGrouped}
                        className={cn(
                            'h-8 px-3 gap-1.5 font-black uppercase tracking-widest text-[9px] rounded-xl border border-border/50',
                            isGrouped
                                ? 'shadow-lg shadow-primary/20'
                                : 'text-foreground-muted hover:text-foreground bg-background-secondary'
                        )}
                        title="Group by Prompt Set"
                    >
                        <Icons.stack size={13} />
                        <span className="hidden sm:inline">Grouped</span>
                    </Button>

                    <Button
                        variant={showOnlyCommunity ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={onToggleOnlyCommunity}
                        className={cn(
                            'h-8 px-3 gap-1.5 font-black uppercase tracking-widest text-[9px] rounded-xl border border-border/50',
                            showOnlyCommunity
                                ? 'shadow-lg shadow-primary/20 border-primary/50'
                                : 'text-foreground-muted hover:text-foreground bg-background-secondary'
                        )}
                        title="Show only Community Hub entries"
                    >
                        <Icons.globe size={13} className={showOnlyCommunity ? 'text-white' : 'text-primary'} />
                        <span className="hidden sm:inline">Community Only</span>
                    </Button>

                    {/* Count chip */}
                    <div className="px-3 py-2 rounded-full bg-background-secondary border border-border/50 text-[10px] font-black uppercase tracking-widest text-foreground-muted whitespace-nowrap">
                        {displayCount} {isGrouped ? 'sets' : 'items'}
                    </div>
                </div>
            </div>

            {/* ── Error ── */}
            {queryError && (
                <Card variant="glass" className="p-6 border-error/20 bg-error/5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-error/20 text-error"><Icons.error size={20} /></div>
                        <div className="space-y-1">
                            <p className="font-bold text-error">Error loading portfolio</p>
                            <p className="text-sm text-error/80 leading-relaxed">{queryError}</p>
                            {queryError.includes('index') && (
                                <p className="text-xs text-error/60 mt-2">Firestore indexes may still be building or need manual deployment.</p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* ── Empty state ── */}
            {images.length === 0 ? (
                <Card variant="glass" className="py-24 flex flex-col items-center justify-center text-center border-dashed border-2">
                    <div className="w-20 h-20 rounded-full bg-background-secondary flex items-center justify-center mb-6 opacity-50">
                        <Icons.image size={40} className="text-foreground-muted" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight mb-2">Portfolio is empty</h2>
                    <p className="text-foreground-muted max-w-sm text-sm">
                        This creator hasn&apos;t generated any images yet. Check back soon!
                    </p>
                </Card>
            ) : (
                <div className={gridClass}>
                    {renderItems.map((item, i) =>
                        renderItem(item, item.kind === 'community' ? item.entry.id : item.image.id)
                    )}
                </div>
            )}

            {/* ── Detail modal (community items) ── */}
            {selectedEntry && (
                <CommunityEntryModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    user={currentUser}
                    userRole={userRole}
                    onVote={onVote}
                    isVoting={votingEntryId === selectedEntry.id}
                    isFollowing={isFollowingEntry}
                    onToggleFollow={onToggleFollowEntry}
                    followLoading={followLoadingEntry}
                    comments={comments}
                    loadingComments={loadingComments}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onReact={onReact}
                    reactingEmoji={reactingEmoji}
                    onReport={onReport}
                    onUnpublish={onUnpublishEntry}
                    isUnpublishing={isUnpublishingEntry}
                    collections={collections}
                    viewerCollectionIds={viewerCollectionIds}
                    loadingViewerCollections={loadingViewerCollections}
                    onToggleCollection={onToggleCollection}
                    onCreateCollection={onCreateCollection}
                />
            )}
        </div>
    );
}
