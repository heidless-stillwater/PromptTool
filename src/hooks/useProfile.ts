'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, LeagueEntry } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { useLeagueInteractions } from '@/hooks/useLeagueInteractions';

export function useProfile() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { user: currentUser, loading: authLoading } = useAuth();

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
    const [entries, setEntries] = useState<LeagueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [queryError, setQueryError] = useState<string | null>(null);

    // Interaction State
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
        handleReport
    } = useLeagueInteractions(entries, setEntries);

    const [isFollowingProfile, setIsFollowingProfile] = useState(false);
    const [followLoadingProfile, setFollowLoadingProfile] = useState(false);

    // Computed Stats
    const stats = useMemo(() => {
        const totalVotes = entries.reduce((sum, entry) => sum + (entry.voteCount || 0), 0);
        return {
            totalVotes,
            totalEntries: entries.length
        };
    }, [entries]);

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

            // 2. Fetch league entries for this user
            const entriesRef = collection(db, 'leagueEntries');
            const q = query(
                entriesRef,
                where('originalUserId', '==', userId)
            );

            const snapshot = await getDocs(q);
            const fetched: LeagueEntry[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LeagueEntry));

            setEntries(fetched);

            // 3. Check following status
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


    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
        });
    };

    return {
        // State
        userId, author, entries, loading, authLoading, queryError, stats,
        isFollowingProfile, followLoadingProfile, selectedEntry,
        currentUser,
        comments, loadingComments, votingEntryId,
        isFollowingEntry, followLoadingEntry,

        // Actions
        handleToggleFollowProfile, formatDate, setSelectedEntry,
        handleVote, handleReactUpdate, handleAddComment, handleDeleteComment, handleReport,
        handleToggleFollowEntry
    };
}
