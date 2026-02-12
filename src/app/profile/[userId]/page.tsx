'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, LeagueEntry, BADGES } from '@/lib/types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import ShareButtons from '@/components/ShareButtons';
import NotificationBell from '@/components/NotificationBell';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function ProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    const { user: currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [author, setAuthor] = useState<UserProfile | null>(null);
    const [entries, setEntries] = useState<LeagueEntry[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVotes: 0,
        totalEntries: 0
    });

    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Detail modal state
    const [selectedEntry, setSelectedEntry] = useState<LeagueEntry | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

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
                // Temporarily removing orderBy to avoid index requirement
                // orderBy('publishedAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const fetched: LeagueEntry[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LeagueEntry));

            setEntries(fetched);

            // 3. Calculate stats
            const votes = fetched.reduce((sum, entry) => sum + (entry.voteCount || 0), 0);
            setStats({
                totalVotes: votes,
                totalEntries: fetched.length
            });

            // 4. Check following status
            if (currentUser && currentUser.uid !== userId) {
                const followingRef = doc(db, 'users', currentUser.uid, 'following', userId);
                const followingSnap = await getDoc(followingRef);
                setIsFollowing(followingSnap.exists());
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
    }, [userId, showToast, router]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleToggleFollow = async () => {
        if (!currentUser || !author || followLoading) return;

        try {
            setFollowLoading(true);
            const action = isFollowing ? 'unfollow' : 'follow';

            const token = await currentUser.getIdToken();
            const res = await fetch('/api/user/follow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: userId, action })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setIsFollowing(!isFollowing);

            // Optimistic update for UI counts
            setAuthor(prev => prev ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + (isFollowing ? -1 : 1)
            } : null);

            showToast(isFollowing ? 'Unfollowed creator' : 'Following creator!', 'success');
        } catch (error: any) {
            console.error('[Profile] Follow error:', error);
            showToast(error.message || 'Failed to update follow status', 'error');
        } finally {
            setFollowLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
        });
    };

    const handleConfirmReport = async () => {
        if (!currentUser || !selectedEntry) return;
        setIsReporting(true);
        try {
            const token = await currentUser.getIdToken();
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

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!author) return null;

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
                        <Link href="/league" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                            <span>🏆</span> Community League
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Profile Header Card */}
                <div className="glass-card rounded-3xl p-8 mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full" />

                    <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        {/* Avatar */}
                        {author.photoURL ? (
                            <img
                                src={author.photoURL}
                                alt={author.displayName || 'Author'}
                                className="w-32 h-32 rounded-full border-4 border-primary/30 shadow-2xl"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-5xl font-bold text-primary border-4 border-primary/30 shadow-2xl">
                                {(author.displayName || 'A').charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h1 className="text-4xl font-bold">{author.displayName || 'Anonymous Author'}</h1>
                                <div className="flex flex-wrap items-center gap-2 self-center md:self-auto">
                                    {(author.badges || []).map(badgeId => {
                                        const badge = BADGES[badgeId];
                                        if (!badge) return null;
                                        return (
                                            <span
                                                key={badgeId}
                                                title={badge.label}
                                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-background border border-border shadow-sm ${badge.color}`}
                                            >
                                                <span>{badge.icon}</span>
                                                <span className="hidden sm:inline">{badge.label}</span>
                                            </span>
                                        );
                                    })}
                                    {author.role === 'su' || author.role === 'admin' ? (
                                        <span className="bg-yellow-500/20 text-yellow-500 text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md border border-yellow-500/30">
                                            Staff
                                        </span>
                                    ) : (
                                        <span className="bg-primary/10 text-primary text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md border border-primary/20">
                                            Creator
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-foreground-muted mt-2">Member since {formatDate(author.createdAt)}</p>

                            {author.bio && (
                                <p className="text-foreground mt-4 max-w-2xl leading-relaxed whitespace-pre-wrap italic opacity-90">
                                    &quot;{author.bio}&quot;
                                </p>
                            )}

                            {author.socialLinks && (
                                <div className="flex flex-wrap items-center gap-6 mt-6">
                                    {author.socialLinks.twitter && (
                                        <a href={`https://x.com/${author.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                            {author.socialLinks.twitter}
                                        </a>
                                    )}
                                    {author.socialLinks.instagram && (
                                        <a href={`https://instagram.com/${author.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-accent transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5a4.25 4.25 0 0 0-4.25 4.25v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" /></svg>
                                            {author.socialLinks.instagram}
                                        </a>
                                    )}
                                    {author.socialLinks.website && (
                                        <a href={author.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-primary transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                            <span>🌐</span>
                                            Website
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Stats Row */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-8 mt-6">
                                <div className="text-center md:text-left">
                                    <p className="text-3xl font-black text-primary">{stats.totalVotes}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Community Influence</p>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-3xl font-black text-foreground">{stats.totalEntries}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Creations</p>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-3xl font-black text-foreground">{author.followerCount || 0}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Followers</p>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-3xl font-black text-foreground">{author.followingCount || 0}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Following</p>
                                </div>
                            </div>
                        </div>

                        {currentUser?.uid === userId ? (
                            <Link href="/settings" className="btn-secondary px-6 py-3 font-bold border-primary/20">
                                Edit My Profile
                            </Link>
                        ) : currentUser && (
                            <button
                                onClick={handleToggleFollow}
                                disabled={followLoading}
                                className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${isFollowing
                                    ? 'bg-background-secondary border border-border text-foreground-muted hover:bg-error/10 hover:text-error hover:border-error/30'
                                    : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                {followLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    isFollowing ? 'Unfollow' : 'Follow Creator'
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Portfolio Grid */}
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="text-3xl">🖼️</span>
                    Creation Portfolio
                </h2>

                {/* Queries Error Alert */}
                {queryError && (
                    <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                            <strong>Error loading profile entries:</strong> {queryError}
                            {queryError.includes('index') && (
                                <span className="block mt-1 opacity-80">Firestore indexes may still be building or need manual deployment.</span>
                            )}
                        </p>
                    </div>
                )}

                {entries.length === 0 ? (
                    <div className="text-center py-16 glass-card rounded-2xl">
                        <div className="text-6xl mb-4 opacity-30">🏜️</div>
                        <h2 className="text-xl font-semibold mb-2">Portfolio is empty</h2>
                        <p className="text-foreground-muted">
                            This author hasn&apos;t published any images to the league yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="glass-card rounded-2xl overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
                                onClick={() => setSelectedEntry(entry)}
                            >
                                <div className="aspect-square relative overflow-hidden">
                                    <img
                                        src={entry.imageUrl}
                                        alt={entry.prompt}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <div className="flex items-center gap-4 text-white">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <span>❤️</span> {entry.voteCount}
                                            </div>
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <span>💬</span> {entry.commentCount}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Image Detail Modal */}
            {selectedEntry && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-8"
                    onClick={() => setSelectedEntry(null)}
                >
                    <div
                        className="bg-background rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button for better UX */}
                        <button
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            onClick={() => setSelectedEntry(null)}
                        >
                            ✕
                        </button>

                        <img
                            src={selectedEntry.imageUrl}
                            alt={selectedEntry.prompt}
                            className="w-full aspect-square object-cover"
                        />
                        <div className="p-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Prompt Details</h3>
                            <p className="text-sm font-medium mb-6 leading-relaxed italic border-l-2 border-primary/30 pl-4">
                                &quot;{selectedEntry.prompt}&quot;
                            </p>

                            <div className="flex items-center justify-between pt-6 border-t border-border">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-foreground font-bold">
                                            <span className="text-xl">❤️</span> {selectedEntry.voteCount}
                                        </div>
                                        <div className="flex items-center gap-2 text-foreground font-bold">
                                            <span className="text-xl">💬</span> {selectedEntry.commentCount}
                                        </div>
                                    </div>

                                    {/* Report Button */}
                                    {currentUser && currentUser.uid !== selectedEntry.originalUserId && (
                                        <button
                                            onClick={() => setShowReportModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-foreground-muted hover:text-error hover:bg-error/10 border border-border hover:border-error/30 transition-all group/report"
                                            title="Report content"
                                        >
                                            <svg className="w-5 h-5 group-hover/report:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9" />
                                            </svg>
                                            <span className="text-xs font-bold">Report</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/league"
                                        className="btn-secondary text-xs px-4 py-2 flex items-center gap-2"
                                        onClick={() => setSelectedEntry(null)}
                                    >
                                        View in League →
                                    </Link>
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
