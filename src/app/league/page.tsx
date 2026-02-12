
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, getDoc, startAfter, QueryDocumentSnapshot, onSnapshot, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import NotificationBell from '@/components/NotificationBell';

import LeagueHeader, { SortMode } from '@/components/league/LeagueHeader';
import LeagueEntryCard from '@/components/league/LeagueEntryCard';
import LeagueEntryModal from '@/components/league/LeagueEntryModal';

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
    const [votingEntryId, setVotingEntryId] = useState<string | null>(null);

    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

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
    }, [user, sortMode, fetchEntries]);

    const searchParams = useSearchParams();
    const entryIdParam = searchParams.get('entryId');

    // Handle deep link to specific entry
    useEffect(() => {
        if (entryIdParam && entries.length > 0) {
            const entry = entries.find(e => e.id === entryIdParam);
            if (entry) {
                setSelectedEntry(entry);
            } else if (!loadingEntries) {
                // If not in current entries (e.g., further down list), fetch it specifically
                const fetchSpecificEntry = async () => {
                    try {
                        const docSnap = await getDocs(query(collection(db, 'leagueEntries'), where('__name__', '==', entryIdParam)));
                        if (!docSnap.empty) {
                            setSelectedEntry({ id: docSnap.docs[0].id, ...docSnap.docs[0].data() } as LeagueEntry);
                        }
                    } catch (err) {
                        console.error('Failed to fetch deep linked entry:', err);
                    }
                };
                fetchSpecificEntry();
            }
        }
    }, [entryIdParam, entries, loadingEntries]);

    // Check following status for selected entry
    useEffect(() => {
        if (!user || !selectedEntry || user.uid === selectedEntry.originalUserId) {
            setIsFollowing(false);
            return;
        }

        const checkFollowing = async () => {
            try {
                const followingRef = doc(db, 'users', user.uid, 'following', selectedEntry.originalUserId);
                const followingSnap = await getDoc(followingRef);
                setIsFollowing(followingSnap.exists());
            } catch (err) {
                console.error('Error checking follow status:', err);
            }
        };

        checkFollowing();
    }, [user, selectedEntry]);

    const handleToggleFollow = async () => {
        if (!user || !selectedEntry || followLoading) return;
        if (user.uid === selectedEntry.originalUserId) return;

        try {
            setFollowLoading(true);
            const action = isFollowing ? 'unfollow' : 'follow';

            const token = await user.getIdToken();
            const res = await fetch('/api/user/follow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: selectedEntry.originalUserId, action })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setIsFollowing(!isFollowing);
            showToast(isFollowing ? 'Unfollowed creator' : 'Following creator!', 'success');
        } catch (error: any) {
            console.error('[League] Follow error:', error);
            showToast(error.message || 'Failed to update follow status', 'error');
        } finally {
            setFollowLoading(false);
        }
    };

    // Fetch comments when entry is selected
    useEffect(() => {
        if (!selectedEntry || !user) {
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
        }, (error) => {
            console.error('[League] Comments snapshot error:', error);
            setLoadingComments(false);
        });

        return () => unsubscribe();
    }, [selectedEntry, user]);

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
    const handleAddComment = async (text: string) => {
        if (!user || !selectedEntry || !text.trim()) return;

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/league/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId: selectedEntry.id, text: text.trim() }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Update comment count in entries list
            setEntries(prev => prev.map(e =>
                e.id === selectedEntry.id ? { ...e, commentCount: e.commentCount + 1 } : e
            ));
            setSelectedEntry(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);

            showToast('Comment added!', 'success');
        } catch (error: any) {
            console.error('[League] Comment error:', error);
            showToast(error.message || 'Failed to add comment', 'error');
            throw error; // Re-throw to let component handle state
        }
    };

    const handleReport = async (entryId: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entryId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message, 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to report content', 'error');
            throw err;
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
            throw error;
        }
    };

    const handleReactUpdate = (entryId: string, emoji: string, reacted: boolean) => {
        if (!user) return;

        const updateEntry = (e: LeagueEntry) => {
            const reactions = { ...e.reactions };
            const users = Array.from(new Set(reactions[emoji] || []));

            if (reacted) {
                if (!users.includes(user.uid)) users.push(user.uid);
            } else {
                const idx = users.indexOf(user.uid);
                if (idx > -1) users.splice(idx, 1);
            }

            reactions[emoji] = users;
            return { ...e, reactions };
        };

        setEntries(prev => prev.map(e => e.id === entryId ? updateEntry(e) : e));
        if (selectedEntry?.id === entryId) {
            setSelectedEntry(prev => prev ? updateEntry(prev) : null);
        }
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
                <LeagueHeader
                    sortMode={sortMode}
                    onSortChange={setSortMode}
                />

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
                            {entries.map((entry) => (
                                <LeagueEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    userId={user.uid}
                                    onVote={handleVote}
                                    isVoting={votingEntryId === entry.id}
                                    onSelect={setSelectedEntry}
                                    onReact={handleReactUpdate}
                                />
                            ))}
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
                <LeagueEntryModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    user={user}
                    userRole={profile.role}
                    onVote={handleVote}
                    isVoting={votingEntryId === selectedEntry.id}
                    isFollowing={isFollowing}
                    onToggleFollow={handleToggleFollow}
                    followLoading={followLoading}
                    comments={comments}
                    loadingComments={loadingComments}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onReact={handleReactUpdate}
                    onReport={handleReport}
                />
            )}
        </div>
    );
}
