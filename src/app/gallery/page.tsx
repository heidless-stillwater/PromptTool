'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, updateDoc, increment, startAfter, QueryDocumentSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedImage, Collection } from '@/lib/types';
import Link from 'next/link';

export default function GalleryPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
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
    const [isGrouped, setIsGrouped] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GeneratedImage[] | null>(null);

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

            const fetchedImages: GeneratedImage[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as GeneratedImage));

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

    const handleLoadMore = () => {
        fetchImages(true);
    };

    // Filtered images
    const filteredImages = images.filter(img => {
        const matchesSearch = img.prompt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesQuality = filterQuality === 'all' || img.settings.quality === filterQuality;
        const matchesAspect = filterAspectRatio === 'all' || img.settings.aspectRatio === filterAspectRatio;
        const matchesCollection = !selectedCollectionId || img.collectionId === selectedCollectionId;
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
        } catch (error: any) {
            console.error('Error creating collection:', error);
            setCollectionError(error.message || 'Failed to create collection. Please try again.');
        } finally {
            setCreatingCollection(false);
        }
    };

    const handleMoveToCollection = async (imageId: string, collectionId: string | null) => {
        if (!user) return;
        try {
            const imageRef = doc(db, 'users', user.uid, 'images', imageId);
            await updateDoc(imageRef, { collectionId: collectionId || null });

            // Update local state
            setImages(prev => prev.map(img =>
                img.id === imageId ? { ...img, collectionId: collectionId || undefined } : img
            ));

            if (selectedImage?.id === imageId) {
                setSelectedImage(prev => prev ? { ...prev, collectionId: collectionId || undefined } : null);
            }

            // Update collection image counts (optional/simplified)
            fetchCollections();
        } catch (error) {
            console.error('Error moving image:', error);
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
                                            <label className="text-xs text-primary font-bold uppercase tracking-wide block">Add to Collection</label>
                                            <select
                                                value={selectedImage.collectionId || ''}
                                                onChange={(e) => handleMoveToCollection(selectedImage.id, e.target.value || null)}
                                                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                            >
                                                <option value="">None / All Images</option>
                                                {collections.map(col => (
                                                    <option key={col.id} value={col.id}>{col.name}</option>
                                                ))}
                                            </select>
                                            {collections.length === 0 && (
                                                <p className="text-[10px] text-foreground-muted italic">Create a collection in the sidebar first.</p>
                                            )}
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
                        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-md">
                            <div>
                                <h3 className="font-bold text-lg">Group Details</h3>
                                <p className="text-xs text-foreground-muted">
                                    {selectedGroup.length} images in this batch
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="p-2 hover:bg-background-secondary rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
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
