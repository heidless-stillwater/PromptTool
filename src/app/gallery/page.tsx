'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, updateDoc, increment, startAfter, QueryDocumentSnapshot, addDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage, Collection } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function GalleryPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterQuality, setFilterQuality] = useState<'all' | 'standard' | 'high' | 'ultra'>('all');
    const [filterAspectRatio, setFilterAspectRatio] = useState<string>('all');

    // Collections
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [showCreateCollection, setShowCreateCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [collectionError, setCollectionError] = useState('');

    // Grouping
    const [isGrouped, setIsGrouped] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<GeneratedImage[] | null>(null);
    const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);

    // Editing PromptSetID
    const [isEditingPromptSetID, setIsEditingPromptSetID] = useState(false);
    const [editingPromptSetID, setEditingPromptSetID] = useState('');

    // League publishing
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [isSavingPromptSetID, setIsSavingPromptSetID] = useState(false);

    // Group images helper
    const groupImagesByPromptSet = (images: GeneratedImage[]) => {
        const groups: Record<string, GeneratedImage[]> = {};

        images.forEach(img => {
            // Use promptSetID if available, otherwise use 'ungrouped' prefix with random ID to keep them separate
            // or better yet, just group them by ID if no set ID (effectively single items)
            // But requirement says: "if group only contains one image then go directly to 'Image Details'"

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

    // Fetch images (Initial & Load More)
    const fetchImages = async (isLoadMore = false) => {
        if (!user) return;

        try {
            if (isLoadMore) {
                setLoadingMore(true);
            } else {
                setLoadingImages(true);
            }

            const imagesRef = collection(db, 'users', user.uid, 'images');
            let q = query(imagesRef, orderBy('createdAt', 'desc'), limit(24));

            if (isLoadMore && lastVisible) {
                q = query(imagesRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(24));
            }

            const snapshot = await getDocs(q);

            // Update last visible for pagination
            const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            setLastVisible(lastVisibleDoc);
            setHasMore(snapshot.docs.length === 24);

            const fetchedImages: GeneratedImage[] = snapshot.docs.map(doc => {
                const data = doc.data() as GeneratedImage;
                // Backfill collectionIds for legacy data ONLY if it's undefined
                // If it is [], it means the user explicitly removed all collections
                if (data.collectionId && data.collectionIds === undefined) {
                    data.collectionIds = [data.collectionId];
                }
                return {
                    ...data,
                    id: doc.id,
                    collectionIds: data.collectionIds || [],
                };
            });

            if (isLoadMore) {
                setImages(prev => [...prev, ...fetchedImages]);
            } else {
                setImages(fetchedImages);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoadingImages(false);
            setLoadingMore(false);
        }
    };

    // Fetch collections
    const fetchCollections = async () => {
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
            console.error('Error fetching collections:', error);
        }
    };

    // Initial load
    useEffect(() => {
        if (user) {
            fetchImages();
            fetchCollections();
        }
    }, [user]);

    // Sync editing state when image changes
    useEffect(() => {
        if (selectedImage) {
            setEditingPromptSetID(selectedImage.promptSetID || '');
            setIsEditingPromptSetID(false);
        }
    }, [selectedImage]);

    const handleLoadMore = () => {
        fetchImages(true);
    };

    // Filtered images
    const filteredImages = images.filter(img => {
        const matchesSearch = img.prompt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesQuality = filterQuality === 'all' || img.settings.quality === filterQuality;
        const matchesAspect = filterAspectRatio === 'all' || img.settings.aspectRatio === filterAspectRatio;

        // Collection filter:
        // Prioritize collectionIds array if it exists (even if empty)
        // Only fallback to legacy collectionId if collectionIds is truly missing
        const matchesCollection = !selectedCollectionId ||
            (img.collectionIds ? img.collectionIds.includes(selectedCollectionId) : (img.collectionId === selectedCollectionId));

        return matchesSearch && matchesQuality && matchesAspect && matchesCollection;
    });

    // Handle image download
    const handleDownload = async (image: GeneratedImage, format: 'png' | 'jpeg' = 'png') => {
        try {
            console.log('[Gallery] Initiating download for image:', image.id);
            const filename = `studio-image-${image.id}.${format}`;

            // Use server-side proxy to force 'attachment' and bypass CORS
            const proxyUrl = `/api/download?url=${encodeURIComponent(image.imageUrl)}&filename=${encodeURIComponent(filename)}`;

            const link = document.createElement('a');
            link.href = proxyUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Update download count
            if (user) {
                const imageRef = doc(db, 'users', user.uid, 'images', image.id);
                await updateDoc(imageRef, {
                    downloadCount: increment(1),
                });
            }
            console.log('[Gallery] Download triggered successfully via proxy');
        } catch (error) {
            console.error('[Gallery] Download error:', error);
            // Fallback
            window.open(image.imageUrl, '_blank');
        }
    };

    // Handle image deletion
    // League publish/unpublish handler
    const handleLeagueToggle = async (image: GeneratedImage) => {
        if (!user) return;
        const action = image.publishedToLeague ? 'unpublish' : 'publish';
        if (action === 'unpublish' && !confirm('Remove this image from the Community League?')) return;

        setPublishingId(image.id);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/league/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ imageId: image.id, action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Update local state
            const updater = (img: GeneratedImage) => {
                if (img.id !== image.id) return img;
                return {
                    ...img,
                    publishedToLeague: action === 'publish',
                    leagueEntryId: action === 'publish' ? data.leagueEntryId : undefined,
                };
            };
            setImages(prev => prev.map(updater));
            setSelectedImage(prev => prev ? updater(prev) : null);
            if (selectedGroup) {
                setSelectedGroup(prev => prev ? prev.map(updater) : null);
            }

            showToast(
                action === 'publish' ? '🏆 Published to Community League!' : 'Removed from Community League',
                'success'
            );
        } catch (error: any) {
            console.error('[Gallery] League toggle error:', error);
            showToast(error.message || 'Failed to update league status', 'error');
        } finally {
            setPublishingId(null);
        }
    };

    const handleDelete = async (imageId: string) => {
        if (!user || !confirm('Are you sure you want to delete this image?')) return;

        setDeletingId(imageId);
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'images', imageId));
            setImages(images.filter(img => img.id !== imageId));
            if (selectedImage?.id === imageId) {
                setSelectedImage(null);
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateCollection = async () => {
        if (!user || !newCollectionName.trim()) return;
        setCreatingCollection(true);
        setCollectionError('');
        try {
            console.log('[Gallery] Creating collection:', newCollectionName);
            const colRef = collection(db, 'users', user.uid, 'collections');
            const newColData = {
                userId: user.uid,
                name: newCollectionName.trim(),
                imageCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            const docRef = await addDoc(colRef, newColData);

            // For local state, use a real timestamp so UI doesn't crash if it expects a Date
            const localCol: Collection = {
                id: docRef.id,
                userId: user.uid,
                name: newCollectionName.trim(),
                imageCount: 0,
                createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
                updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
            };

            setCollections(prev => [localCol, ...prev]);
            setNewCollectionName('');
            setShowCreateCollection(false);
            showToast(`Collection "${newColData.name}" created`, 'success');
        } catch (error: any) {
            console.error('Error creating collection:', error);
            setCollectionError(error.message || 'Failed to create collection. Please try again.');
            setCreatingCollection(false);
            showToast('Failed to create collection', 'error');
        }
    };

    const handleToggleCollection = async (imageId: string, collectionId: string) => {
        if (!user) return;

        // Optimistic update
        const image = images.find(img => img.id === imageId);
        if (!image) return;

        const currentIds = image.collectionIds || [];
        // Legacy fallback only if collectionIds is missing
        if (!image.collectionIds && image.collectionId) {
            currentIds.push(image.collectionId);
        }

        const isAdding = !currentIds.includes(collectionId);
        let newIds: string[];

        if (isAdding) {
            newIds = [...currentIds, collectionId];
        } else {
            newIds = currentIds.filter(id => id !== collectionId);
        }

        try {
            // Update local state immediately
            setImages(prev => prev.map(img =>
                img.id === imageId ? { ...img, collectionIds: newIds, collectionId: undefined } : img
            ));

            if (selectedImage?.id === imageId) {
                setSelectedImage(prev => prev ? { ...prev, collectionIds: newIds, collectionId: undefined } : null);
            }

            const imageRef = doc(db, 'users', user.uid, 'images', imageId);

            await updateDoc(imageRef, {
                collectionIds: newIds,
                collectionId: deleteField() // Correct way to remove field in Firestore
            });

            fetchCollections();
            showToast(isAdding ? 'Added to collection' : 'Removed from collection', 'success');

        } catch (error) {
            console.error('Error toggling collection:', error);
            showToast('Failed to update collection', 'error');
        }
    };

    const handleBatchToggleCollection = async (batchImages: GeneratedImage[], collectionId: string) => {
        if (!user || !batchImages.length) return;

        const allIn = batchImages.every(img => (img.collectionIds || []).includes(collectionId));
        const isAdding = !allIn;

        try {
            const batchPromises = batchImages.map(img => {
                const currentIds = img.collectionIds || [];
                // Legacy fallback only if missing
                if (!img.collectionIds && img.collectionId) {
                    currentIds.push(img.collectionId);
                }

                let newIds: string[];
                if (isAdding) {
                    newIds = currentIds.includes(collectionId) ? currentIds : [...currentIds, collectionId];
                } else {
                    newIds = currentIds.filter(id => id !== collectionId);
                }

                const imageRef = doc(db, 'users', user.uid, 'images', img.id);
                return updateDoc(imageRef, {
                    collectionIds: newIds,
                    collectionId: deleteField() // Clear legacy field
                });
            });

            await Promise.all(batchPromises);

            // Update local state
            setImages(prev => prev.map(img => {
                const isInBatch = batchImages.some(b => b.id === img.id);
                if (!isInBatch) return img;

                const currentIds = img.collectionIds || [];
                if (!img.collectionIds && img.collectionId) currentIds.push(img.collectionId);

                let newIds: string[];
                if (isAdding) {
                    newIds = currentIds.includes(collectionId) ? currentIds : [...currentIds, collectionId];
                } else {
                    newIds = currentIds.filter(id => id !== collectionId);
                }

                return { ...img, collectionIds: newIds, collectionId: undefined };
            }));

            // Update selectedGroup
            setSelectedGroup(prev => {
                if (!prev) return null;
                return prev.map(img => {
                    const currentIds = img.collectionIds || [];
                    if (!img.collectionIds && img.collectionId) currentIds.push(img.collectionId);
                    let newIds: string[];
                    if (isAdding) {
                        newIds = currentIds.includes(collectionId) ? currentIds : [...currentIds, collectionId];
                    } else {
                        newIds = currentIds.filter(id => id !== collectionId);
                    }
                    return { ...img, collectionIds: newIds, collectionId: undefined };
                });
            });

            fetchCollections();
            showToast(isAdding ? `Added ${batchImages.length} images to collection` : `Removed ${batchImages.length} images from collection`, 'success');
        } catch (error) {
            console.error('Error batch toggling collection:', error);
            showToast('Failed to update collections', 'error');
        }
    };

    const handleUpdatePromptSetID = async () => {
        if (!user || !selectedImage) return;

        setIsSavingPromptSetID(true);
        try {
            const cleanID = editingPromptSetID.trim();
            const imageRef = doc(db, 'users', user.uid, 'images', selectedImage.id);

            await updateDoc(imageRef, {
                promptSetID: cleanID || deleteField()
            });

            // Update local state
            const updatedImage = { ...selectedImage, promptSetID: cleanID || undefined };
            setImages(prev => prev.map(img => img.id === selectedImage.id ? updatedImage : img));
            setSelectedImage(updatedImage);

            setIsEditingPromptSetID(false);
            showToast('Prompt Set ID updated', 'success');
        } catch (error) {
            console.error('Error updating promptSetID:', error);
            showToast('Failed to update Prompt Set ID', 'error');
        } finally {
            setIsSavingPromptSetID(false);
        }
    };


    // Format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/generate" className="btn-primary text-sm px-4 py-2">
                            + Generate New
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left: Collections Sidebar */}
                    <aside className="w-full lg:w-64 space-y-6">
                        <div className="glass-card p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-lg">Collections</h2>
                                <button
                                    onClick={() => setShowCreateCollection(true)}
                                    className="p-1 px-2 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-bold transition-all"
                                >
                                    + New
                                </button>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedCollectionId(null)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${!selectedCollectionId ? 'bg-primary text-white font-bold' : 'hover:bg-background-secondary text-foreground-muted hover:text-foreground'}`}
                                >
                                    All Images
                                </button>
                                {collections.map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => setSelectedCollectionId(col.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${selectedCollectionId === col.id ? 'bg-primary text-white font-bold' : 'hover:bg-background-secondary text-foreground-muted hover:text-foreground'}`}
                                    >
                                        <span className="truncate">{col.name}</span>
                                        {col.imageCount > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCollectionId === col.id ? 'bg-white/20' : 'bg-background-secondary'}`}>
                                                {col.imageCount}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Right: Content Area */}
                    <div className="flex-1 space-y-6">
                        {/* Summary info and Toolbar */}
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2 text-foreground">
                                    {selectedCollectionId
                                        ? collections.find(c => c.id === selectedCollectionId)?.name
                                        : 'Your Gallery'}
                                </h1>
                                <p className="text-foreground-muted">
                                    {filteredImages.length} images found
                                </p>
                            </div>

                            {/* Controls Toolbar */}
                            <div className="flex flex-col md:flex-row gap-4 p-4 glass-card bg-background-secondary/30 rounded-xl">
                                {/* Search */}
                                <div className="flex-1 relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="M21 21l-4.35-4.35" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search by prompt..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm text-foreground placeholder:text-foreground-muted"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex gap-4 items-center">
                                    <button
                                        onClick={() => setIsGrouped(!isGrouped)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border border-border transition-all flex items-center gap-2 ${isGrouped
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : 'bg-background-secondary text-foreground hover:bg-background-secondary/80'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {isGrouped ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                            )}
                                        </svg>
                                        {isGrouped ? 'Grouped' : 'Grid'}
                                    </button>

                                    <div className="h-6 w-px bg-border mx-2" />

                                    <select
                                        value={filterQuality}
                                        onChange={(e) => setFilterQuality(e.target.value as any)}
                                        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                    >
                                        <option value="all">All Qualities</option>
                                        <option value="standard">Standard</option>
                                        <option value="high">High</option>
                                        <option value="ultra">Ultra</option>
                                    </select>

                                    <select
                                        value={filterAspectRatio}
                                        onChange={(e) => setFilterAspectRatio(e.target.value)}
                                        className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                    >
                                        <option value="all">All Aspects</option>
                                        <option value="1:1">1:1 Square</option>
                                        <option value="16:9">16:9 Landscape</option>
                                        <option value="9:16">9:16 Portrait</option>
                                        <option value="4:3">4:3 Standard</option>
                                        <option value="3:4">3:4 Portrait</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {loadingImages ? (
                            <div className="flex justify-center py-12">
                                <div className="spinner" />
                            </div>
                        ) : images.length === 0 ? (
                            <div className="text-center py-16 glass-card rounded-2xl">
                                <div className="text-6xl mb-4 opacity-30">🎨</div>
                                <h2 className="text-xl font-semibold mb-2">No images yet</h2>
                                <p className="text-foreground-muted mb-6">
                                    Start creating your first AI-generated masterpiece!
                                </p>
                                <Link href="/generate" className="btn-primary px-6 py-3">
                                    Generate Your First Image
                                </Link>
                            </div>
                        ) : filteredImages.length === 0 ? (
                            <div className="text-center py-16 glass-card rounded-2xl">
                                <div className="text-4xl mb-4 opacity-50">🔍</div>
                                <h2 className="text-lg font-semibold mb-2">No matching images</h2>
                                <p className="text-foreground-muted">Try adjusting your filters or search terms.</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterQuality('all');
                                        setFilterAspectRatio('all');
                                        setSelectedCollectionId(null);
                                    }}
                                    className="text-primary hover:underline mt-4 font-bold"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        ) : isGrouped ? (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Object.entries(groupImagesByPromptSet(filteredImages)).map(([key, groupImages]) => {
                                        const firstImage = groupImages[0];
                                        const isSingle = groupImages.length === 1;

                                        return (
                                            <div
                                                key={key}
                                                className="group relative rounded-xl overflow-hidden bg-background-secondary cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-lg"
                                                onClick={() => {
                                                    if (isSingle) {
                                                        setSelectedImage(firstImage);
                                                    } else {
                                                        setSelectedGroup(groupImages);
                                                    }
                                                }}
                                            >
                                                {/* Stack effect for multiple images */}
                                                {!isSingle && (
                                                    <div className="absolute top-0 right-0 p-2 z-10">
                                                        <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                            </svg>
                                                            {groupImages.length}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="aspect-square relative">
                                                    {/* Background stack layers if multiple */}
                                                    {!isSingle && (
                                                        <>
                                                            <div className="absolute inset-0 bg-background-secondary translate-x-1 translate-y-1 rounded-xl border border-white/10" />
                                                            <div className="absolute inset-0 bg-background-secondary translate-x-2 translate-y-2 rounded-xl border border-white/10" />
                                                        </>
                                                    )}

                                                    <img
                                                        src={firstImage.imageUrl}
                                                        alt={firstImage.prompt}
                                                        className="w-full h-full object-cover relative z-0 rounded-xl"
                                                        loading="lazy"
                                                    />
                                                    {/* League badge */}
                                                    {firstImage.publishedToLeague && (
                                                        <div className="absolute top-2 left-2 z-10 bg-yellow-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                                                            🏆 League
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Overlay on hover */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-xl">
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <p className="text-white text-sm line-clamp-2">
                                                            {firstImage.prompt}
                                                        </p>
                                                        <p className="text-white/60 text-xs mt-1">
                                                            {isSingle ? 'Single Image' : `${groupImages.length} Variations`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Load More Button */}
                                {hasMore && (
                                    <div className="mt-8 flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="btn-secondary px-8 py-3 w-full md:w-auto"
                                        >
                                            {loadingMore ? (
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    <span>Loading...</span>
                                                </div>
                                            ) : (
                                                'Load More Images'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredImages.map((image) => (
                                        <div
                                            key={image.id}
                                            className="group relative rounded-xl overflow-hidden bg-background-secondary cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-lg"
                                            onClick={() => setSelectedImage(image)}
                                        >
                                            <div className="aspect-square">
                                                <img
                                                    src={image.imageUrl}
                                                    alt={image.prompt}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>

                                            {/* Labels for variations or collections */}
                                            {image.sourceImageId && (
                                                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-accent/90 text-white text-[10px] font-bold rounded uppercase">
                                                    Variation
                                                </div>
                                            )}

                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <p className="text-white text-sm line-clamp-2">
                                                        {image.prompt}
                                                    </p>
                                                    <p className="text-white/60 text-xs mt-1">
                                                        {image.settings.quality} • {image.settings.aspectRatio}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(image.id);
                                                }}
                                                disabled={deletingId === image.id}
                                                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-error/80 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                {deletingId === image.id ? (
                                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Load More Button */}
                                {hasMore && (
                                    <div className="mt-8 flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="btn-secondary px-8 py-3 w-full md:w-auto"
                                        >
                                            {loadingMore ? (
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    <span>Loading...</span>
                                                </div>
                                            ) : (
                                                'Load More Images'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => {
                        setSelectedImage(null);
                        // If we are not in a group, we just close. 
                        // If we ARE in a group, we stay in the group (which is behind this modal in z-index theory, but we need to ensure logic flow)
                        // Actually, since this modal is conditionally rendered, closing it reveals whatever is underneath.
                        // If selectedGroup is NOT null, the Group Modal will be visible (if we structured it right).
                        // Let's check the structure.

                        // Current structure:
                        // 1. Group Modal (z-50) is rendered if selectedGroup && !selectedImage
                        // 2. Image Modal (z-50) is rendered if selectedImage

                        // So if we have selectedGroup AND selectedImage, we need to ensure Group Modal is HIDDEN or BEHIND?
                        // The logic `selectedGroup && !selectedImage` hides Group Modal when Image Details is open.
                        // So when we set selectedImage(null), the Group Modal condition becoming true again will re-render it.
                    }}
                >
                    <div
                        className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col md:flex-row min-h-0 flex-1">
                            {/* Image - Container also needs overflow-hidden to keep modal bounds */}
                            <div className="flex-1 bg-background-secondary flex items-center justify-center p-4 overflow-hidden">
                                <img
                                    src={selectedImage.imageUrl}
                                    alt={selectedImage.prompt}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                                />
                            </div>

                            {/* Details - Explicitly using min-h-0 and flex-1 with overflow */}
                            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border flex flex-col min-h-0">
                                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                    <div className="flex justify-between items-start mb-4 sticky top-0 bg-background z-10 -mx-6 px-6 pb-2">
                                        <h3 className="font-semibold">Image Details</h3>
                                        <button
                                            onClick={() => setSelectedImage(null)}
                                            className="p-1 hover:bg-background-secondary rounded-lg"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-foreground-muted uppercase tracking-wide">Prompt</label>
                                            <p className="text-sm mt-1">{selectedImage.prompt}</p>
                                        </div>

                                        {/* Move to Collection - Moved up for visibility */}
                                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs text-primary font-bold uppercase tracking-wide block">Collections</label>
                                                <span className="text-[10px] text-foreground-muted">
                                                    {(selectedImage.collectionIds?.length || (selectedImage.collectionId ? 1 : 0))} selected
                                                </span>
                                            </div>

                                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                {collections.map(col => {
                                                    const isSelected = (selectedImage.collectionIds || (selectedImage.collectionId ? [selectedImage.collectionId] : [])).includes(col.id);
                                                    return (
                                                        <label
                                                            key={col.id}
                                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors border ${isSelected
                                                                ? 'bg-primary/10 border-primary/30'
                                                                : 'hover:bg-background-secondary border-transparent'
                                                                }`}
                                                        >
                                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-foreground-muted bg-background'
                                                                }`}>
                                                                {isSelected && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <span className="text-sm truncate flex-1">{col.name}</span>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleCollection(selectedImage.id, col.id)}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                                {collections.length === 0 && (
                                                    <div className="text-xs text-foreground-muted italic text-center py-2">
                                                        No collections available.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-foreground-muted uppercase tracking-wide">Quality</label>
                                                <p className="text-sm mt-1 capitalize">{selectedImage.settings.quality}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-foreground-muted uppercase tracking-wide">Aspect</label>
                                                <p className="text-sm mt-1">{selectedImage.settings.aspectRatio}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-foreground-muted uppercase tracking-wide">Credits</label>
                                                <p className="text-sm mt-1">{selectedImage.creditsCost}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-foreground-muted uppercase tracking-wide">Downloads</label>
                                                <p className="text-sm mt-1">{selectedImage.downloadCount || 0}</p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/50">
                                            <label className="text-xs text-foreground-muted uppercase tracking-wide flex items-center justify-between">
                                                Prompt Set ID
                                                {!isEditingPromptSetID && (
                                                    <button
                                                        onClick={() => setIsEditingPromptSetID(true)}
                                                        className="text-primary hover:text-primary-hover font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </label>
                                            {isEditingPromptSetID ? (
                                                <div className="mt-2 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editingPromptSetID}
                                                        onChange={(e) => setEditingPromptSetID(e.target.value)}
                                                        placeholder="No Set ID"
                                                        className="w-full bg-background-secondary border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleUpdatePromptSetID}
                                                            disabled={isSavingPromptSetID}
                                                            className="flex-1 bg-primary text-white text-xs font-bold py-1.5 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                                                        >
                                                            {isSavingPromptSetID ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setIsEditingPromptSetID(false);
                                                                setEditingPromptSetID(selectedImage.promptSetID || '');
                                                            }}
                                                            disabled={isSavingPromptSetID}
                                                            className="px-3 bg-background-secondary text-foreground text-xs font-bold py-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm mt-1 font-mono text-foreground-muted truncate" title={selectedImage.promptSetID}>
                                                    {selectedImage.promptSetID || 'No Set ID'}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs text-foreground-muted uppercase tracking-wide">Created</label>
                                            <p className="text-sm mt-1">{formatDate(selectedImage.createdAt)}</p>
                                        </div>

                                        {/* Download buttons */}
                                        <div className="pt-4 border-t border-border space-y-2">
                                            <button
                                                onClick={() => handleDownload(selectedImage, 'png')}
                                                className="btn-primary w-full"
                                            >
                                                Download PNG
                                            </button>
                                            <button
                                                onClick={() => handleDownload(selectedImage, 'jpeg')}
                                                className="btn-secondary w-full"
                                            >
                                                Download JPEG
                                            </button>
                                        </div>

                                        {/* Edit Image button */}
                                        <button
                                            onClick={() => router.push(`/edit?imageId=${selectedImage.id}`)}
                                            className="w-full py-2 px-4 text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg transition-colors flex items-center justify-center gap-2 font-bold"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit Image
                                        </button>

                                        {/* Generate Variations button */}
                                        <button
                                            onClick={() => router.push(`/generate?ref=${selectedImage.id}`)}
                                            className="w-full py-2 px-4 text-sm bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Generate Variations
                                        </button>

                                        {/* League Publish/Unpublish button */}
                                        <button
                                            onClick={() => handleLeagueToggle(selectedImage)}
                                            disabled={publishingId === selectedImage.id}
                                            className={`w-full py-2 px-4 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold ${selectedImage.publishedToLeague
                                                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
                                                : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                                                }`}
                                        >
                                            {publishingId === selectedImage.id ? (
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span>🏆</span>
                                            )}
                                            {selectedImage.publishedToLeague ? 'Remove from League' : 'Publish to League'}
                                        </button>

                                        {/* Delete button */}
                                        <button
                                            onClick={() => handleDelete(selectedImage.id)}
                                            disabled={deletingId === selectedImage.id}
                                            className="w-full py-2 px-4 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                                        >
                                            {deletingId === selectedImage.id ? 'Deleting...' : 'Delete Image'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Modal */}
            {selectedGroup && !selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedGroup(null)}
                >
                    <div
                        className="bg-background rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with high z-index to allow dropdowns to overlap content */}
                        <div className="relative z-50 p-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-md">
                            <div>
                                <h3 className="font-bold text-lg">Group Details</h3>
                                <p className="text-xs text-foreground-muted">
                                    {selectedGroup.length} images in this batch
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {collections.filter(col =>
                                        selectedGroup.every(img => (img.collectionIds || (img.collectionId ? [img.collectionId] : [])).includes(col.id))
                                    ).map(col => (
                                        <span key={col.id} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold uppercase tracking-wider">
                                            {col.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsCollectionDropdownOpen(!isCollectionDropdownOpen)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm font-medium ${isCollectionDropdownOpen
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-background-secondary hover:bg-background-tertiary border-border'
                                            }`}
                                    >
                                        <span className={`uppercase text-xs font-bold ${isCollectionDropdownOpen ? 'text-white' : 'text-foreground-muted'}`}>Manage Collections</span>
                                        <svg className={`w-4 h-4 transition-transform ${isCollectionDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isCollectionDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsCollectionDropdownOpen(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                <div className="text-xs font-bold text-foreground-muted uppercase px-2 py-1 mb-1">Toggle Collections</div>
                                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {collections.map(col => {
                                                        // Check status for this collection across the group
                                                        const allIn = selectedGroup.every(img =>
                                                            (img.collectionIds || (img.collectionId ? [img.collectionId] : [])).includes(col.id)
                                                        );
                                                        const someIn = !allIn && selectedGroup.some(img =>
                                                            (img.collectionIds || (img.collectionId ? [img.collectionId] : [])).includes(col.id)
                                                        );

                                                        return (
                                                            <label
                                                                key={col.id}
                                                                className="flex items-center gap-3 px-2 py-2 hover:bg-background-secondary rounded-lg cursor-pointer transition-colors"
                                                            >
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allIn
                                                                    ? 'bg-primary border-primary text-white'
                                                                    : someIn
                                                                        ? 'bg-primary/50 border-primary/50 text-white'
                                                                        : 'border-foreground-muted'
                                                                    }`}>
                                                                    {allIn && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                    {someIn && <div className="w-2 h-0.5 bg-white rounded-full" />}
                                                                </div>
                                                                <span className="text-sm truncate flex-1">{col.name}</span>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={allIn}
                                                                    onChange={() => handleBatchToggleCollection(selectedGroup, col.id)}
                                                                />
                                                            </label>
                                                        );
                                                    })}
                                                    {collections.length === 0 && (
                                                        <div className="px-2 py-4 text-center text-xs text-foreground-muted italic">
                                                            No collections created yet.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Inline Create Collection */}
                                                <div className="mt-2 pt-2 border-t border-border px-1">
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="text"
                                                            placeholder="New Collection"
                                                            className="flex-1 text-xs bg-background-secondary border border-border rounded px-2 py-1 outline-none focus:border-primary text-foreground"
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                                    const name = e.currentTarget.value.trim();
                                                                    e.currentTarget.value = ''; // Clear input

                                                                    try {
                                                                        // 1. Create Collection
                                                                        const colRef = collection(db, 'users', user!.uid, 'collections');
                                                                        const newColRef = await addDoc(colRef, {
                                                                            name: name,
                                                                            createdAt: serverTimestamp(),
                                                                            imageCount: 0
                                                                        });

                                                                        // 2. Add to local state (optimistic)
                                                                        const newCol: Collection = {
                                                                            id: newColRef.id,
                                                                            name,
                                                                            userId: user!.uid,
                                                                            createdAt: { seconds: Date.now() / 1000 } as any,
                                                                            updatedAt: { seconds: Date.now() / 1000 } as any,
                                                                            imageCount: 0
                                                                        };
                                                                        setCollections(prev => [newCol, ...prev]);

                                                                        // 3. Auto-add batch to this new collection
                                                                        await handleBatchToggleCollection(selectedGroup!, newColRef.id);

                                                                        showToast(`Collection "${name}" created and images added`, 'success');

                                                                    } catch (err) {
                                                                        console.error("Error creating collection inline:", err);
                                                                        showToast('Failed to create collection', 'error');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-foreground-muted mt-1 px-1">
                                                        Press Enter to create & add
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="h-6 w-px bg-border hidden md:block" />
                                <button
                                    onClick={() => setSelectedGroup(null)}
                                    className="p-2 hover:bg-background-secondary rounded-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {selectedGroup.map((image) => (
                                    <div
                                        key={image.id}
                                        className="group relative rounded-xl overflow-hidden bg-background-secondary cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-lg"
                                        onClick={() => setSelectedImage(image)}
                                    >
                                        <div className="aspect-square">
                                            <img
                                                src={image.imageUrl}
                                                alt={image.prompt}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <p className="text-white text-xs line-clamp-1">
                                                    {image.settings.quality} • {image.settings.aspectRatio}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Collection Modal */}
            {showCreateCollection && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border">
                        <h3 className="text-lg font-bold mb-4">Create New Collection</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground-muted">Collection Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    placeholder="e.g. My Landscapes"
                                    className="w-full bg-background-secondary border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                />
                            </div>
                            {collectionError && (
                                <p className="text-sm text-error bg-error/10 p-2 rounded-lg">{collectionError}</p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowCreateCollection(false);
                                        setCollectionError('');
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-background-secondary hover:bg-background-secondary/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateCollection}
                                    disabled={creatingCollection || !newCollectionName.trim()}
                                    className="flex-1 btn-primary px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                                >
                                    {creatingCollection ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
