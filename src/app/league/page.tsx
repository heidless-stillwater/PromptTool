'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import ShareButtons from '@/components/ShareButtons';
import NotificationBell from '@/components/NotificationBell';
import ConfirmationModal from '@/components/ConfirmationModal';

type SortMode = 'trending' | 'newest' | 'alltime';

export default function LeaguePage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [entries, setEntries] = useState<LeagueEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [sortMode, setSortMode] = useState<SortMode>('trending');
    const [queryError, setQueryError] = useState<string | null>(null);

    // Detail modal state
    const [selectedEntry, setSelectedEntry] = useState<LeagueEntry | null>(null);
    const [comments, setComments] = useState<LeagueComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [votingEntryId, setVotingEntryId] = useState<string | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Get auth token helper
    const getAuthToken = useCallback(async () => {
        if (!user) return null;
        return await user.getIdToken();
    }, [user]);

    // Fetch league entries
    const fetchEntries = useCallback(async (isLoadMore = false, startAfterDoc: QueryDocumentSnapshot | null = null) => {
        if (!user) return;

        try {
            setQueryError(null);
            if (isLoadMore) {
                setLoadingMore(true);
            } else {
                setLoadingEntries(true);
            }

            const entriesRef = collection(db, 'leagueEntries');
            const orderField = sortMode === 'newest' ? 'publishedAt' : 'voteCount';

            // Re-enabling proper sorting without duplicates
            let q;
            if (sortMode === 'newest') {
                q = query(
                    entriesRef,
                    orderBy('publishedAt', 'desc'),
                    limit(20)
                );
            } else {
                q = query(
                    entriesRef,
                    orderBy(orderField, 'desc'),
                    orderBy('publishedAt', 'desc'),
                    limit(20)
                );
            }

            if (isLoadMore && startAfterDoc) {
                if (sortMode === 'newest') {
                    q = query(
                        entriesRef,
                        orderBy('publishedAt', 'desc'),
                        startAfter(startAfterDoc),
                        limit(20)
                    );
                } else {
                    q = query(
                        entriesRef,
                        orderBy(orderField, 'desc'),
                        orderBy('publishedAt', 'desc'),
                        startAfter(startAfterDoc),
                        limit(20)
                    );
                }
            }

            console.log(`[League] Fetching entries with sortMode: ${sortMode}, isLoadMore: ${isLoadMore}`);
            const snapshot = await getDocs(q);
            console.log(`[League] Fetched ${snapshot.docs.length} entries`);

            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            setLastVisible(lastDoc || null);
            setHasMore(snapshot.docs.length === 20);

            const fetchedEntries: LeagueEntry[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as LeagueEntry));

            if (isLoadMore) {
                setEntries(prev => [...prev, ...fetchedEntries]);
            } else {
                setEntries(fetchedEntries);
            }
        } catch (error: any) {
            console.error('[League] Error fetching entries:', error);
            setQueryError(error.message || 'Failed to fetch league entries');
        } finally {
            setLoadingEntries(false);
            setLoadingMore(false);
        }
    }, [user, sortMode]);

    // Initial load & sort change
    useEffect(() => {
        if (user) {
            setEntries([]);
            setLastVisible(null);
            setHasMore(true);
            fetchEntries(false, null);
        }
    }, [user, sortMode]);

    // Fetch comments when entry is selected
    useEffect(() => {
        if (!selectedEntry) {
            setComments([]);
            return;
        }

        setLoadingComments(true);
        const commentsRef = collection(db, 'leagueEntries', selectedEntry.id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched: LeagueComment[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as LeagueComment));
            setComments(fetched);
            setLoadingComments(false);
        });

        return () => unsubscribe();
    }, [selectedEntry]);

    // Vote handler
    const handleVote = async (entryId: string) => {
        if (!user) return;
        setVotingEntryId(entryId);

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/league/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Optimistic update
            setEntries(prev => prev.map(e => {
                if (e.id !== entryId) return e;
                const newVotes = { ...e.votes };
                if (data.voted) {
                    newVotes[user.uid] = true;
                } else {
                    delete newVotes[user.uid];
                }
                return {
                    ...e,
                    votes: newVotes,
                    voteCount: e.voteCount + (data.voted ? 1 : -1),
                };
            }));

            // Update selected entry too
            if (selectedEntry?.id === entryId) {
                setSelectedEntry(prev => {
                    if (!prev) return null;
                    const newVotes = { ...prev.votes };
                    if (data.voted) {
                        newVotes[user.uid] = true;
                    } else {
                        delete newVotes[user.uid];
                    }
                    return {
                        ...prev,
                        votes: newVotes,
                        voteCount: prev.voteCount + (data.voted ? 1 : -1),
                    };
                });
            }

        } catch (error: any) {
            console.error('[League] Vote error:', error);
            showToast(error.message || 'Failed to vote', 'error');
        } finally {
            setVotingEntryId(null);
        }
    };

    // Comment handler
    const handleAddComment = async () => {
        if (!user || !selectedEntry || !newComment.trim()) return;
        setSubmittingComment(true);

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/league/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId: selectedEntry.id, text: newComment.trim() }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setNewComment('');

            // Update comment count in entries list
            setEntries(prev => prev.map(e =>
                e.id === selectedEntry.id ? { ...e, commentCount: e.commentCount + 1 } : e
            ));
            setSelectedEntry(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);

            showToast('Comment added!', 'success');
        } catch (error: any) {
            console.error('[League] Comment error:', error);
            showToast(error.message || 'Failed to add comment', 'error');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleConfirmReport = async () => {
        if (!user || !selectedEntry) return;
        setIsReporting(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entryId: selectedEntry.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message, 'success');
            setShowReportModal(false);
        } catch (err: any) {
            showToast(err.message || 'Failed to report content', 'error');
        } finally {
            setIsReporting(false);
        }
    };

    // Delete comment handler
    const handleDeleteComment = async (commentId: string) => {
        if (!user || !selectedEntry) return;
        if (!confirm('Delete this comment?')) return;

        try {
            const token = await getAuthToken();
            const res = await fetch(`/api/league/comment?entryId=${selectedEntry.id}&commentId=${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Update comment count
            setEntries(prev => prev.map(e =>
                e.id === selectedEntry.id ? { ...e, commentCount: Math.max(0, e.commentCount - 1) } : e
            ));
            setSelectedEntry(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null);

            showToast('Comment deleted', 'success');
        } catch (error: any) {
            console.error('[League] Delete comment error:', error);
            showToast(error.message || 'Failed to delete comment', 'error');
        }
    };

    // Format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    };

    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return formatDate(timestamp);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Link href="/league/leaderboard" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-yellow-400/30 hover:border-yellow-400 transition-colors">
                            <span>🏆</span> Hall of Fame
                        </Link>
                        <Link href="/generate" className="btn-primary text-sm px-4 py-2">
                            + Generate New
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Page Title & Sorting */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                <span className="text-4xl">🏆</span>
                                Community League
                            </h1>
                            <p className="text-foreground-muted mt-1">
                                Vote for your favorite AI-generated images from the community
                            </p>
                        </div>

                        {/* Sort Tabs */}
                        <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50 self-start">
                            {([
                                { key: 'trending', label: '🔥 Trending', },
                                { key: 'newest', label: '✨ Newest', },
                                { key: 'alltime', label: '👑 All Time', },
                            ] as { key: SortMode; label: string }[]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setSortMode(tab.key)}
                                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${sortMode === tab.key
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Queries Error Alert */}
                {queryError && (
                    <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                            <strong>Error loading league entries:</strong> {queryError}
                            {queryError.includes('index') && (
                                <span className="block mt-1 opacity-80">Firestore indexes may still be building or need manual deployment. Try switching to &apos;Newest&apos; sort.</span>
                            )}
                        </p>
                    </div>
                )}

                {/* Entries Grid */}
                {loadingEntries ? (
                    <div className="flex justify-center py-16">
                        <div className="spinner" />
                    </div>
                ) : entries.length === 0 ? (
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
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {entries.map((entry) => {
                                const hasVoted = user ? entry.votes?.[user.uid] === true : false;

                                return (
                                    <div
                                        key={entry.id}
                                        className="glass-card rounded-2xl overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5"
                                    >
                                        {/* Image */}
                                        <div
                                            className="aspect-square relative cursor-pointer overflow-hidden"
                                            onClick={() => setSelectedEntry(entry)}
                                        >
                                            <img
                                                src={entry.imageUrl}
                                                alt={entry.prompt}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                                    <p className="text-white text-sm line-clamp-2">{entry.prompt}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer */}
                                        <div className="p-4 space-y-3">
                                            {/* Author Row */}
                                            <Link
                                                href={`/profile/${entry.originalUserId}`}
                                                className="flex items-center gap-2 hover:opacity-80 transition-opacity group/author"
                                            >
                                                {entry.authorPhotoURL ? (
                                                    <img
                                                        src={entry.authorPhotoURL}
                                                        alt={entry.authorName}
                                                        className="w-7 h-7 rounded-full border border-border group-hover/author:border-primary/50 transition-colors"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-transparent group-hover/author:border-primary/50 transition-colors">
                                                        {entry.authorName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium truncate flex-1 group-hover/author:text-primary transition-colors">{entry.authorName}</span>
                                                <span className="text-xs text-foreground-muted">{formatTimeAgo(entry.publishedAt)}</span>
                                            </Link>

                                            {/* Actions Row */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {/* Vote Button */}
                                                    <button
                                                        onClick={() => handleVote(entry.id)}
                                                        disabled={votingEntryId === entry.id}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${hasVoted
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover'
                                                            : 'bg-background-secondary hover:bg-primary/10 text-foreground-muted hover:text-primary border border-border hover:border-primary/50'
                                                            }`}
                                                    >
                                                        {votingEntryId === entry.id ? (
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-4 h-4" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                            </svg>
                                                        )}
                                                        <span>{entry.voteCount}</span>
                                                    </button>

                                                    {/* Comment Count */}
                                                    <button
                                                        onClick={() => setSelectedEntry(entry)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-background-secondary hover:bg-background-secondary/80 text-foreground-muted hover:text-foreground border border-border transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                        <span>{entry.commentCount}</span>
                                                    </button>
                                                </div>

                                                {/* Share */}
                                                <ShareButtons imageUrl={entry.imageUrl} prompt={entry.prompt} className="scale-75 origin-right" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => fetchEntries(true, lastVisible)}
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
                )}
            </main>

            {/* Entry Detail Modal */}
            {selectedEntry && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedEntry(null)}
                >
                    <div
                        className="bg-background rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                            {/* Image */}
                            <div className="flex-1 bg-background-secondary flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
                                <img
                                    src={selectedEntry.imageUrl}
                                    alt={selectedEntry.prompt}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                                />
                            </div>

                            {/* Right Panel */}
                            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border flex flex-col min-h-0">
                                {/* Header */}
                                <div className="p-4 border-b border-border flex justify-between items-start">
                                    <Link
                                        href={`/profile/${selectedEntry.originalUserId}`}
                                        className="flex items-center gap-3 hover:opacity-80 transition-opacity group/modal-author"
                                    >
                                        {selectedEntry.authorPhotoURL ? (
                                            <img
                                                src={selectedEntry.authorPhotoURL}
                                                alt={selectedEntry.authorName}
                                                className="w-10 h-10 rounded-full border-2 border-primary"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20 group-hover/modal-author:border-primary transition-colors">
                                                {selectedEntry.authorName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold group-hover/modal-author:text-primary transition-colors">{selectedEntry.authorName}</p>
                                            <p className="text-xs text-foreground-muted">{formatDate(selectedEntry.publishedAt)}</p>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => setSelectedEntry(null)}
                                        className="p-1 hover:bg-background-secondary rounded-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Scrollable content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                    {/* Prompt */}
                                    <div>
                                        <label className="text-xs text-foreground-muted uppercase tracking-wide">Prompt</label>
                                        <p className="text-sm mt-1">{selectedEntry.prompt}</p>
                                    </div>

                                    {/* Settings */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-foreground-muted uppercase tracking-wide">Quality</label>
                                            <p className="text-sm mt-1 capitalize">{selectedEntry.settings.quality}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-foreground-muted uppercase tracking-wide">Aspect</label>
                                            <p className="text-sm mt-1">{selectedEntry.settings.aspectRatio}</p>
                                        </div>
                                    </div>

                                    {/* Vote + Share Actions */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                                        <button
                                            onClick={() => handleVote(selectedEntry.id)}
                                            disabled={votingEntryId === selectedEntry.id}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 justify-center ${user && selectedEntry.votes?.[user.uid]
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover'
                                                : 'bg-background-secondary hover:bg-primary/10 text-foreground-muted hover:text-primary border border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {votingEntryId === selectedEntry.id ? (
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-5 h-5" fill={user && selectedEntry.votes?.[user.uid] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            )}
                                            <span>{selectedEntry.voteCount} {selectedEntry.voteCount === 1 ? 'vote' : 'votes'}</span>
                                        </button>
                                        <ShareButtons imageUrl={selectedEntry.imageUrl} prompt={selectedEntry.prompt} />

                                        {/* Report Button */}
                                        {user && user.uid !== selectedEntry.originalUserId && (
                                            <button
                                                onClick={() => setShowReportModal(true)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-foreground-muted hover:text-error hover:bg-error/10 border border-border hover:border-error/30 transition-all group/report"
                                                title="Report content"
                                            >
                                                <svg className="w-5 h-5 group-hover/report:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9" />
                                                </svg>
                                                <span className="text-xs font-bold">Report</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Comments Section */}
                                    <div className="pt-2 border-t border-border">
                                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            Comments ({selectedEntry.commentCount})
                                        </h4>

                                        {/* Add Comment */}
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Add a comment..."
                                                maxLength={500}
                                                className="flex-1 bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-foreground-muted"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAddComment();
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={handleAddComment}
                                                disabled={submittingComment || !newComment.trim()}
                                                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                                            >
                                                {submittingComment ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>

                                        {/* Comments List */}
                                        {loadingComments ? (
                                            <div className="flex justify-center py-4">
                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <p className="text-sm text-foreground-muted italic text-center py-4">
                                                No comments yet. Be the first!
                                            </p>
                                        ) : (
                                            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                {comments.map(comment => (
                                                    <div key={comment.id} className="flex gap-2 group">
                                                        <Link
                                                            href={`/profile/${comment.userId}`}
                                                            className="flex-shrink-0 hover:opacity-80 transition-opacity"
                                                        >
                                                            {comment.userPhotoURL ? (
                                                                <img
                                                                    src={comment.userPhotoURL}
                                                                    alt={comment.userName}
                                                                    className="w-7 h-7 rounded-full border border-border"
                                                                />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                                    {comment.userName.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </Link>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline gap-2">
                                                                <Link
                                                                    href={`/profile/${comment.userId}`}
                                                                    className="text-sm font-bold hover:text-primary transition-colors"
                                                                >
                                                                    {comment.userName}
                                                                </Link>
                                                                <span className="text-[10px] text-foreground-muted">{formatTimeAgo(comment.createdAt)}</span>
                                                            </div>
                                                            <p className="text-sm text-foreground-muted mt-0.5 break-words">{comment.text}</p>
                                                        </div>
                                                        {/* Delete button for own comments or admin */}
                                                        {(comment.userId === user?.uid || profile?.role === 'admin' || profile?.role === 'su') && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                className="p-1 text-foreground-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                                title="Delete comment"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showReportModal}
                title="Report Content"
                message="Are you sure you want to report this content for moderation? This action will notify our staff to review the entry."
                confirmLabel="Report"
                onConfirm={handleConfirmReport}
                onCancel={() => setShowReportModal(false)}
                isLoading={isReporting}
                type="warning"
            />
        </div>
    );
}
