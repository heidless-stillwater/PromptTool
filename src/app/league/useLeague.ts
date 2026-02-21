import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, getDoc, startAfter, QueryDocumentSnapshot, onSnapshot, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment, UserProfile } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { SortMode } from '@/components/league/LeagueHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLeagueInteractions } from '@/hooks/useLeagueInteractions';

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

    const {
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
    } = useLeagueInteractions(entries, setEntries);

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

            // Enrich entries with fresh author profile data (avatars, names, badges)
            // This fixes stale denormalized data on older entries
            const uniqueUserIds = Array.from(new Set(fetchedEntries.map(e => e.originalUserId)));
            const profileMap: Record<string, { displayName?: string; photoURL?: string; badges?: string[] }> = {};

            // Batch fetch user profiles (Firestore getDoc in parallel)
            await Promise.all(
                uniqueUserIds.map(async (uid) => {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', uid));
                        if (userDoc.exists()) {
                            profileMap[uid] = userDoc.data() as any;
                        }
                    } catch (err) {
                        // Silently skip — we still have the denormalized fallback
                    }
                })
            );

            // Merge fresh profile data into entries
            const enrichedEntries = fetchedEntries.map(entry => {
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

            if (isLoadMore) {
                setEntries(prev => [...prev, ...enrichedEntries]);
            } else {
                setEntries(enrichedEntries);
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
