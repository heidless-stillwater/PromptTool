'use client';

import { useAuth } from '@/lib/auth-context';
import { Collection, GeneratedImage } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
    doc, getDoc, collection, query, where, orderBy, getDocs,
    updateDoc, deleteDoc, serverTimestamp, arrayRemove,
    deleteField, arrayUnion, increment
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import ShareButtons from '@/components/ShareButtons';
import CollectionSelectModal from '@/components/CollectionSelectModal';

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const [collectionData, setCollectionData] = useState<Collection | null>(null);
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isProcessingMove, setIsProcessingMove] = useState(false);
    const [userCollections, setUserCollections] = useState<Collection[]>([]);

    const collectionId = params.id;

    // Fetch primary data
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // 1. Fetch Collection Metadata
                const colRef = doc(db, 'users', user.uid, 'collections', collectionId);
                const colSnap = await getDoc(colRef);

                if (!colSnap.exists()) {
                    showToast('Collection not found', 'error');
                    router.push('/collections');
                    return;
                }

                const colData = { id: colSnap.id, ...colSnap.data() } as Collection;
                setCollectionData(colData);
                setNewName(colData.name);

                // 2. Fetch Images (Dual Query for compatibility)
                const imagesRef = collection(db, 'users', user.uid, 'images');
                const [snapArray, snapLegacy] = await Promise.all([
                    getDocs(query(imagesRef, where('collectionIds', 'array-contains', collectionId))),
                    getDocs(query(imagesRef, where('collectionId', '==', collectionId)))
                ]);

                const imageMap = new Map();
                snapArray.docs.forEach(d => imageMap.set(d.id, { id: d.id, ...d.data() }));
                snapLegacy.docs.forEach(d => imageMap.set(d.id, { id: d.id, ...d.data() }));

                const fetchedImages = Array.from(imageMap.values()) as GeneratedImage[];
                fetchedImages.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

                setImages(fetchedImages);
            } catch (error) {
                console.error('Fetch error:', error);
                showToast('Failed to load collection', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (user) fetchData();
        else if (!loading) setIsLoading(false);
    }, [user, loading, collectionId, router, showToast]);

    // Handle Tags
    const handleAddTags = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!tagInput.trim() || !user || !collectionId) return;

        const newTags = tagInput.split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        if (newTags.length === 0) return;

        setIsUpdatingTags(true);
        try {
            const docRef = doc(db, 'users', user.uid, 'collections', collectionId);
            await updateDoc(docRef, {
                tags: arrayUnion(...newTags),
                updatedAt: serverTimestamp()
            });

            setCollectionData(prev => {
                if (!prev) return null;
                const existing = prev.tags || [];
                return { ...prev, tags: Array.from(new Set([...existing, ...newTags])) };
            });
            setTagInput('');
            showToast('Tags updated', 'success');
        } catch (err) {
            console.error('Tag add error:', err);
            showToast('Failed to add tags', 'error');
        } finally {
            setIsUpdatingTags(false);
        }
    };

    const handleRemoveTag = async (tag: string) => {
        if (!user || !collectionId) return;
        setIsUpdatingTags(true);
        try {
            const docRef = doc(db, 'users', user.uid, 'collections', collectionId);
            await updateDoc(docRef, {
                tags: arrayRemove(tag),
                updatedAt: serverTimestamp()
            });
            setCollectionData(prev => prev ? { ...prev, tags: (prev.tags || []).filter(t => t !== tag) } : null);
        } catch (err) {
            console.error('Tag remove error:', err);
        } finally {
            setIsUpdatingTags(false);
        }
    };

    // Actions
    const handleRename = async () => {
        if (!user || !newName.trim()) return;
        try {
            await updateDoc(doc(db, 'users', user.uid, 'collections', collectionId), {
                name: newName.trim(),
                updatedAt: serverTimestamp()
            });
            setCollectionData(prev => prev ? { ...prev, name: newName.trim() } : null);
            setIsRenaming(false);
        } catch (err) {
            showToast('Rename failed', 'error');
        }
    };

    const handleTogglePrivacy = async () => {
        if (!user || !collectionData) return;
        const newPrivacy = collectionData.privacy === 'public' ? 'private' : 'public';
        try {
            await updateDoc(doc(db, 'users', user.uid, 'collections', collectionId), {
                privacy: newPrivacy,
                updatedAt: serverTimestamp()
            });
            setCollectionData(prev => prev ? { ...prev, privacy: newPrivacy } : null);
        } catch (err) {
            showToast('Privacy update failed', 'error');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this collection?') || !user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'collections', collectionId));
            router.push('/collections');
        } catch (err) {
            showToast('Delete failed', 'error');
        }
    };

    // Selection
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRemoveImages = async () => {
        if (!user || selectedIds.size === 0) return;
        if (!window.confirm(`Remove ${selectedIds.size} images?`)) return;

        setIsRemoving(true);
        try {
            await Promise.all(Array.from(selectedIds).map(async id => {
                const imgRef = doc(db, 'users', user.uid, 'images', id);
                await updateDoc(imgRef, { collectionIds: arrayRemove(collectionId) });
            }));

            setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
            setCollectionData(prev => prev ? { ...prev, imageCount: Math.max(0, prev.imageCount - selectedIds.size) } : null);
            setSelectedIds(new Set());
            setSelectionMode(false);
            showToast('Images removed', 'success');
        } catch (err) {
            showToast('Failed to remove images', 'error');
        } finally {
            setIsRemoving(false);
        }
    };

    // ... Other functions (fetchOtherCollections, handleMoveImages, handleSetCover) omitted for brevity or implemented cleanly below
    const fetchOtherCollections = async () => {
        if (!user) return;
        const snapshot = await getDocs(query(collection(db, 'users', user.uid, 'collections'), orderBy('createdAt', 'desc')));
        setUserCollections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Collection)).filter(c => c.id !== collectionId));
    };

    const handleMoveImages = async (targetId: string) => {
        if (!user || selectedIds.size === 0) return;
        setIsProcessingMove(true);
        try {
            await Promise.all(Array.from(selectedIds).map(async id => {
                const imgRef = doc(db, 'users', user.uid, 'images', id);
                await updateDoc(imgRef, { collectionIds: arrayUnion(targetId) });
                await updateDoc(imgRef, { collectionIds: arrayRemove(collectionId) });
            }));

            await updateDoc(doc(db, 'users', user.uid, 'collections', targetId), { imageCount: increment(selectedIds.size) });
            await updateDoc(doc(db, 'users', user.uid, 'collections', collectionId), { imageCount: increment(-selectedIds.size) });

            setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
            setCollectionData(prev => prev ? { ...prev, imageCount: Math.max(0, prev.imageCount - selectedIds.size) } : null);
            setIsMoveModalOpen(false);
            setSelectedIds(new Set());
            setSelectionMode(false);
            showToast('Images moved', 'success');
        } catch (err) {
            showToast('Move failed', 'error');
        } finally {
            setIsProcessingMove(false);
        }
    };

    const handleSetCover = async (url: string) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid, 'collections', collectionId), { coverImageUrl: url });
            setCollectionData(prev => prev ? { ...prev, coverImageUrl: url } : null);
            showToast('Cover updated', 'success');
        } catch (err) {
            showToast('Cover update failed', 'error');
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (!collectionData) return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Not Found</h1><Link href="/collections" className="text-primary">Back</Link></div>;

    return (
        <div className="min-h-screen max-w-7xl mx-auto px-4 py-8">
            <Link href="/collections" className="text-sm text-foreground-muted hover:text-primary mb-6 inline-block">← Back</Link>

            <header className="mb-8 p-6 glass-card rounded-2xl relative">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                        {isRenaming ? (
                            <div className="flex gap-2 mb-2">
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="bg-background border border-primary px-2 py-1 rounded text-xl font-bold" autoFocus />
                                <button onClick={handleRename} className="btn-primary py-1 px-4">Save</button>
                                <button onClick={() => setIsRenaming(false)} className="btn-secondary py-1 px-4">Cancel</button>
                            </div>
                        ) : (
                            <div className="group flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{collectionData.name}</h1>
                                <button onClick={() => setIsRenaming(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                            </div>
                        )}

                        <div className="flex gap-3 text-[10px] font-extrabold uppercase tracking-widest mb-4">
                            <span className="bg-background-secondary border border-border px-3 py-1 rounded-full text-foreground-muted">{images.length} Items</span>
                            <span className={`px-3 py-1 rounded-full border ${collectionData.privacy === 'public' ? 'bg-success/20 text-success border-success/30' : 'bg-black/40 text-foreground border-white/10'}`}>
                                {collectionData.privacy === 'public' ? '🌍 Public' : '🔒 Private'}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {collectionData.tags?.map(t => (
                                <div key={t} className="flex items-center">
                                    <button
                                        onClick={() => router.push(`/gallery?tag=${t}`)}
                                        className="bg-primary/20 text-primary text-[10px] font-bold px-2.5 py-1 rounded-l-full border border-primary/30 border-r-0 hover:bg-primary hover:text-white transition-all cursor-pointer"
                                    >
                                        #{t}
                                    </button>
                                    <button
                                        onClick={() => handleRemoveTag(t)}
                                        className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-r-full border border-primary/30 hover:bg-error hover:text-white hover:border-error transition-all cursor-pointer"
                                        title="Remove tag"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <form onSubmit={handleAddTags} className="flex gap-1">
                                <input
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    placeholder="Add tags (comma separated)..."
                                    className="bg-black/40 border border-white/20 rounded-full px-3 py-1 text-[10px] w-48 focus:w-64 transition-all outline-none focus:border-primary"
                                />
                                <button type="submit" disabled={isUpdatingTags} className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full hover:bg-primary-hover transition-colors">Add</button>
                            </form>
                        </div>
                    </div>

                    <div className="flex gap-3 h-fit">
                        <button onClick={handleTogglePrivacy} className="btn-secondary text-xs px-4 py-2">{collectionData.privacy === 'public' ? 'Make Private' : 'Make Public'}</button>
                        <button onClick={handleDelete} className="btn-secondary text-xs px-4 py-2 text-error hover:bg-error/10 border-error/20">Delete</button>
                    </div>
                </div>
            </header>

            {images.length > 0 && (
                <div className="sticky top-20 z-40 bg-background/80 backdrop-blur-md py-4 border-b border-border/50 mb-6 flex justify-between items-center -mx-4 px-4">
                    <div className="flex gap-4 items-center">
                        <button onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }} className={`px-4 py-2 rounded-lg text-sm font-bold ${selectionMode ? 'bg-primary text-white' : 'bg-background-secondary hover:bg-background-tertiary'}`}>
                            {selectionMode ? 'Done Selecting' : 'Select Images'}
                        </button>
                        {selectionMode && selectedIds.size > 0 && (
                            <div className="flex gap-3">
                                <button onClick={handleRemoveImages} disabled={isRemoving} className="bg-error text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                    {isRemoving ? <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" /> : '🗑️'} Remove
                                </button>
                                <button onClick={() => { fetchOtherCollections(); setIsMoveModalOpen(true); }} className="bg-background-tertiary text-foreground px-4 py-2 rounded-lg text-sm font-bold border border-border">📦 Move To</button>
                            </div>
                        )}
                    </div>
                    <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">+ Add More</Link>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {images.map(img => (
                    <div key={img.id} onClick={() => selectionMode && toggleSelection(img.id)} className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all ${selectionMode && selectedIds.has(img.id) ? 'ring-4 ring-primary scale-95' : 'hover:scale-[1.02] shadow-xl'}`}>
                        {selectionMode && (
                            <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 border-white/50 bg-black/20 flex items-center justify-center">
                                {selectedIds.has(img.id) && <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
                            </div>
                        )}
                        <img src={img.imageUrl} className="aspect-[4/3] w-full object-cover bg-background-secondary" alt="" />
                        {!selectionMode && (
                            <>
                                {collectionData.coverImageUrl === img.imageUrl && (
                                    <div className="absolute top-3 right-3 z-10 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-primary-light">
                                        ★ Current Cover
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                    <p className="text-white text-xs line-clamp-2 mb-4 font-medium">{img.prompt}</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSetCover(img.imageUrl); }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${collectionData.coverImageUrl === img.imageUrl
                                                ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                                }`}
                                        >
                                            {collectionData.coverImageUrl === img.imageUrl ? '✓ Current Cover' : '🖼️ Set as Cover'}
                                        </button>
                                        <ShareButtons imageUrl={img.imageUrl} prompt={img.prompt} className="scale-90 origin-right" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <CollectionSelectModal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} onSelect={handleMoveImages} collections={userCollections} isProcessing={isProcessingMove} title="Move Images" />
        </div>
    );
}
