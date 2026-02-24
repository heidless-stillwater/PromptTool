'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, LeagueEntry, GeneratedImage } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { useLeagueInteractions } from '@/hooks/useLeagueInteractions';

export function useProfile() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { user: currentUser, loading: authLoading, profile: authProfile } = useAuth();

    // Resilient userId extraction
    const userId = useMemo(() => {
        // 1. Try to parse from pathname first (most reliable for rewrites)
        if (typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/');
            const profileIdx = pathParts.indexOf('profile');
            if (profileIdx !== -1 && pathParts[profileIdx + 1]) {
                const id = pathParts[profileIdx + 1];
                // Ignore dummy ID '1' if we have a real segment (unless the user IS '1')
                if (id && id !== '' && id !== 'index.html') {
                    return id.replace(/\/$/, '');
                }
            }
        }

        // 2. Fallback to router params
        if (params.userId) return params.userId as string;

        return '';
    }, [params.userId]);

    // Data State
    const [author, setAuthor] = useState<UserProfile | null>(null);
    // All generated images — the primary portfolio source
    const [images, setImages] = useState<GeneratedImage[]>([]);
    // League entries for interactions (vote/comment/modal)
    const [entries, setEntries] = useState<LeagueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'feed' | 'compact' | 'list'>('grid');
    const [isGrouped, setIsGrouped] = useState(false);
    const [showOnlyLeague, setShowOnlyLeague] = useState(false);

    // Lookup map: leagueEntryId → LeagueEntry (for cross-referencing)
    const leagueEntryMap = useMemo(() => {
        const map = new Map<string, LeagueEntry>();
        entries.forEach(e => map.set(e.id, e));
        return map;
    }, [entries]);

    // Interaction State (still driven by leagueEntries for vote/comment)
    const {
        selectedEntry,
        setSelectedEntry,
        comments,
        loadingComments,
        votingEntryId,
        isFollowing: isFollowingEntry,
        followLoading: followLoadingEntry,
        handleVote,
        handleToggleFollow: handleToggleFollowEntry,
        handleReactUpdate,
        handleAddComment,
        handleDeleteComment,
        handleReport,
        unpublishing,
        handleUnpublish: originalHandleUnpublish
    } = useLeagueInteractions(entries, setEntries);

    const [isFollowingProfile, setIsFollowingProfile] = useState(false);
    const [followLoadingProfile, setFollowLoadingProfile] = useState(false);

    // Computed Stats — use total images count, votes from league entries
    const stats = useMemo(() => {
        const totalVotes = entries.reduce((sum, entry) => sum + (entry.voteCount || 0), 0);
        return {
            totalVotes,
            totalEntries: images.length
        };
    }, [entries, images]);

    const fetchProfile = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setQueryError(null);

            // 1. Fetch user document
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                showToast('User not found', 'error');
                router.push('/league');
                return;
            }

            const profileData = { uid: userSnap.id, ...userSnap.data() } as UserProfile;
            setAuthor(profileData);

            // 2. Fetch ALL generated images for this user (primary portfolio)
            const imagesRef = collection(db, 'users', userId, 'images');
            const imagesQuery = query(imagesRef, orderBy('createdAt', 'desc'));
            const imagesSnap = await getDocs(imagesQuery);
            const fetchedImages: GeneratedImage[] = imagesSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as GeneratedImage));
            setImages(fetchedImages);

            // 3. Fetch league entries for interaction (vote/comment/modal)
            const entriesRef = collection(db, 'leagueEntries');
            const entriesQuery = query(entriesRef, where('originalUserId', '==', userId));
            const entriesSnap = await getDocs(entriesQuery);
            const fetchedEntries: LeagueEntry[] = entriesSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as LeagueEntry));
            setEntries(fetchedEntries);

            // 4. Check following status
            if (currentUser && currentUser.uid !== userId) {
                const followingRef = doc(db, 'users', currentUser.uid, 'following', userId);
                const followingSnap = await getDoc(followingRef);
                setIsFollowingProfile(followingSnap.exists());
            }

        } catch (error: any) {
            console.error('[Profile] Error fetching:', error);
            const errorMessage = error.code === 'permission-denied'
                ? 'Permission denied. Check your Firestore rules.'
                : error.message || 'Failed to load profile';

            showToast(errorMessage, 'error');
            setQueryError(error.message);
        } finally {
            setLoading(false);
        }
    }, [userId, currentUser, showToast, router]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleToggleFollowProfile = async () => {
        if (!currentUser || !author || followLoadingProfile) return;

        try {
            setFollowLoadingProfile(true);
            const action = isFollowingProfile ? 'unfollow' : 'follow';
            const token = await currentUser.getIdToken();
            const res = await fetch('/api/user/follow/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: userId, action })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setIsFollowingProfile(!isFollowingProfile);

            // Optimistic update for UI counts
            setAuthor(prev => prev ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + (isFollowingProfile ? -1 : 1)
            } : null);

            showToast(isFollowingProfile ? 'Unfollowed creator' : 'Following creator!', 'success');
        } catch (error: any) {
            console.error('[Profile] Follow error:', error);
            showToast(error.message || 'Failed to update follow status', 'error');
        } finally {
            setFollowLoadingProfile(false);
        }
    };

    const handleUnpublish = useCallback(async () => {
        if (!selectedEntry) return;
        const imageId = selectedEntry.originalImageId;

        await originalHandleUnpublish();

        // After successful unpublish (handled inside originalHandleUnpublish), update local images state
        setImages(prev => prev.map(img =>
            img.id === imageId ? { ...img, publishedToLeague: false, leagueEntryId: undefined } : img
        ));
    }, [selectedEntry, originalHandleUnpublish]);


    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
        });
    };

    return {
        // State
        userId, author, images, entries, leagueEntryMap, loading, authLoading, queryError, stats,
        isFollowingProfile, followLoadingProfile, selectedEntry,
        currentUser, viewMode, setViewMode, isGrouped, setIsGrouped, showOnlyLeague, setShowOnlyLeague,
        comments, loadingComments, votingEntryId,
        isFollowingEntry, followLoadingEntry,
        userRole: authProfile?.role,

        // Actions
        handleToggleFollowProfile, formatDate, setSelectedEntry,
        handleVote, handleReactUpdate, handleAddComment, handleDeleteComment, handleReport,
        handleToggleFollowEntry,
        handleUnpublish,
        unpublishing
    };
}
