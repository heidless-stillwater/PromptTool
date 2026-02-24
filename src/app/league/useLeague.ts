import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, getDoc, startAfter, QueryDocumentSnapshot, doc, where, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeagueEntry, LeagueComment, UserProfile, Collection } from '@/lib/types';
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
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [viewMode, setViewMode] = useState<'grid' | 'feed' | 'compact' | 'creators'>('grid');
    const [isGrouped, setIsGrouped] = useState(false);
    const [isGroupedByUser, setIsGroupedByUser] = useState(false);
    const [filterUserId, setFilterUserId] = useState<string | null>(null);
    const [filterUserName, setFilterUserName] = useState<string | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [quickLinkThumbnails, setQuickLinkThumbnails] = useState<string[]>([]);

    // Fetch specific thumbnails for each quick link category
    useEffect(() => {
        const fetchThumbnails = async () => {
            try {
                const entriesRef = collection(db, 'leagueEntries');

                // Fetch top 5 for each category to ensure we find a valid image (non-video)
                const results = await Promise.allSettled([
                    getDocs(query(entriesRef, orderBy('voteCount', 'desc'), limit(5))),
                    getDocs(query(entriesRef, orderBy('variationCount', 'desc'), limit(5))),
                    getDocs(query(entriesRef, orderBy('commentCount', 'desc'), limit(5))),
                    getDocs(query(entriesRef, orderBy('shareCount', 'desc'), limit(5))),
                    getDocs(query(entriesRef, orderBy('authorFollowerCount', 'desc'), limit(5))),
                    getDocs(query(entriesRef, orderBy('publishedAt', 'desc'), limit(5)))
                ]);

                // Helper to find first valid image URL (not a video)
                const findValidImage = (result: PromiseSettledResult<QuerySnapshot<DocumentData>>) => {
                    if (result.status !== 'fulfilled') return null;
                    const validDoc = result.value.docs.find((doc: QueryDocumentSnapshot<DocumentData>) => {
                        const url = doc.data().imageUrl || '';
                        return url && !url.toLowerCase().endsWith('.mp4') && !url.toLowerCase().endsWith('.webm');
                    });
                    return validDoc?.data().imageUrl || null;
                };

                const influenceImg = findValidImage(results[0]);
                const popularImg = findValidImage(results[1]);
                const discussedImg = findValidImage(results[2]);
                const sharedImg = findValidImage(results[3]);
                const followedImg = findValidImage(results[4]);
                const recentImg = findValidImage(results[5]);
                const absoluteFallback = findValidImage(results[5]) || ''; // Guaranteed recent image fallback

                const thumbs: string[] = [
                    influenceImg || absoluteFallback,
                    popularImg || absoluteFallback,
                    discussedImg || absoluteFallback,
                    sharedImg || absoluteFallback,
                    followedImg || absoluteFallback,
                    absoluteFallback
                ];

                setQuickLinkThumbnails(thumbs);
                console.log('[League] Thumbnails loaded with video filtering:', thumbs);
            } catch (err) {
                console.error('Error fetching quick link thumbnails:', err);
            }
        };
        fetchThumbnails();
    }, []);

    // Keep "Recent" up to date with a real-time listener for the latest addition
    useEffect(() => {
        if (!user || (sortMode !== 'recent' && sortMode !== 'newest') || filterUserId) return;

        const q = query(collection(db, 'leagueEntries'), orderBy('publishedAt', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot: any) => {
            if (snapshot.empty) return;
            const newDoc = snapshot.docs[0];
            const newEntry = { id: newDoc.id, ...newDoc.data() } as LeagueEntry;

            setEntries(prev => {
                if (prev.length === 0) return [newEntry];
                if (prev.some(e => e.id === newEntry.id)) return prev;
                // Only add if it's actually newer than our top item
                return [newEntry, ...prev];
            });
        }, (err: any) => {
            console.error('Real-time listener error:', err);
        });

        return () => unsubscribe();
    }, [user, sortMode]);

    // Persist view mode & grouping
    useEffect(() => {
        const savedView = localStorage.getItem('leagueViewMode');
        const savedGroup = localStorage.getItem('leagueIsGrouped');
        const savedGroupByUser = localStorage.getItem('leagueIsGroupedByUser');

        if (savedView === 'grid' || savedView === 'feed' || savedView === 'compact' || savedView === 'creators') {
            setViewMode(savedView);
        } else if (savedView === 'grouped') {
            setViewMode('creators');
        }

        if (savedGroup === 'true') {
            setIsGrouped(true);
        }

        if (savedGroupByUser === 'true') {
            setIsGroupedByUser(true);
        }
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'feed' | 'compact' | 'creators') => {
        setViewMode(mode);
        localStorage.setItem('leagueViewMode', mode);
    };

    const handleToggleGrouped = () => {
        const next = !isGrouped;
        setIsGrouped(next);
        localStorage.setItem('leagueIsGrouped', String(next));
    };

    const handleToggleGroupedByUser = () => {
        const next = !isGroupedByUser;
        setIsGroupedByUser(next);
        localStorage.setItem('leagueIsGroupedByUser', String(next));
    };

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
        handleReport,
        handleToggleCollection,
        unpublishing,
        handleUnpublish,
        handleShare
    } = useLeagueInteractions(entries, setEntries, collections);

    // Fetch collections
    useEffect(() => {
        if (!user) return;
        const fetchCollections = async () => {
            try {
                const colRef = collection(db, 'users', user.uid, 'collections');
                const q = query(colRef, orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                setCollections(snap.docs.map(d => ({ id: d.id, ...d.data() } as Collection)));
            } catch (err) {
                console.error('Error fetching collections:', err);
            }
        };
        fetchCollections();
    }, [user]);

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
            let q;

            if (filterUserId) {
                q = query(entriesRef, where('originalUserId', '==', filterUserId), orderBy('publishedAt', 'desc'));
            } else if (sortMode === 'newest' || sortMode === 'recent') {
                q = query(entriesRef, orderBy('publishedAt', 'desc'));
            } else if (sortMode === 'variations' || sortMode === 'creations') {
                q = query(entriesRef, orderBy('variationCount', 'desc'), orderBy('publishedAt', 'desc'));
            } else if (sortMode === 'images') {
                q = query(entriesRef, orderBy('commentCount', 'desc'), orderBy('publishedAt', 'desc'));
            } else if (sortMode === 'shared') {
                q = query(entriesRef, orderBy('shareCount', 'desc'), orderBy('publishedAt', 'desc'));
            } else if (sortMode === 'followed') {
                q = query(entriesRef, orderBy('authorFollowerCount', 'desc'), orderBy('publishedAt', 'desc'));
            } else {
                // trending, alltime, liked, influence - use voteCount
                q = query(entriesRef, orderBy('voteCount', 'desc'), orderBy('publishedAt', 'desc'));
            }

            if (isLoadMore && lastVisibleRef.current) {
                q = query(q, startAfter(lastVisibleRef.current), limit(20));
            } else {
                q = query(q, limit(20));
            }


            const snapshot = await getDocs(q);
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            lastVisibleRef.current = lastDoc || null;
            setHasMore(snapshot.docs.length === 20);

            const fetchedEntries: LeagueEntry[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as LeagueEntry));

            // Enrich entries with fresh author profile data
            const uniqueUserIds = Array.from(new Set(fetchedEntries.map(e => e.originalUserId)));
            const profileMap: Record<string, { displayName?: string; photoURL?: string; badges?: string[] }> = {};

            await Promise.all(
                uniqueUserIds.map(async (uid) => {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', uid));
                        if (userDoc.exists()) {
                            profileMap[uid] = userDoc.data() as any;
                        }
                    } catch (err) { }
                })
            );

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
    }, [user, sortMode, filterUserId]);

    // Initial load & sort change
    useEffect(() => {
        if (user) {
            setEntries([]);
            lastVisibleRef.current = null;
            setHasMore(true);
            fetchEntries(false);
        }
    }, [user, sortMode, filterUserId, fetchEntries]);

    const handleFilterUser = (uid: string | null, name: string | null) => {
        setFilterUserId(uid);
        setFilterUserName(name);
        setEntries([]);
        lastVisibleRef.current = null;
        setHasMore(true);
    };


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
        collections,
        loadingEntries,
        loadingMore,
        hasMore,
        sortMode,
        setSortMode,
        viewMode,
        setViewMode: handleViewModeChange,
        isGrouped,
        handleToggleGrouped,
        isGroupedByUser,
        handleToggleGroupedByUser,
        filterUserId,
        filterUserName,
        handleFilterUser,
        queryError,
        fetchEntries,
        selectedEntry,
        setSelectedEntry,
        comments,
        loadingComments,
        votingEntryId,
        isFollowing,
        followLoading,
        unpublishing,
        handleToggleFollow,
        handleVote,
        handleReactUpdate,
        handleAddComment,
        handleDeleteComment,
        handleReport,
        handleToggleCollection,
        handleUnpublish,
        handleShare,
        quickLinkThumbnails
    };
}
