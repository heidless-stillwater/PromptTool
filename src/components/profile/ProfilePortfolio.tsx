import { LeagueEntry, LeagueComment } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import LeagueEntryCard from '@/components/league/LeagueEntryCard';
import LeagueEntryModal from '@/components/league/LeagueEntryModal';

interface ProfilePortfolioProps {
    entries: LeagueEntry[];
    currentUser: any;
    selectedEntry: LeagueEntry | null;
    setSelectedEntry: (entry: LeagueEntry | null) => void;
    queryError: string | null;

    // Interaction Props
    comments: LeagueComment[];
    loadingComments: boolean;
    votingEntryId: string | null;
    isFollowingEntry: boolean;
    followLoadingEntry: boolean;
    onVote: (id: string) => void;
    onReact: (id: string, emoji: string, reacted: boolean) => void;
    onAddComment: (text: string) => Promise<void>;
    onDeleteComment: (id: string) => Promise<void>;
    onToggleFollowEntry: () => void;
    onReport: (id: string) => Promise<void>;
}

export default function ProfilePortfolio({
    entries,
    currentUser,
    selectedEntry,
    setSelectedEntry,
    queryError,

    comments,
    loadingComments,
    votingEntryId,
    isFollowingEntry,
    followLoadingEntry,
    onVote,
    onReact,
    onAddComment,
    onDeleteComment,
    onToggleFollowEntry,
    onReport
}: ProfilePortfolioProps) {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-background-secondary border border-border/50">
                        <Icons.image className="text-primary" size={20} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase">Creation Portfolio</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-60">Published Masterpieces</p>
                    </div>
                </div>
                <div className="px-4 py-2 rounded-full bg-background-secondary border border-border/50 text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                    {entries.length} items
                </div>
            </div>

            {queryError && (
                <Card variant="glass" className="p-6 border-error/20 bg-error/5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-error/20 text-error">
                            <Icons.error size={20} />
                        </div>
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

            {entries.length === 0 ? (
                <Card variant="glass" className="py-24 flex flex-col items-center justify-center text-center border-dashed border-2">
                    <div className="w-20 h-20 rounded-full bg-background-secondary flex items-center justify-center mb-6 opacity-50">
                        <Icons.image size={40} className="text-foreground-muted" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight mb-2">Portfolio is empty</h2>
                    <p className="text-foreground-muted max-w-sm text-sm">
                        This creator hasn&apos;t published any images to the league yet. Check back soon for new inspirations!
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {entries.map((entry) => (
                        <LeagueEntryCard
                            key={entry.id}
                            entry={entry}
                            userId={currentUser?.uid}
                            onVote={onVote}
                            isVoting={votingEntryId === entry.id}
                            onSelect={setSelectedEntry}
                            onReact={onReact}
                        />
                    ))}
                </div>
            )}

            {/* Entry Detail Modal */}
            {selectedEntry && (
                <LeagueEntryModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    user={currentUser}
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
                    onReport={onReport}
                />
            )}
        </div>
    );
}
