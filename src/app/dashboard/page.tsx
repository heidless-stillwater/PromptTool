'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, deleteField, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage, CREDIT_COSTS, CreditTransaction, Collection } from '@/lib/types';
import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';
import NotificationBell from '@/components/NotificationBell';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import CollectionSelectModal from '@/components/CollectionSelectModal';
import BulkTagModal from '@/components/BulkTagModal';
import GlobalSearch from '@/components/GlobalSearch';

export default function DashboardPage() {
    const { user, profile, credits, loading, signOut, switchRole, effectiveRole, setAudienceMode } = useAuth();
    const router = useRouter();
    const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
    const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
    const [recentLeagueEntries, setRecentLeagueEntries] = useState<any[]>([]); // Using any for simplicity here, ideally LeagueEntry
    const [loadingImages, setLoadingImages] = useState(true);
    const [loadingLeague, setLoadingLeague] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isGrouped, setIsGrouped] = useState(true);

    // Batch Management state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkPublishing, setIsBulkPublishing] = useState(false);
    const [isBulkCollecting, setIsBulkCollecting] = useState(false);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [isBulkTagging, setIsBulkTagging] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [collections, setCollections] = useState<Collection[]>([]);

    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [isVerifyingUpgrade, setIsVerifyingUpgrade] = useState(false);

    // Group images helper
    const groupImagesByPromptSet = (images: GeneratedImage[]) => {
        const groups: Record<string, GeneratedImage[]> = {};

        images.forEach(img => {
            const key = img.promptSetID || `single-${img.id}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(img);
        });

        return groups;
    };

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Handle Stripe Session Verification
    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId && user && !isVerifyingUpgrade) {
            const verifySession = async () => {
                setIsVerifyingUpgrade(true);
                showToast('Verifying your upgrade...', 'info');

                try {
                    const token = await user.getIdToken();
                    const res = await fetch('/api/stripe/verify-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ sessionId })
                    });

                    const data = await res.json();

                    if (data.success) {
                        if (data.alreadyProcessed) {
                            showToast('Welcome back! Your subscription is active.', 'success');
                        } else {
                            showToast('Upgrade successful! Your account has been updated.', 'success');
                        }
                        // Remove session_id from URL to prevent re-processing
                        router.replace('/dashboard');
                    } else {
                        showToast(data.message || 'Payment verification in progress...', 'info');
                    }
                } catch (err) {
                    console.error('Session verification error:', err);
                    showToast('Failed to verify upgrade. Please contact support.', 'error');
                } finally {
                    setIsVerifyingUpgrade(false);
                }
            };

            verifySession();
        }
    }, [searchParams, user, router, showToast]);


    // Fetch recent images
    useEffect(() => {
        async function fetchImages() {
            if (!user) return;

            try {
                const imagesRef = collection(db, 'users', user.uid, 'images');
                const q = query(imagesRef, orderBy('createdAt', 'desc'), limit(12));
                const snapshot = await getDocs(q);

                const images = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as GeneratedImage));

                setRecentImages(images);
            } catch (error) {
                console.error('Failed to fetch images:', error);
            } finally {
                setLoadingImages(false);
            }
        }

        if (user) {
            fetchImages();
        }
    }, [user]);

    // Fetch recent league entries
    useEffect(() => {
        async function fetchLeague() {
            if (!user) return;
            try {
                const entriesRef = collection(db, 'leagueEntries');
                const q = query(entriesRef, orderBy('publishedAt', 'desc'), limit(8));
                const snapshot = await getDocs(q);

                const entries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setRecentLeagueEntries(entries);
            } catch (error) {
                console.error('Failed to fetch league entries:', error);
            } finally {
                setLoadingLeague(false);
            }
        }

        fetchLeague();
        if (user) {
            fetchCollections();
        }
    }, [user]);

    // Fetch collections
    async function fetchCollections() {
        if (!user) return;
        try {
            const colRef = collection(db, 'users', user.uid, 'collections');
            const q = query(colRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Collection));
            setCollections(fetched);
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        }
    }

    // Fetch credit history
    useEffect(() => {
        async function fetchHistory() {
            if (!user) return;

            try {
                const historyRef = collection(db, 'users', user.uid, 'creditHistory');
                const q = query(historyRef, orderBy('createdAt', 'desc'), limit(10));
                const snapshot = await getDocs(q);

                const history = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CreditTransaction));

                setCreditHistory(history);
            } catch (error) {
                console.error('Failed to fetch credit history:', error);
            } finally {
                setLoadingHistory(false);
            }
        }

        if (user) {
            fetchHistory();
        }
    }, [user]);

    // Batch Select Handlers
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedIds(new Set());
    };

    const toggleImageSelection = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleImageGroupSelection = (ids: string[], e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const newSelected = new Set(selectedIds);
        const allAlreadySelected = ids.every(id => newSelected.has(id));

        if (allAlreadySelected) {
            // Unselect all in group
            ids.forEach(id => newSelected.delete(id));
        } else {
            // Select all in group
            ids.forEach(id => newSelected.add(id));
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        const allIds = recentImages.map(img => img.id);
        setSelectedIds(new Set(allIds));
    };

    const handleBulkDelete = async () => {
        if (!user || selectedIds.size === 0) return;

        const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.size} images? This cannot be undone.`);
        if (!confirmDelete) return;

        setIsBulkDeleting(true);
        try {
            const { doc, deleteDoc } = await import('firebase/firestore');
            const { ref, deleteObject } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');

            const deletePromises = Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return;

                // 1. Delete from Firestore
                await deleteDoc(doc(db, 'users', user.uid, 'images', id));

                // 2. Delete from Storage
                if (img.storagePath) {
                    const storageRef = ref(storage, img.storagePath);
                    try {
                        await deleteObject(storageRef);
                    } catch (e) {
                        console.warn(`Failed to delete storage file: ${img.storagePath}`, e);
                    }
                }
                if (img.collectionIds) {
                    // Decrement counts for collections this image belonged to
                    // We can't batch these easily without a write batch, but for now we'll do best effort
                    // We need to do this *after* or parallel to delete.
                }
            });

            // Calculate collection updates before deleting from state
            const collectionDecrements: Record<string, number> = {};
            selectedIds.forEach(id => {
                const img = recentImages.find(i => i.id === id);
                if (img?.collectionIds) {
                    img.collectionIds.forEach(colId => {
                        collectionDecrements[colId] = (collectionDecrements[colId] || 0) + 1;
                    });
                }
            });

            // Apply decrements
            const decrementPromises = Object.entries(collectionDecrements).map(([colId, count]) => {
                return updateDoc(doc(db, 'users', user.uid, 'collections', colId), {
                    imageCount: increment(-count)
                }).catch(e => console.warn(`Failed to decrement count for collection ${colId}`, e));
            });

            await Promise.all([...deletePromises, ...decrementPromises]);

            // Refresh local state
            setRecentImages(prev => prev.filter(img => !selectedIds.has(img.id)));
            setSelectedIds(new Set());
            setSelectionMode(false);
            showToast(`Successfully deleted ${selectedIds.size} images`, 'success');
        } catch (err) {
            console.error('Bulk delete failed:', err);
            showToast('Failed to delete some images. Please try again.', 'error');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkAddToCollection = async (collectionId: string) => {
        if (!user || selectedIds.size === 0) return;

        setIsBulkCollecting(true);
        try {
            let addedCount = 0;

            const batchPromises = Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return;

                const currentIds = img.collectionIds || [];
                if (!currentIds.includes(collectionId)) {
                    addedCount++;
                    const newIds = [...currentIds, collectionId];
                    const imageRef = doc(db, 'users', user.uid, 'images', id);
                    await updateDoc(imageRef, {
                        collectionIds: newIds,
                        collectionId: deleteField() // Clean legacy field
                    });

                    // Update local state for this image
                    img.collectionIds = newIds;
                }
            });

            await Promise.all(batchPromises);

            if (addedCount > 0) {
                await updateDoc(doc(db, 'users', user.uid, 'collections', collectionId), {
                    imageCount: increment(addedCount),
                    updatedAt: serverTimestamp()
                });
            }

            // Refetch collections to update counts
            fetchCollections();

            setSelectedIds(new Set());
            setSelectionMode(false);
            setIsCollectionModalOpen(false);
            showToast(`Added ${selectedIds.size} images to collection`, 'success');
        } catch (err) {
            console.error('Bulk add to collection failed:', err);
            showToast('Failed to update some images. Please try again.', 'error');
        } finally {
            setIsBulkCollecting(false);
        }
    };

    const handleBulkPublishToLeague = async () => {
        if (!user || selectedIds.size === 0) return;

        const confirmPublish = window.confirm(`Publish ${selectedIds.size} images to the Community League?`);
        if (!confirmPublish) return;

        setIsBulkPublishing(true);
        try {
            const token = await user.getIdToken();
            const publishPromises = Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img || img.publishedToLeague) return;

                const res = await fetch('/api/league/publish', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ imageId: id, action: 'publish' }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to publish image');
                }

                const data = await res.json();
                // Update local image state
                img.publishedToLeague = true;
                img.leagueEntryId = data.leagueEntryId;
            });

            await Promise.all(publishPromises);

            setSelectedIds(new Set());
            setSelectionMode(false);
            showToast(`Successfully published ${selectedIds.size} images to the League!`, 'success');
        } finally {
            setIsBulkPublishing(false);
        }
    };

    const handleBulkAddTags = async (tags: string[]) => {
        if (!user || selectedIds.size === 0) return;

        setIsBulkTagging(true);
        try {
            const batchPromises = Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return;

                const currentTags = img.tags || [];
                const newTags = Array.from(new Set([...currentTags, ...tags]));

                if (newTags.length > currentTags.length) {
                    const imageRef = doc(db, 'users', user.uid, 'images', id);
                    await updateDoc(imageRef, {
                        tags: newTags
                    });

                    // Update local state for this image
                    img.tags = newTags;
                }
            });

            await Promise.all(batchPromises);

            setSelectedIds(new Set());
            setSelectionMode(false);
            setIsTagModalOpen(false);
            showToast(`Added tags to ${selectedIds.size} images`, 'success');
        } catch (err) {
            console.error('Bulk tagging failed:', err);
            showToast('Failed to add tags to some images.', 'error');
        } finally {
            setIsBulkTagging(false);
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

    const availableCredits = credits
        ? credits.balance + Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const dailyRemaining = credits
        ? Math.max(0, credits.dailyAllowance - credits.dailyAllowanceUsed)
        : 0;

    const isAdminOrSu = profile.role === 'admin' || profile.role === 'su';

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/collections" className="text-sm font-medium hover:text-primary transition-colors hidden md:block">
                            My Collections
                        </Link>
                        <GlobalSearch />
                        <NotificationBell />
                        {/* Credits Display */}
                        <Link href="/pricing" className="credit-badge hover:border-primary/50 transition-colors group">
                            <svg className="group-hover:scale-110 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v12M6 12h12" />
                            </svg>
                            <span>{availableCredits} credits</span>
                            <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Get More</span>
                        </Link>

                        {/* Role Switcher & Admin Link (Admin only) */}
                        {isAdminOrSu && (
                            <div className="flex items-center gap-3">
                                <Link href="/admin" className="btn-secondary text-xs px-3 py-2 flex items-center gap-2 border-primary/20 hover:border-primary/50 transition-all">
                                    <span>🛡️</span>
                                    <span className="hidden sm:inline">Admin Panel</span>
                                </Link>
                                <div className="relative">
                                    <select
                                        value={effectiveRole}
                                        onChange={(e) => switchRole(e.target.value as any)}
                                        className="select-field text-sm py-2 pr-8"
                                    >
                                        <option value={profile.role}>View as {profile.role}</option>
                                        <option value="member">View as Member</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Audience Mode Toggle */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold text-center">Audience Mode</span>
                            <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50">
                                <button
                                    onClick={() => setAudienceMode('casual')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${profile.audienceMode === 'casual'
                                        ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Casual
                                </button>
                                <button
                                    onClick={() => setAudienceMode('professional')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${profile.audienceMode === 'professional'
                                        ? 'bg-accent text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Pro
                                </button>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-3">
                            <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                {profile.photoURL && (
                                    <img
                                        src={profile.photoURL}
                                        alt={profile.displayName || 'User'}
                                        className="w-10 h-10 rounded-full border-2 border-primary"
                                    />
                                )}
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium">{profile.displayName}</p>
                                    <p className="text-xs text-foreground-muted capitalize">{profile.subscription} plan</p>
                                </div>
                            </Link>
                            <Link href="/settings" className="btn-secondary text-sm px-4 py-2 ml-2 flex items-center justify-center" title="Profile Settings">
                                ⚙️
                            </Link>
                            <button onClick={signOut} className="btn-secondary text-sm px-4 py-2 ml-2">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Content based on Audience Mode */}
                <div className={`mb-8 p-6 rounded-2xl border transition-all duration-500 ${profile.audienceMode === 'casual'
                    ? 'bg-primary/5 border-primary/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]'
                    : 'bg-accent/5 border-accent/20 shadow-[inset_0_0_20px_rgba(217,70,239,0.05)]'
                    }`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${profile.audienceMode === 'casual' ? 'bg-primary text-white' : 'bg-accent text-white'
                                    }`}>
                                    {profile.audienceMode} mode active
                                </span>
                                <h2 className="text-2xl font-bold">
                                    {profile.audienceMode === 'casual' ? 'Ready to have some fun?' : 'Precision Image Studio'}
                                </h2>
                            </div>
                            <p className="text-foreground-muted max-w-xl">
                                {profile.audienceMode === 'casual'
                                    ? 'In Casual mode, we guide you through creating prompts using our Build-a-Prompt tool. It is perfect for fast, high-quality results without the technical jargon.'
                                    : 'Professional mode gives you full tool access, granular settings, and a free-form text environment for absolute creative control.'}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                href={`/profile/${user.uid}`}
                                className="btn-secondary flex items-center justify-center gap-2 py-4 px-6 text-sm font-bold"
                            >
                                <span>👤</span>
                                <span>Public Profile</span>
                            </Link>
                            <Link
                                href="/generate"
                                className={`btn-primary flex items-center gap-3 py-4 px-8 text-lg font-bold group transition-all duration-300 ${profile.audienceMode === 'professional' ? '!bg-accent !shadow-accent/30' : ''
                                    }`}
                            >
                                <span>{profile.audienceMode === 'casual' ? 'Start Creating' : 'New Generation'}</span>
                                <svg className="group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Available Credits</span>
                            <span className="text-2xl">💎</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-bold">{availableCredits}</p>
                                <p className="text-sm text-foreground-muted">
                                    {dailyRemaining} daily + {credits?.balance || 0} purchased
                                </p>
                            </div>
                            {profile.subscription !== 'pro' && (
                                <Link href="/pricing" className="btn-secondary py-2 px-4 text-xs font-bold">
                                    Upgrade
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Images Created</span>
                            <span className="text-2xl">🎨</span>
                        </div>
                        <p className="text-3xl font-bold">{recentImages.length}</p>
                        <p className="text-sm text-foreground-muted">Total generations</p>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-foreground-muted">Current Plan</span>
                            <span className="text-2xl">⭐</span>
                        </div>
                        <p className="text-3xl font-bold capitalize">{profile.subscription}</p>
                        <p className="text-sm text-foreground-muted">
                            {profile.subscription === 'free' ? 'Upgrade for more features' : 'Premium features active'}
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4 mb-8">
                    <Link href="/generate" className="btn-primary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Create New Image
                    </Link>

                    <Link href="/gallery" className="btn-secondary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        View Gallery
                    </Link>

                    <Link href="/collections" className="btn-secondary flex items-center gap-2">
                        <span className="text-lg">📁</span>
                        My Collections
                    </Link>

                    <Link href="/league" className="btn-secondary flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        Community League
                    </Link>

                    <Link href="/analytics" className="btn-secondary flex items-center gap-2 border-accent/20 hover:border-accent/50 group transition-all">
                        <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                        Creator Analytics
                    </Link>

                    {profile.subscription === 'free' && (
                        <Link href="/pricing" className="btn-secondary flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Upgrade Plan
                        </Link>
                    )}
                </div>

                {/* Credit Costs Reference */}
                <div className="glass-card p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4">Credit Costs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">Standard</p>
                                <p className="text-sm text-foreground-muted">1024px resolution</p>
                            </div>
                            <span className="text-lg font-bold text-primary">{CREDIT_COSTS.standard} credit</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">High</p>
                                <p className="text-sm text-foreground-muted">2K resolution</p>
                            </div>
                            <span className="text-lg font-bold text-primary">{CREDIT_COSTS.high} credits</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                            <div>
                                <p className="font-medium">Ultra</p>
                                <p className="text-sm text-foreground-muted">4K resolution (Pro only)</p>
                            </div>
                            <span className="text-lg font-bold text-accent">{CREDIT_COSTS.ultra} credits</span>
                        </div>
                    </div>
                </div>

                {/* Latest Community Activity Widget */}
                {recentLeagueEntries.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🔥</span>
                                <h2 className="text-xl font-bold">Community Pulse</h2>
                            </div>
                            <Link href="/league" className="text-sm text-primary font-bold hover:underline">
                                View All Activity →
                            </Link>
                        </div>

                        {loadingLeague ? (
                            <div className="flex gap-4 overflow-hidden">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-48 h-32 bg-background-secondary animate-pulse rounded-xl flex-shrink-0" />
                                ))}
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                {recentLeagueEntries.map((entry) => (
                                    <Link
                                        key={entry.id}
                                        href={`/league?entry=${entry.id}`}
                                        className="flex-shrink-0 w-64 group snap-start"
                                    >
                                        <div className="aspect-video rounded-xl overflow-hidden relative mb-2 border border-border/50">
                                            <img
                                                src={entry.imageUrl}
                                                alt={entry.prompt || 'Community Entry'}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                <div className="text-white text-xs font-medium truncate w-full">
                                                    by {entry.authorName}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-foreground-muted line-clamp-1 group-hover:text-foreground transition-colors">
                                            {entry.prompt}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Credit History Accordion */}
                <section className="mb-12">
                    <button
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="w-full flex items-center justify-between p-6 glass-card rounded-2xl hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold">Credit Activity</h3>
                                <p className="text-xs text-foreground-muted">View your recent credit usage and transactions</p>
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg bg-background-secondary border border-border transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>

                    <div className={`transition-all duration-500 overflow-hidden ${isHistoryExpanded ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                        {loadingHistory ? (
                            <div className="flex justify-center py-8">
                                <div className="spinner" />
                            </div>
                        ) : creditHistory.length === 0 ? (
                            <div className="card text-center py-8 text-foreground-muted">
                                No recent credit activity
                            </div>
                        ) : (
                            <div className="glass-card overflow-hidden">
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-background-secondary/50 sticky top-0 z-10">
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Preview</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {creditHistory.map((tx) => {
                                                // Try to find a matching image for this usage
                                                const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate().getTime() : new Date(tx.createdAt).getTime();
                                                const metadataImage = tx.metadata?.imageUrl;
                                                const matchingImage = metadataImage ? { imageUrl: metadataImage } : (tx.type === 'usage' ? recentImages.find(img => {
                                                    const imgDate = img.createdAt?.toDate ? img.createdAt.toDate().getTime() : new Date(img.createdAt as any).getTime();
                                                    // Match within 10 second tolerance
                                                    return Math.abs(imgDate - txDate) < 10000;
                                                }) : null);

                                                return (
                                                    <tr key={tx.id} className="hover:bg-background-secondary/30 transition-colors">
                                                        <td className="px-6 py-4 text-sm text-foreground-muted whitespace-nowrap">
                                                            {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {matchingImage ? (
                                                                <img
                                                                    src={matchingImage.imageUrl}
                                                                    alt="Generation preview"
                                                                    className="w-10 h-10 rounded object-cover border border-border"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded bg-background-secondary border border-border flex items-center justify-center text-lg">
                                                                    {tx.type === 'usage' ? '🎨' : '💎'}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-sm font-medium">
                                                            <p className="line-clamp-1">{tx.description}</p>
                                                            {tx.type === 'usage' && tx.metadata?.quality && (
                                                                <span className="mt-1 inline-block px-1.5 py-0.5 bg-background-secondary border border-border rounded text-[10px] uppercase">
                                                                    {tx.metadata.quality}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                                                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Images */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold">Recent Creations</h2>
                            <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50">
                                <button
                                    onClick={() => toggleSelectionMode()}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${selectionMode
                                        ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Select
                                </button>
                                <div className="w-px h-4 bg-border mx-1 self-center" />
                                <button
                                    onClick={() => setIsGrouped(false)}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${!isGrouped
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Grid
                                </button>
                                <button
                                    onClick={() => setIsGrouped(true)}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${isGrouped
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    Grouped
                                </button>
                            </div>
                        </div>
                        {recentImages.length > 0 && (
                            <Link href="/gallery" className="text-primary hover:text-primary-hover transition-colors font-medium">
                                View All →
                            </Link>
                        )}
                    </div>

                    {loadingImages ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner" />
                        </div>
                    ) : recentImages.length === 0 ? (
                        <div className="card text-center py-16">
                            <div className="text-6xl mb-4">🎨</div>
                            <h3 className="text-xl font-semibold mb-2">No images yet</h3>
                            <p className="text-foreground-muted mb-6">Create your first AI-generated masterpiece!</p>
                            <Link href="/generate" className="btn-primary inline-block">
                                Start Creating
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {isGrouped ? (
                                Object.entries(groupImagesByPromptSet(recentImages)).map(([key, groupImages]) => {
                                    const mainImage = groupImages[0];
                                    const isStack = groupImages.length > 1;

                                    const groupIds = groupImages.map(img => img.id);
                                    const isAnySelected = groupIds.some(id => selectedIds.has(id));
                                    const isAllSelected = groupIds.every(id => selectedIds.has(id));

                                    return (
                                        <div
                                            key={key}
                                            onClick={() => selectionMode ? toggleImageGroupSelection(groupIds) : router.push('/gallery')}
                                            className={`card group cursor-pointer overflow-hidden p-0 relative transition-all ${isStack ? 'hover:-translate-y-1' : ''} ${isAnySelected ? 'ring-2 ring-accent' : ''}`}
                                        >
                                            {selectionMode && (
                                                <div className="absolute top-2 left-2 z-20">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isAllSelected ? 'bg-accent border-accent' : isAnySelected ? 'bg-accent/40 border-accent' : 'bg-black/20 border-white/50'}`}>
                                                        {isAnySelected && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                                <path d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {isStack && (
                                                <>
                                                    <div className="absolute top-1 left-1 right-1 h-full bg-background-secondary border border-border rounded-2xl -z-10 translate-y-2 opacity-50" />
                                                    <div className="absolute top-1 left-2 right-2 h-full bg-background-tertiary border border-border rounded-2xl -z-20 translate-y-4 opacity-30" />
                                                    <div className="absolute top-2 right-2 z-10 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                        {groupImages.length} images
                                                    </div>
                                                </>
                                            )}
                                            <div className="aspect-[4/3] bg-background-secondary overflow-hidden">
                                                <img
                                                    src={mainImage.imageUrl}
                                                    alt={mainImage.prompt.slice(0, 50)}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <p className="text-sm line-clamp-2">{mainImage.prompt}</p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-xs text-foreground-muted font-sans">
                                                        {mainImage.settings.quality} • {mainImage.settings.aspectRatio}
                                                    </p>
                                                    {!selectionMode && <ShareButtons imageUrl={mainImage.imageUrl} prompt={mainImage.prompt} className="scale-75 origin-right" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                recentImages.map((image) => (
                                    <div
                                        key={image.id}
                                        onClick={() => selectionMode ? toggleImageSelection(image.id) : router.push('/gallery')}
                                        className={`card group cursor-pointer overflow-hidden p-0 relative transition-all ${selectedIds.has(image.id) ? 'ring-2 ring-accent' : ''}`}
                                    >
                                        {selectionMode && (
                                            <div className="absolute top-2 left-2 z-20">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(image.id) ? 'bg-accent border-accent' : 'bg-black/20 border-white/50'}`}>
                                                    {selectedIds.has(image.id) && (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                            <path d="M20 6L9 17l-5-5" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="aspect-[4/3] bg-background-secondary overflow-hidden">
                                            <img
                                                src={image.imageUrl}
                                                alt={image.prompt.slice(0, 50)}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <p className="text-sm line-clamp-2">{image.prompt}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-xs text-foreground-muted font-sans">
                                                    {image.settings.quality} • {image.settings.aspectRatio}
                                                </p>
                                                {!selectionMode && <ShareButtons imageUrl={image.imageUrl} prompt={image.prompt} className="scale-75 origin-right" />}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Floating Bulk Actions Bar */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="glass-card flex items-center gap-6 px-6 py-4 shadow-2xl border-primary/20">
                    <div className="flex items-center gap-3 pr-6 border-r border-border">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                            {selectedIds.size}
                        </span>
                        <span className="text-sm font-semibold">Selected</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSelectAll}
                            className="btn-secondary text-xs px-3 py-2"
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="btn-secondary text-xs px-3 py-2"
                        >
                            Clear
                        </button>
                        <div className="w-px h-6 bg-border mx-2" />

                        <button
                            onClick={() => setIsCollectionModalOpen(true)}
                            className="btn-secondary text-xs px-3 py-2 flex items-center gap-2"
                        >
                            📁 Collection
                        </button>

                        <button
                            onClick={handleBulkPublishToLeague}
                            disabled={isBulkPublishing}
                            className="btn-secondary text-xs px-3 py-2 flex items-center gap-2 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
                        >
                            {isBulkPublishing ? <div className="spinner w-3 h-3" /> : '🏆 League'}
                        </button>

                        <button
                            onClick={() => setIsTagModalOpen(true)}
                            className="btn-secondary text-xs px-3 py-2 flex items-center gap-2"
                        >
                            🏷️ Tag
                        </button>

                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="btn-primary !bg-error hover:!bg-error-hover text-xs px-4 py-2 flex items-center gap-2"
                        >
                            {isBulkDeleting ? (
                                <div className="spinner w-3 h-3" />
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                            )}
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <CollectionSelectModal
                isOpen={isCollectionModalOpen}
                onClose={() => setIsCollectionModalOpen(false)}
                onSelect={handleBulkAddToCollection}
                collections={collections}
                isProcessing={isBulkCollecting}
            />

            <BulkTagModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                onApply={handleBulkAddTags}
                isProcessing={isBulkTagging}
            />
        </div>
    );
}
