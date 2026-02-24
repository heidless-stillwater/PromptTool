'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import {
    useVoteMutation,
    useFollowMutation,
    useReactionMutation,
    useCommentMutation,
    useDeleteCommentMutation,
    useShareMutation,
    useUnpublishMutation,
    useToggleCollectionMutation
} from './queries/useQueryHooks';

export function useLeagueInteractions(
    entries: LeagueEntry[],
    collections: any[] = [],
    setExtraEntries?: (updater: (prev: LeagueEntry[]) => LeagueEntry[]) => void
) {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [comments, setComments] = useState<LeagueComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [unpublishing, setUnpublishing] = useState(false);

    // Derive selectedEntry from entries + selectedEntryId
    const selectedEntry = useMemo(() => {
        if (!selectedEntryId) return null;
        return entries.find(e => e.id === selectedEntryId) || null;
    }, [entries, selectedEntryId]);

    // Mutations
    const voteMutation = useVoteMutation();
    const followMutation = useFollowMutation();
    const reactionMutation = useReactionMutation();
    const commentMutation = useCommentMutation();
    const deleteCommentMutation = useDeleteCommentMutation();
    const shareMutation = useShareMutation();
    const unpublishMutation = useUnpublishMutation();
    const toggleCollectionMutation = useToggleCollectionMutation();

    const votingEntryId = voteMutation.isPending ? voteMutation.variables : null;
    const followLoading = followMutation.isPending;

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

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as LeagueComment));

            // Enrich with fresh profile data
            const uids = Array.from(new Set(fetched.map(c => c.userId)));
            const profileMap: Record<string, any> = {};

            await Promise.all(uids.map(async (uid) => {
                try {
                    const snap = await getDoc(doc(db, 'users', uid));
                    if (snap.exists()) profileMap[uid] = snap.data();
                } catch (err) { }
            }));

            const enriched = fetched.map(c => {
                const p = profileMap[c.userId];
                return p ? {
                    ...c,
                    userName: p.displayName || c.userName,
                    userPhotoURL: p.photoURL ?? c.userPhotoURL,
                    userBadges: p.badges || c.userBadges || []
                } : c;
            });

            setComments(enriched);
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
        voteMutation.mutate(entryId, {
            onSuccess: () => {
                // Manually update extraEntries since they are outside TanStack Query's cache
                setExtraEntries?.(prev => prev.map(e => {
                    if (e.id === entryId) {
                        const newVotes = { ...e.votes };
                        const alreadyVoted = !!newVotes[user.uid];
                        if (alreadyVoted) {
                            delete newVotes[user.uid];
                        } else {
                            newVotes[user.uid] = true;
                        }
                        return {
                            ...e,
                            votes: newVotes,
                            voteCount: e.voteCount + (alreadyVoted ? -1 : 1),
                        };
                    }
                    return e;
                }));
            }
        });
    }, [user, voteMutation, showToast, setExtraEntries]);

    const handleToggleFollow = useCallback(async () => {
        if (!user || !selectedEntry || followLoading) return;
        if (user.uid === selectedEntry.originalUserId) return;

        const action = isFollowing ? 'unfollow' : 'follow';
        followMutation.mutate({ targetUserId: selectedEntry.originalUserId, action }, {
            onSuccess: () => {
                setIsFollowing(!isFollowing);
                showToast(isFollowing ? 'Unfollowed creator' : 'Following creator!', 'success');
            }
        });
    }, [user, selectedEntry, isFollowing, followLoading, followMutation, showToast]);

    const handleReactUpdate = useCallback(async (entryId: string, emoji: string) => {
        if (!user) return;
        reactionMutation.mutate({ entryId, emoji }, {
            onSuccess: () => {
                setExtraEntries?.(prev => prev.map(e => {
                    if (e.id === entryId) {
                        const reactions = { ...e.reactions };
                        const users = Array.from(new Set(reactions[emoji] || []));
                        const hasReacted = users.includes(user.uid);

                        if (hasReacted) {
                            reactions[emoji] = users.filter(id => id !== user.uid);
                        } else {
                            reactions[emoji] = [...users, user.uid];
                        }
                        return { ...e, reactions };
                    }
                    return e;
                }));
            }
        });
    }, [user, reactionMutation, setExtraEntries]);

    const handleAddComment = useCallback(async (text: string) => {
        if (!user || !selectedEntry || !text.trim()) return;
        return commentMutation.mutateAsync({ entryId: selectedEntry.id, text: text.trim() });
    }, [user, selectedEntry, commentMutation]);

    const handleDeleteComment = useCallback(async (commentId: string) => {
        if (!user || !selectedEntry) return;
        return deleteCommentMutation.mutateAsync({ entryId: selectedEntry.id, commentId });
    }, [user, selectedEntry, deleteCommentMutation]);

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

    const handleToggleCollection = useCallback(async (collectionId: string) => {
        if (!user || !selectedEntry) return;
        if (user.uid !== selectedEntry.originalUserId) return;

        toggleCollectionMutation.mutate({
            entry: selectedEntry,
            collectionId,
            collections
        }, {
            onSuccess: (data: { isRemoving: boolean }) => {
                showToast(data.isRemoving ? 'Removed from collection' : 'Added to collection', 'success');
            },
            onError: () => {
                showToast('Failed to update collection', 'error');
            }
        });
    }, [user, selectedEntry, collections, toggleCollectionMutation, showToast]);

    const handleShare = useCallback(async (entryId: string) => {
        shareMutation.mutate(entryId);
    }, [shareMutation]);

    const handleUnpublish = useCallback(async () => {
        if (!user || !selectedEntry || unpublishing) return;
        if (user.uid !== selectedEntry.originalUserId) return;

        unpublishMutation.mutate(selectedEntry.originalImageId, {
            onSuccess: () => {
                showToast('Removed from Community Hub', 'success');
                setSelectedEntryId(null);
            },
            onError: (err: any) => {
                showToast(err.message || 'Failed to remove from Hub', 'error');
            }
        });
    }, [user, selectedEntry, unpublishing, unpublishMutation, showToast, setSelectedEntryId]);

    const reactingEmoji = reactionMutation.isPending
        ? reactionMutation.variables?.emoji
        : null;

    return {
        selectedEntry,
        setSelectedEntry: setSelectedEntryId,
        comments,
        loadingComments,
        votingEntryId,
        isFollowing,
        followLoading,
        reactingEmoji,
        unpublishing,
        handleVote,
        handleToggleFollow,
        handleReactUpdate,
        handleAddComment,
        handleDeleteComment,
        handleReport,
        handleToggleCollection,
        handleUnpublish,
        handleShare
    };
}
