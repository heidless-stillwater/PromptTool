'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs, getDoc, startAfter, doc, where, QueryDocumentSnapshot, DocumentData, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, Collection, GeneratedImage, CreditTransaction, ADMIN_EMAILS } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { SortMode } from '@/components/league/LeagueHeader';

// ============================================
// Query Keys — single source of truth
// ============================================

export const queryKeys = {
    league: {
        all: ['league'] as const,
        entries: (sort: string, filterUserId: string | null) =>
            ['league', 'entries', sort, filterUserId] as const,
        thumbnails: ['league', 'thumbnails'] as const,
        entry: (id: string) => ['league', 'entry', id] as const,
    },
    collections: {
        all: (userId: string) => ['collections', userId] as const,
    },
    dashboard: {
        images: (userId: string, viewMode: string) =>
            ['dashboard', 'images', userId, viewMode] as const,
        leagueRecent: ['dashboard', 'leagueRecent'] as const,
        creditHistory: (userId: string) =>
            ['dashboard', 'creditHistory', userId] as const,
    },
    profile: {
        public: (userId: string) => ['profile', 'public', userId] as const,
    },
};

// ============================================
// League Thumbnails Query
// ============================================

async function fetchLeagueThumbnails(): Promise<string[]> {
    const entriesRef = collection(db, 'leagueEntries');

    const results = await Promise.allSettled([
        getDocs(query(entriesRef, orderBy('voteCount', 'desc'), limit(5))),
        getDocs(query(entriesRef, orderBy('variationCount', 'desc'), limit(5))),
        getDocs(query(entriesRef, orderBy('commentCount', 'desc'), limit(5))),
        getDocs(query(entriesRef, orderBy('shareCount', 'desc'), limit(5))),
        getDocs(query(entriesRef, orderBy('authorFollowerCount', 'desc'), limit(5))),
        getDocs(query(entriesRef, orderBy('publishedAt', 'desc'), limit(5))),
    ]);

    const findValidImage = (result: PromiseSettledResult<any>) => {
        if (result.status !== 'fulfilled') return null;
        const validDoc = result.value.docs.find((d: QueryDocumentSnapshot<DocumentData>) => {
            const url = d.data().imageUrl || '';
            return url && !url.toLowerCase().endsWith('.mp4') && !url.toLowerCase().endsWith('.webm');
        });
        return validDoc?.data().imageUrl || null;
    };

    const absoluteFallback = findValidImage(results[5]) || '';
    return [
        findValidImage(results[0]) || absoluteFallback,
        findValidImage(results[1]) || absoluteFallback,
        findValidImage(results[2]) || absoluteFallback,
        findValidImage(results[3]) || absoluteFallback,
        findValidImage(results[4]) || absoluteFallback,
        absoluteFallback,
    ];
}

export function useLeagueThumbnails() {
    return useQuery({
        queryKey: queryKeys.league.thumbnails,
        queryFn: fetchLeagueThumbnails,
        staleTime: 5 * 60 * 1000, // 5 min — thumbnails rarely change
    });
}

// ============================================
// League Entries Query
// ============================================

function buildLeagueQuery(
    sortMode: SortMode,
    filterUserId: string | null
) {
    const entriesRef = collection(db, 'leagueEntries');

    if (filterUserId) {
        return query(entriesRef, where('originalUserId', '==', filterUserId), orderBy('publishedAt', 'desc'));
    }

    switch (sortMode) {
        case 'newest':
        case 'recent':
            return query(entriesRef, orderBy('publishedAt', 'desc'));
        case 'variations':
        case 'creations':
            return query(entriesRef, orderBy('variationCount', 'desc'), orderBy('publishedAt', 'desc'));
        case 'images':
            return query(entriesRef, orderBy('commentCount', 'desc'), orderBy('publishedAt', 'desc'));
        case 'shared':
            return query(entriesRef, orderBy('shareCount', 'desc'), orderBy('publishedAt', 'desc'));
        case 'followed':
            return query(entriesRef, orderBy('authorFollowerCount', 'desc'), orderBy('publishedAt', 'desc'));
        default:
            return query(entriesRef, orderBy('voteCount', 'desc'), orderBy('publishedAt', 'desc'));
    }
}

async function enrichEntriesWithProfiles(entries: LeagueEntry[]): Promise<LeagueEntry[]> {
    const uniqueUserIds = Array.from(new Set(entries.map(e => e.originalUserId)));
    const profileMap: Record<string, { displayName?: string; photoURL?: string; badges?: string[] }> = {};

    await Promise.all(
        uniqueUserIds.map(async (uid) => {
            try {
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    profileMap[uid] = userDoc.data() as any;
                }
            } catch (_) { }
        })
    );

    return entries.map(entry => {
        const freshProfile = profileMap[entry.originalUserId];
        if (freshProfile) {
            return {
                ...entry,
                authorName: freshProfile.displayName || entry.authorName,
                authorPhotoURL: freshProfile.photoURL ?? entry.authorPhotoURL,
                authorBadges: freshProfile.badges || entry.authorBadges || [],
            };
        }
        return entry;
    });
}

export function useLeagueEntries(sortMode: SortMode, filterUserId: string | null) {
    return useQuery({
        queryKey: queryKeys.league.entries(sortMode, filterUserId),
        queryFn: async () => {
            const baseQuery = buildLeagueQuery(sortMode, filterUserId);
            const q = query(baseQuery, limit(20));
            const snapshot = await getDocs(q);

            const entries: LeagueEntry[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as LeagueEntry));

            return enrichEntriesWithProfiles(entries);
        },
        staleTime: 30 * 1000, // 30s — league data changes moderately
    });
}

// ============================================
// Collections Query
// ============================================

export function useCollectionsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.collections.all(userId || ''),
        queryFn: async () => {
            if (!userId) return [];
            const colRef = collection(db, 'users', userId, 'collections');
            const q = query(colRef, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Collection));
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    });
}

// ============================================
// Dashboard Recent League Entries
// ============================================

export function useDashboardLeagueRecent() {
    return useQuery({
        queryKey: queryKeys.dashboard.leagueRecent,
        queryFn: async () => {
            const entriesRef = collection(db, 'leagueEntries');
            const q = query(entriesRef, orderBy('publishedAt', 'desc'), limit(8));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        staleTime: 60 * 1000,
    });
}

// ============================================
// Single League Entry (for deep links)
// ============================================

export function useLeagueEntry(entryId: string | null) {
    return useQuery({
        queryKey: queryKeys.league.entry(entryId || ''),
        queryFn: async () => {
            if (!entryId) return null;
            const docSnap = await getDocs(
                query(collection(db, 'leagueEntries'), where('__name__', '==', entryId))
            );
            if (docSnap.empty) return null;
            return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() } as LeagueEntry;
        },
        enabled: !!entryId,
        staleTime: 30 * 1000,
    });
}

// ============================================
// Dashboard Images Query
// ============================================

export function useDashboardImages(userId: string | undefined, viewMode: string, isSu: boolean) {
    return useQuery({
        queryKey: queryKeys.dashboard.images(userId || '', viewMode),
        queryFn: async () => {
            if (!userId) return [];
            let q;
            const isPersonal = viewMode === 'personal';
            const isGlobal = viewMode === 'global' && isSu;
            const isAdminView = viewMode === 'admin' && isSu;

            if (isPersonal) {
                const imagesRef = collection(db, 'users', userId, 'images');
                q = query(imagesRef, orderBy('createdAt', 'desc'), limit(24));
            } else if (isGlobal) {
                const imagesRef = collectionGroup(db, 'images');
                q = query(imagesRef, orderBy('createdAt', 'desc'), limit(24));
            } else if (isAdminView) {
                const imagesRef = collectionGroup(db, 'images');
                q = query(imagesRef, where('userId', 'in', ADMIN_EMAILS), orderBy('createdAt', 'desc'), limit(24));
            } else {
                const imagesRef = collection(db, 'users', userId, 'images');
                q = query(imagesRef, orderBy('createdAt', 'desc'), limit(24));
            }

            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as GeneratedImage));
        },
        enabled: !!userId,
        staleTime: 30 * 1000,
    });
}

// ============================================
// Credit History Query
// ============================================

export function useCreditHistory(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.dashboard.creditHistory(userId || ''),
        queryFn: async () => {
            if (!userId) return [];
            const historyRef = collection(db, 'users', userId, 'creditHistory');
            const q = query(historyRef, orderBy('createdAt', 'desc'), limit(20));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as CreditTransaction));
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    });
}
// ============================================
// Mutations for Innovations & Interactions
// ============================================

/**
 * Vote Mutation with Optimistic Updates
 */
export function useVoteMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (entryId: string) => {
            if (!user) throw new Error('Auth required');
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
            return data;
        },
        onMutate: async (entryId) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: queryKeys.league.all });

            // Snapshot all affected queries (lists and individual entries)
            const queries = queryClient.getQueryCache().findAll({
                queryKey: queryKeys.league.all
            });
            const previousStates = queries.map(q => [q.queryKey, q.state.data]);

            // Optimistically update all cached league queries that might contain this entry
            if (user) {
                queries.forEach(query => {
                    const data = query.state.data;

                    // Case 1: List of entries
                    if (Array.isArray(data)) {
                        queryClient.setQueryData(query.queryKey, (old: LeagueEntry[] | undefined) => {
                            return old?.map(e => {
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
                            });
                        });
                    }
                    // Case 2: Individual entry
                    else if (data && (data as LeagueEntry).id === entryId) {
                        queryClient.setQueryData(query.queryKey, (old: LeagueEntry | undefined) => {
                            if (!old) return old;
                            const newVotes = { ...old.votes };
                            const alreadyVoted = !!newVotes[user.uid];
                            if (alreadyVoted) {
                                delete newVotes[user.uid];
                            } else {
                                newVotes[user.uid] = true;
                            }
                            return {
                                ...old,
                                votes: newVotes,
                                voteCount: old.voteCount + (alreadyVoted ? -1 : 1),
                            };
                        });
                    }
                });
            }

            return { previousStates };
        },
        onError: (err, entryId, context) => {
            if (context?.previousStates) {
                context.previousStates.forEach(([key, data]) => {
                    queryClient.setQueryData(key as any, data);
                });
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
        },
    });
}

/**
 * Follow Mutation with Optimistic Updates
 */
export function useFollowMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ targetUserId, action }: { targetUserId: string; action: 'follow' | 'unfollow' }) => {
            if (!user) throw new Error('Auth required');
            const token = await user.getIdToken();
            const res = await fetch('/api/user/follow/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId, action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onMutate: async ({ targetUserId, action }) => {
            // This primarily affects the current entry/profile view
            await queryClient.cancelQueries({ queryKey: queryKeys.profile.public(targetUserId) });
            const previousProfile = queryClient.getQueryData(queryKeys.profile.public(targetUserId));

            // We don't have a direct "isFollowing" in the public profile query usually, 
            // it's often checked on the fly. But if we did, we'd update it here.

            return { previousProfile };
        },
        onSettled: (data, error, { targetUserId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.profile.public(targetUserId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all }); // Some entries show follower counts
        },
    });
}

/**
 * Reaction Mutation with Optimistic Updates
 */
export function useReactionMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ entryId, emoji }: { entryId: string; emoji: string }) => {
            if (!user) throw new Error('Auth required');
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
            return res.json();
        },
        onMutate: async ({ entryId, emoji }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.league.all });

            const queries = queryClient.getQueryCache().findAll({ queryKey: queryKeys.league.all });
            const previousStates = queries.map(q => [q.queryKey, q.state.data]);

            if (user) {
                queries.forEach(query => {
                    const data = query.state.data;

                    // Case 1: List of entries
                    if (Array.isArray(data)) {
                        queryClient.setQueryData(query.queryKey, (old: LeagueEntry[] | undefined) => {
                            return old?.map(e => {
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
                            });
                        });
                    }
                    // Case 2: Individual entry
                    else if (data && (data as LeagueEntry).id === entryId) {
                        queryClient.setQueryData(query.queryKey, (old: LeagueEntry | undefined) => {
                            if (!old) return old;
                            const reactions = { ...old.reactions };
                            const users = Array.from(new Set(reactions[emoji] || []));
                            const hasReacted = users.includes(user.uid);

                            if (hasReacted) {
                                reactions[emoji] = users.filter(id => id !== user.uid);
                            } else {
                                reactions[emoji] = [...users, user.uid];
                            }

                            return { ...old, reactions };
                        });
                    }
                });
            }

            return { previousStates };
        },
        onError: (err, variables, context) => {
            if (context?.previousStates) {
                context.previousStates.forEach(([key, data]) => {
                    queryClient.setQueryData(key as any, data);
                });
            }
        },

        onSettled: (data, error, { entryId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.league.entry(entryId) });
        },
    });
}

/**
 * Comment Mutation (Add)
 */
export function useCommentMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ entryId, text }: { entryId: string; text: string }) => {
            if (!user) throw new Error('Auth required');
            const token = await user.getIdToken();
            const res = await fetch('/api/league/comment/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ entryId, text }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: (data, { entryId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.league.entry(entryId) });
        },
    });
}

/**
 * Comment Mutation (Delete)
 */
export function useDeleteCommentMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ entryId, commentId }: { entryId: string; commentId: string }) => {
            if (!user) throw new Error('Auth required');
            const token = await user.getIdToken();
            const res = await fetch(`/api/league/comment/?entryId=${entryId}&commentId=${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete comment');
            return res.json();
        },
        onSuccess: (data, { entryId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.league.entry(entryId) });
        },
    });
}

/**
 * Share Mutation
 */
export function useShareMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entryId: string) => {
            const { increment, updateDoc, doc } = await import('firebase/firestore');
            const entryRef = doc(db, 'leagueEntries', entryId);
            await updateDoc(entryRef, {
                shareCount: increment(1)
            });
        },
        onMutate: async (entryId) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.league.all });
            const previousEntries = queryClient.getQueryData<LeagueEntry[]>(queryKeys.league.entries('recent', null));

            if (previousEntries) {
                queryClient.setQueryData(queryKeys.league.entries('recent', null), (old: LeagueEntry[] | undefined) => {
                    return old?.map(e => {
                        if (e.id === entryId) {
                            return { ...e, shareCount: (e.shareCount || 0) + 1 };
                        }
                        return e;
                    });
                });
            }

            return { previousEntries };
        },
        onError: (err, entryId, context) => {
            if (context?.previousEntries) {
                queryClient.setQueryData(queryKeys.league.entries('recent', null), context.previousEntries);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
        },
    });
}

/**
 * Unpublish Mutation
 */
export function useUnpublishMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (imageId: string) => {
            if (!user) throw new Error('Auth required');
            const token = await user.getIdToken();
            const res = await fetch('/api/league/publish/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ imageId, action: 'unpublish' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.leagueRecent });
        },
    });
}

/**
 * Toggle Collection Mutation
 */
export function useToggleCollectionMutation() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ entry, collectionId, collections }: { entry: LeagueEntry; collectionId: string; collections: Collection[] }) => {
            if (!user) throw new Error('Auth required');

            const currentIds = entry.collectionIds || [];
            const isRemoving = currentIds.includes(collectionId);
            const newIds = isRemoving
                ? currentIds.filter(id => id !== collectionId)
                : [...currentIds, collectionId];

            const newNames = collections
                .filter(c => newIds.includes(c.id))
                .map(c => c.name);

            const { doc, writeBatch, increment } = await import('firebase/firestore');
            const batch = writeBatch(db);

            const entryRef = doc(db, 'leagueEntries', entry.id);
            const imageRef = doc(db, 'users', user.uid, 'images', entry.originalImageId);
            const collectionRef = doc(db, 'users', user.uid, 'collections', collectionId);

            batch.update(entryRef, {
                collectionIds: newIds,
                collectionNames: newNames
            });
            batch.update(imageRef, { collectionIds: newIds });
            batch.update(collectionRef, {
                imageCount: increment(isRemoving ? -1 : 1)
            });

            await batch.commit();
            return { isRemoving, newIds, newNames };
        },
        onMutate: async ({ entry, collectionId, collections }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.league.all });
            const previousEntries = queryClient.getQueryData<LeagueEntry[]>(queryKeys.league.entries('recent', null));

            const isRemoving = (entry.collectionIds || []).includes(collectionId);
            const newIds = isRemoving
                ? (entry.collectionIds || []).filter(id => id !== collectionId)
                : [...(entry.collectionIds || []), collectionId];
            const newNames = collections.filter(c => newIds.includes(c.id)).map(c => c.name);

            if (previousEntries) {
                queryClient.setQueryData(queryKeys.league.entries('recent', null), (old: LeagueEntry[] | undefined) => {
                    return old?.map(e => {
                        if (e.id === entry.id) {
                            return { ...e, collectionIds: newIds, collectionNames: newNames };
                        }
                        return e;
                    });
                });
            }

            return { previousEntries };
        },
        onError: (err, variables, context) => {
            if (context?.previousEntries) {
                queryClient.setQueryData(queryKeys.league.entries('recent', null), context.previousEntries);
            }
        },
        onSettled: (data, error, { entry }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.league.entry(entry.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.collections.all(user?.uid || '') });
        },
    });
}
