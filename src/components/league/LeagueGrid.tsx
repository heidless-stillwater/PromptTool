import { LeagueEntry } from '@/lib/types';
import LeagueEntryCard from './LeagueEntryCard';
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
    error
}: LeagueGridProps) {

    if (error) {
        return (
            <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                    <strong>Error loading league entries:</strong> {error}
                    {error.includes('index') && (
                        <span className="block mt-1 opacity-80">Firestore indexes may still be building or need manual deployment. Try switching to &apos;Newest&apos; sort.</span>
                    )}
                </p>
            </div>
        );
    }

    if (loadingEntries) {
        return (
            <div className="flex justify-center py-16">
                <div className="spinner" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-16 glass-card rounded-2xl">
                <div className="text-6xl mb-4 opacity-30">🏆</div>
                <h2 className="text-xl font-semibold mb-2">No league entries yet</h2>
                <p className="text-foreground-muted mb-6">
                    Be the first to publish an image to the Community League!
                </p>
                <Link href="/gallery" className="btn-primary px-6 py-3">
                    Go to Gallery to Publish
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {entries.map((entry) => (
                    <LeagueEntryCard
                        key={entry.id}
                        entry={entry}
                        userId={userId || ''}
                        onVote={onVote}
                        isVoting={votingEntryId === entry.id}
                        onSelect={onSelect}
                        onReact={onReact}
                    />
                ))}
            </div>

            {/* Load More */}
            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="btn-secondary px-8 py-3 w-full md:w-auto"
                    >
                        {loadingMore ? (
                            <div className="flex items-center gap-2 justify-center">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            'Load More'
                        )}
                    </button>
                </div>
            )}
        </>
    );
}
