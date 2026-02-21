'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    updateDoc,
    doc,
    deleteField,
    increment,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { GeneratedImage, CreditTransaction, Collection } from '@/lib/types';

export function useDashboard() {
    const { user, profile, credits, loading: authLoading, signOut, switchRole, effectiveRole, setAudienceMode, isAdmin, isSu } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();

    // Data State
    const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
    const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
    const [recentLeagueEntries, setRecentLeagueEntries] = useState<any[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);

    // Loading States
    const [loadingImages, setLoadingImages] = useState(true);
    const [loadingLeague, setLoadingLeague] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isVerifyingUpgrade, setIsVerifyingUpgrade] = useState(false);

    // UX State
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isGrouped, setIsGrouped] = useState(true);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Processing States
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkPublishing, setIsBulkPublishing] = useState(false);
    const [isBulkCollecting, setIsBulkCollecting] = useState(false);
    const [isBulkTagging, setIsBulkTagging] = useState(false);

    // Modal States
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);

    // Helper: Group images
    const groupImagesByPromptSet = (images: GeneratedImage[]) => {
        const groups: Record<string, GeneratedImage[]> = {};
        images.forEach(img => {
            const key = img.promptSetID || `single-${img.id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(img);
        });
        return groups;
    };

    // Stripe Verification
    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (sessionId && user && !isVerifyingUpgrade) {
            const verifySession = async () => {
                setIsVerifyingUpgrade(true);
                showToast('Verifying your upgrade...', 'info');
                try {
                    const token = await user.getIdToken();
                    const res = await fetch('/api/stripe/verify-session/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ sessionId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast(data.alreadyProcessed ? 'Welcome back!' : 'Upgrade successful!', 'success');
                        router.replace('/dashboard');
                    }
                } catch (err) {
                    console.error('Session verification error:', err);
                    showToast('Failed to verify upgrade.', 'error');
                } finally {
                    setIsVerifyingUpgrade(false);
                }
            };
            verifySession();
        }
    }, [searchParams, user, router, showToast]);

    // Data Fetching
    useEffect(() => {
        if (!user) return;

        const fetchAll = async () => {
            // Images
            try {
                const imagesRef = collection(db, 'users', user.uid, 'images');
                const q = query(imagesRef, orderBy('createdAt', 'desc'), limit(24));
                const snap = await getDocs(q);
                setRecentImages(snap.docs.map(d => ({ id: d.id, ...d.data() } as GeneratedImage)));
            } catch (e) { console.error(e); } finally { setLoadingImages(false); }

            // League
            try {
                const entriesRef = collection(db, 'leagueEntries');
                const q = query(entriesRef, orderBy('publishedAt', 'desc'), limit(8));
                const snap = await getDocs(q);
                setRecentLeagueEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); } finally { setLoadingLeague(false); }

            // Collections
            try {
                const colRef = collection(db, 'users', user.uid, 'collections');
                const q = query(colRef, orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                setCollections(snap.docs.map(d => ({ id: d.id, ...d.data() } as Collection)));
            } catch (e) { console.error(e); }

            // History
            try {
                const historyRef = collection(db, 'users', user.uid, 'creditHistory');
                const q = query(historyRef, orderBy('createdAt', 'desc'), limit(20));
                const snap = await getDocs(q);
                setCreditHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as CreditTransaction)));
            } catch (e) { console.error(e); } finally { setLoadingHistory(false); }
        };

        fetchAll();
    }, [user]);

    // Selection Handlers
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedIds(new Set());
    };

    const toggleImageSelection = (id: string, e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleImageGroupSelection = (ids: string[], e?: React.MouseEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        const newSelected = new Set(selectedIds);
        const allSelected = ids.every(id => newSelected.has(id));
        if (allSelected) ids.forEach(id => newSelected.delete(id));
        else ids.forEach(id => newSelected.add(id));
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        setSelectedIds(new Set(recentImages.map(img => img.id)));
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (!user || selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} images?`)) return;

        setIsBulkDeleting(true);
        try {
            const collectionDecrements: Record<string, number> = {};

            await Promise.all(Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return;

                await deleteDoc(doc(db, 'users', user.uid, 'images', id));
                if (img.storagePath) {
                    try { await deleteObject(ref(storage, img.storagePath)); } catch (e) { }
                }

                if (img.collectionIds) {
                    img.collectionIds.forEach(colId => {
                        collectionDecrements[colId] = (collectionDecrements[colId] || 0) + 1;
                    });
                }
            }));

            // Stats updates
            await Promise.all(Object.entries(collectionDecrements).map(([colId, count]) =>
                updateDoc(doc(db, 'users', user.uid, 'collections', colId), {
                    imageCount: increment(-count)
                })
            ));

            setRecentImages(prev => prev.filter(img => !selectedIds.has(img.id)));
            setSelectedIds(new Set());
            setSelectionMode(false);
            showToast(`Deleted ${selectedIds.size} images`, 'success');
        } catch (err) {
            showToast('Delete failed.', 'error');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleBulkAddToCollection = async (collectionId: string) => {
        if (!user || selectedIds.size === 0) return;
        setIsBulkCollecting(true);
        try {
            let addedCount = 0;
            await Promise.all(Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return;
                const currentIds = img.collectionIds || [];
                if (!currentIds.includes(collectionId)) {
                    addedCount++;
                    const newIds = [...currentIds, collectionId];
                    await updateDoc(doc(db, 'users', user.uid, 'images', id), {
                        collectionIds: newIds,
                        collectionId: deleteField()
                    });
                    img.collectionIds = newIds;
                }
            }));

            if (addedCount > 0) {
                await updateDoc(doc(db, 'users', user.uid, 'collections', collectionId), {
                    imageCount: increment(addedCount),
                    updatedAt: serverTimestamp()
                });
            }

            setSelectedIds(new Set());
            setSelectionMode(false);
            setIsCollectionModalOpen(false);
            showToast('Added to collection', 'success');
        } catch (err) {
            showToast('Update failed.', 'error');
        } finally {
            setIsBulkCollecting(false);
        }
    };

    const handleBulkPublishToLeague = async () => {
        if (!user || selectedIds.size === 0) return;
        if (!window.confirm(`Publish ${selectedIds.size} images to League?`)) return;

        setIsBulkPublishing(true);
        try {
            const token = await user.getIdToken();
            await Promise.all(Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img || img.publishedToLeague) return;

                const res = await fetch('/api/league/publish/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ imageId: id, action: 'publish' }),
                });

                if (res.ok) {
                    const data = await res.json();
                    img.publishedToLeague = true;
                    img.leagueEntryId = data.leagueEntryId;
                }
            }));
            setSelectedIds(new Set());
            setSelectionMode(false);
            showToast('Published to League!', 'success');
        } finally {
            setIsBulkPublishing(false);
        }
    };

    const handleBulkAddTags = async (tags: string[]) => {
        if (!user || selectedIds.size === 0) return;
        setIsBulkTagging(true);
        try {
            await Promise.all(Array.from(selectedIds).map(async (id) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return;
                const newTags = Array.from(new Set([...(img.tags || []), ...tags]));
                await updateDoc(doc(db, 'users', user.uid, 'images', id), { tags: newTags });
                img.tags = newTags;
            }));
            setSelectedIds(new Set());
            setSelectionMode(false);
            setIsTagModalOpen(false);
            showToast('Tags added', 'success');
        } finally {
            setIsBulkTagging(false);
        }
    };

    return {
        // State
        user, profile, authLoading, credits, recentImages, creditHistory, recentLeagueEntries,
        collections, loadingImages, loadingLeague, loadingHistory, isHistoryExpanded,
        isGrouped, selectionMode, selectedIds, isBulkDeleting, isBulkPublishing,
        isBulkCollecting, isBulkTagging, isCollectionModalOpen, isTagModalOpen, effectiveRole,
        isAdmin, isSu,

        // Actions
        signOut, switchRole, setAudienceMode, setIsHistoryExpanded, setIsGrouped,
        toggleSelectionMode, toggleImageSelection, toggleImageGroupSelection,
        handleSelectAll, handleBulkDelete, handleBulkAddToCollection,
        handleBulkPublishToLeague, handleBulkAddTags, setIsCollectionModalOpen,
        setIsTagModalOpen, groupImagesByPromptSet, setSelectedIds, setSelectionMode
    };
}
