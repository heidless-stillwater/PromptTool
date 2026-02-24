import { useMemo } from 'react';
import { LeagueEntry } from '@/lib/types';
import LeagueEntryCard from './LeagueEntryCard';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LeagueGridProps {
    entries: LeagueEntry[];
    loadingEntries: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    userId: string | undefined;
    onVote: (entryId: string) => void;
    votingEntryId: string | null;
    onSelect: (entry: LeagueEntry) => void;
    onReact: (entryId: string, emoji: string, reacted: boolean) => void;
    viewMode: 'grid' | 'feed' | 'compact' | 'creators';
    isGrouped: boolean;
    isGroupedByUser: boolean;
    onFilterUser: (userId: string, userName: string) => void;
    onShare: (entryId: string) => void;
    error: string | null;
}

export default function LeagueGrid({
    entries,
    loadingEntries,
    loadingMore,
    hasMore,
    onLoadMore,
    userId,
    onVote,
    votingEntryId,
    onSelect,
    onReact,
    viewMode,
    isGrouped,
    isGroupedByUser,
    onFilterUser,
    onShare,
    error
}: LeagueGridProps) {
    const router = useRouter();

    /** Grouping by Author (Internal "Creators" view mode) */
    const entriesByAuthor = useMemo(() => {
        if (viewMode !== 'creators') return [];
        const groups: Record<string, { authorName: string; authorPhotoURL: string | null; entries: LeagueEntry[]; userId: string }> = {};
        entries.forEach(entry => {
            const uid = entry.originalUserId;
            if (!groups[uid]) {
                groups[uid] = {
                    authorName: entry.authorName || 'Anonymous',
                    authorPhotoURL: entry.authorPhotoURL,
                    userId: uid,
                    entries: []
                };
            }
            groups[uid].entries.push(entry);
        });
        return Object.values(groups).sort((a, b) => b.entries.length - a.entries.length);
    }, [entries, viewMode]);

    const processedEntries = useMemo(() => {
        if (viewMode === 'creators') return entries;
        if (!isGrouped && !isGroupedByUser) return entries;

        const groups: Record<string, LeagueEntry[]> = {};
        const standalone: LeagueEntry[] = [];

        entries.forEach(entry => {
            // Grouping priority: User ID > Prompt Set ID
            const groupKey = isGroupedByUser
                ? entry.originalUserId
                : (isGrouped ? entry.promptSetID : null);

            if (groupKey) {
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push(entry);
            } else {
                standalone.push(entry);
            }
        });

        const stacked: LeagueEntry[] = [];
        Object.values(groups).forEach(group => {
            if (group.length > 1) {
                const first = group[0];
                stacked.push({
                    ...first,
                    isStack: true,
                    stackSize: group.length,
                });
            } else {
                standalone.push(group[0]);
            }
        });

        return [...stacked, standalone].flat().sort((a, b) => {
            const indexA = entries.findIndex(e => e.id === a.id);
            const indexB = entries.findIndex(e => e.id === b.id);
            return indexA - indexB;
        });
    }, [entries, isGrouped, isGroupedByUser, viewMode]);

    if (error) {
        return (
            <div className="mb-8 p-6 bg-error/10 border-2 border-error/20 rounded-2xl text-error flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3">
                    <Icons.error className="w-6 h-6 flex-shrink-0" />
                    <h3 className="font-bold text-lg">Query Failed</h3>
                </div>
                <div className="space-y-3">
                    <p className="text-sm opacity-90">{error}</p>
                    {error.toLowerCase().includes('index') && (
                        <div className="p-4 bg-background/50 rounded-xl border border-error/20 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60">System Instruction</p>
                            <p className="text-sm">
                                This filter requires a <strong>Firestore Composite Index</strong>.
                                Please check your browser&apos;s <strong>Developer Console (F12)</strong> for a direct link to create this index in the Firebase Console.
                            </p>
                        </div>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-fit border-error/30 text-error hover:bg-error/10"
                    onClick={() => window.location.reload()}
                >
                    Retry Connection
                </Button>
            </div>
        );
    }

    if (loadingEntries) {
        return (
            <div className="flex justify-center py-16">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <Card variant="glass" className="text-center py-16 rounded-2xl">
                <div className="text-6xl mb-4 opacity-30">🏆</div>
                <h2 className="text-xl font-semibold mb-2">No league entries yet</h2>
                <p className="text-foreground-muted mb-6">
                    Be the first to publish an image to the Community League!
                </p>
                <div className="flex justify-center">
                    <Button onClick={() => router.push('/gallery')} className="px-6 py-3">
                        Go to Gallery to Publish
                    </Button>
                </div>
            </Card>
        );
    }

    if (viewMode === 'creators') {
        return (
            <div className="space-y-12">
                {entriesByAuthor.map((group) => (
                    <div key={group.userId} className="space-y-6">
                        <Link
                            href={`/profile/${group.userId}`}
                            className="flex items-center gap-3 group/author w-fit"
                        >
                            {group.authorPhotoURL && group.authorPhotoURL !== 'null' ? (
                                <img src={group.authorPhotoURL} alt={group.authorName} className="w-10 h-10 rounded-full border-2 border-primary/20 group-hover/author:border-primary transition-colors" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center font-bold text-foreground-muted group-hover/author:text-primary transition-colors">
                                    {group.authorName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-lg group-hover/author:text-primary transition-colors">{group.authorName}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-foreground-muted">{group.entries.length} contributions</p>
                                    <span className="text-muted opacity-20 text-[10px]">|</span>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onFilterUser(group.userId, group.authorName);
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
                                    >
                                        Filter Feed
                                    </button>
                                </div>
                            </div>
                        </Link>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {group.entries.map((entry) => (
                                <LeagueEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    userId={userId || ''}
                                    onVote={onVote}
                                    isVoting={votingEntryId === entry.id}
                                    onSelect={onSelect}
                                    onReact={onReact}
                                    viewMode="compact"
                                    onFilterUser={onFilterUser}
                                    onShare={onShare}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <div className="mt-8 flex justify-center">
                        <Button
                            variant="secondary"
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            isLoading={loadingMore}
                            className="px-8 py-3 w-full md:w-auto"
                        >
                            Load More
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className={cn(
                "grid gap-6 transition-all duration-300",
                viewMode === 'grid' && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                viewMode === 'feed' && "grid-cols-1 max-w-2xl mx-auto gap-12",
                viewMode === 'compact' && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            )}>
                {processedEntries.map((entry) => (
                    <LeagueEntryCard
                        key={entry.id}
                        entry={entry}
                        userId={userId || ''}
                        onVote={onVote}
                        isVoting={votingEntryId === entry.id}
                        onSelect={onSelect}
                        onReact={onReact}
                        viewMode={viewMode}
                        onFilterUser={onFilterUser}
                        onShare={onShare}
                    />
                ))}
            </div>

            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <Button
                        variant="secondary"
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        isLoading={loadingMore}
                        className="px-8 py-3 w-full md:w-auto"
                    >
                        Load More
                    </Button>
                </div>
            )}
        </>
    );
}
