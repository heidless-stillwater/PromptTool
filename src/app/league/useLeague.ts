import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, getDoc, startAfter, QueryDocumentSnapshot, onSnapshot, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment, UserProfile } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { SortMode } from '@/components/league/LeagueHeader';
import { useRouter, useSearchParams } from 'next/navigation';

export function useLeague() {
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [entries, setEntries] = useState<LeagueEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null);
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

    // Fetch league entries
    const fetchEntries = useCallback(async (isLoadMore = false) => {
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

            let q;
            const baseConstraints = [
                orderBy(orderField, 'desc'),
                orderBy('publishedAt', 'desc'),
                limit(20)
            ];

            if (isLoadMore && lastVisibleRef.current) {
                q = query(entriesRef, ...baseConstraints, startAfter(lastVisibleRef.current));
            } else {
                q = query(entriesRef, ...baseConstraints);
            }

            // Simplification: Re-using the logic from original but cleaned up
            // Note: Optimizing the query construction
            if (sortMode === 'newest') {
                if (isLoadMore && lastVisibleRef.current) {
                    q = query(entriesRef, orderBy('publishedAt', 'desc'), startAfter(lastVisibleRef.current), limit(20));
                } else {
                    q = query(entriesRef, orderBy('publishedAt', 'desc'), limit(20));
                }
            } else {
                // Trending
                if (isLoadMore && lastVisibleRef.current) {
                    q = query(entriesRef, orderBy('voteCount', 'desc'), orderBy('publishedAt', 'desc'), startAfter(lastVisibleRef.current), limit(20));
                } else {
                    q = query(entriesRef, orderBy('voteCount', 'desc'), orderBy('publishedAt', 'desc'), limit(20));
                }
            }


            const snapshot = await getDocs(q);
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            lastVisibleRef.current = lastDoc || null;
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
            lastVisibleRef.current = null;
            setHasMore(true);
            fetchEntries(false);
        }
    }, [user, sortMode, fetchEntries]);


    // Handle deep link
    const entryIdParam = searchParams.get('entryId');
    useEffect(() => {
        if (entryIdParam && entries.length > 0) {
            const entry = entries.find(e => e.id === entryIdParam);
            if (entry) {
                setSelectedEntry(entry);
            } else if (!loadingEntries) {
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

    // Check following status
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

    // Actions
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

    const handleVote = async (entryId: string) => {
        if (!user) return;
        setVotingEntryId(entryId);

        try {
            const token = await user.getIdToken();
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
            const updateEntry = (e: LeagueEntry) => {
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
            };

            setEntries(prev => prev.map(e => e.id === entryId ? updateEntry(e) : e));

            if (selectedEntry?.id === entryId) {
                setSelectedEntry(prev => prev ? updateEntry(prev) : null);
            }

        } catch (error: any) {
            console.error('[League] Vote error:', error);
            showToast(error.message || 'Failed to vote', 'error');
        } finally {
            setVotingEntryId(null);
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

    // Comments
    useEffect(() => {
        if (!selectedEntry || !user) {
            setComments([]);
            return;
        }

        setLoadingComments(true);
        const commentsRef = collection(db, 'leagueEntries', selectedEntry.id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
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

    const handleAddComment = async (text: string) => {
        if (!user || !selectedEntry || !text.trim()) return;

        try {
            const token = await user.getIdToken();
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

            setEntries(prev => prev.map(e =>
                e.id === selectedEntry.id ? { ...e, commentCount: e.commentCount + 1 } : e
            ));
            setSelectedEntry(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);

            showToast('Comment added!', 'success');
        } catch (error: any) {
            console.error('[League] Comment error:', error);
            showToast(error.message || 'Failed to add comment', 'error');
            throw error;
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!user || !selectedEntry) return;
        if (!confirm('Delete this comment?')) return;

        try {
            const token = await user.getIdToken();
            await fetch(`/api/league/comment?entryId=${selectedEntry.id}&commentId=${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

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

    return {
        user,
        profile,
        entries,
        loadingEntries,
        loadingMore,
        hasMore,
        sortMode,
        setSortMode,
        queryError,
        fetchEntries,
        selectedEntry,
        setSelectedEntry,
        comments,
        loadingComments,
        votingEntryId,
        isFollowing,
        followLoading,
        handleToggleFollow,
        handleVote,
        handleReactUpdate,
        handleAddComment,
        handleDeleteComment,
        handleReport
    };
}
