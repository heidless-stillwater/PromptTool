'use client';

import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';

export function useLeagueInteractions(entries: LeagueEntry[], setEntries: (entries: LeagueEntry[] | ((prev: LeagueEntry[]) => LeagueEntry[])) => void) {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [selectedEntry, setSelectedEntry] = useState<LeagueEntry | null>(null);
    const [comments, setComments] = useState<LeagueComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [votingEntryId, setVotingEntryId] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Initial follow state for selected entry
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

    // Snapshot for comments
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
            console.error('[LeagueInteractions] Comments snapshot error:', error);
            setLoadingComments(false);
        });

        return () => unsubscribe();
    }, [selectedEntry, user]);

    const handleVote = useCallback(async (entryId: string) => {
        if (!user) {
            showToast('Please log in to vote', 'info');
            return;
        }
        setVotingEntryId(entryId);

        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/vote/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

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
            console.error('[LeagueInteractions] Vote error:', error);
            showToast(error.message || 'Failed to vote', 'error');
        } finally {
            setVotingEntryId(null);
        }
    }, [user, selectedEntry, setEntries, showToast]);

    const handleToggleFollow = useCallback(async () => {
        if (!user || !selectedEntry || followLoading) return;
        if (user.uid === selectedEntry.originalUserId) return;

        try {
            setFollowLoading(true);
            const action = isFollowing ? 'unfollow' : 'follow';
            const token = await user.getIdToken();

            const res = await fetch('/api/user/follow/', {
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
            console.error('[LeagueInteractions] Follow error:', error);
            showToast(error.message || 'Failed to update follow status', 'error');
        } finally {
            setFollowLoading(false);
        }
    }, [user, selectedEntry, isFollowing, followLoading, showToast]);

    const handleReactUpdate = useCallback(async (entryId: string, emoji: string, reacted: boolean) => {
        if (!user) return;

        // Optimistic update
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

        const prevEntries = entries;
        const prevSelected = selectedEntry;

        setEntries(prev => prev.map(e => e.id === entryId ? updateEntry(e) : e));
        if (selectedEntry?.id === entryId) {
            setSelectedEntry(prev => prev ? updateEntry(prev) : null);
        }

        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/react/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entryId, emoji })
            });

            if (!res.ok) throw new Error('Failed to update reaction');
        } catch (error: any) {
            console.error('[LeagueInteractions] React error:', error);
            // Revert on error
            setEntries(prevEntries);
            setSelectedEntry(prevSelected);
            showToast(error.message || 'Failed to update reaction', 'error');
        }
    }, [user, selectedEntry, entries, setEntries, setSelectedEntry, showToast]);

    const handleAddComment = useCallback(async (text: string) => {
        if (!user || !selectedEntry || !text.trim()) return;

        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/comment/', {
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
            console.error('[LeagueInteractions] Comment error:', error);
            showToast(error.message || 'Failed to add comment', 'error');
            throw error;
        }
    }, [user, selectedEntry, setEntries, showToast]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        if (!user || !selectedEntry) return;

        try {
            const token = await user.getIdToken();
            await fetch(`/api/league/comment/?entryId=${selectedEntry.id}&commentId=${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            setEntries(prev => prev.map(e =>
                e.id === selectedEntry.id ? { ...e, commentCount: Math.max(0, e.commentCount - 1) } : e
            ));
            setSelectedEntry(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null);

            showToast('Comment deleted', 'success');
        } catch (error: any) {
            console.error('[LeagueInteractions] Delete comment error:', error);
            showToast(error.message || 'Failed to delete comment', 'error');
            throw error;
        }
    }, [user, selectedEntry, setEntries, showToast]);

    const handleReport = useCallback(async (entryId: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/report/', {
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
    }, [user, showToast]);

    return {
        selectedEntry,
        setSelectedEntry,
        comments,
        loadingComments,
        votingEntryId,
        isFollowing,
        followLoading,
        handleVote,
        handleToggleFollow,
        handleReactUpdate,
        handleAddComment,
        handleDeleteComment,
        handleReport
    };
}
