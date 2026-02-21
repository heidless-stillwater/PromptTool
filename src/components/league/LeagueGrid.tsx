import { LeagueEntry } from '@/lib/types';
import LeagueEntryCard from './LeagueEntryCard';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

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
    const router = useRouter();

    if (error) {
        return (
            <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-center gap-3">
                <Icons.error className="w-5 h-5 flex-shrink-0" />
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
