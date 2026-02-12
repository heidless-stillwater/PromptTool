'use client';

import { useAuth } from '@/lib/auth-context';
import { Collection } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CollectionCard from '@/components/CollectionCard';
import { useToast } from '@/components/Toast';
import GlobalSearch from '@/components/GlobalSearch';
import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

function CollectionsContent() {
    const { user, loading } = useAuth();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
            console.error('Failed to fetch collections:', error);
            showToast('Failed to load collections', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCollections();
            const q = searchParams.get('q');
            if (q) setSearchQuery(q);
        } else if (!loading) {
            setIsLoading(false);
        }
    }, [user, loading, searchParams]);

    const filteredCollections = collections.filter(col => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const nameMatch = col.name.toLowerCase().includes(query);
        const tagMatch = col.tags?.some(tag => tag.toLowerCase().includes(query));

        return nameMatch || tagMatch;
    });

    const handleCreate = async () => {
        const name = window.prompt('Enter collection name:');
        if (!name || !name.trim() || !user) return;

        setIsCreating(true);
        try {
            const newCollection = {
                userId: user.uid,
                name: name.trim(),
                imageCount: 0,
                privacy: 'private', // Default to private
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'users', user.uid, 'collections'), newCollection);

            // Optimistic update
            const created: Collection = {
                id: docRef.id,
                ...newCollection,
                createdAt: new Date(), // approximate
                updatedAt: new Date(),
            } as any;

            setCollections([created, ...collections]);
            showToast('Collection created', 'success');
        } catch (error) {
            console.error('Failed to create collection:', error);
            showToast('Failed to create collection', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'collections', id));
            setCollections(collections.filter(c => c.id !== id));
            showToast('Collection deleted', 'success');
        } catch (error) {
            console.error('Failed to delete collection:', error);
            showToast('Failed to delete collection', 'error');
        }
    };

    const handleRename = async (id: string, newName: string) => {
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid, 'collections', id);
            await updateDoc(docRef, {
                name: newName,
                updatedAt: serverTimestamp()
            });

            setCollections(collections.map(c =>
                c.id === id ? { ...c, name: newName } : c
            ));
            showToast('Collection renamed', 'success');
        } catch (error) {
            console.error('Failed to rename collection:', error);
            showToast('Failed to rename collection', 'error');
        }
    };

    const handleTogglePrivacy = async (id: string, currentPrivacy: 'public' | 'private') => {
        if (!user) return;
        const newPrivacy = currentPrivacy === 'public' ? 'private' : 'public';
        try {
            const docRef = doc(db, 'users', user.uid, 'collections', id);
            await updateDoc(docRef, {
                privacy: newPrivacy,
                updatedAt: serverTimestamp()
            });

            setCollections(collections.map(c =>
                c.id === id ? { ...c, privacy: newPrivacy } : c
            ));
            showToast(`Collection is now ${newPrivacy}`, 'success');
        } catch (error) {
            console.error('Failed to update privacy:', error);
            showToast('Failed to update privacy', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
                <p className="text-foreground-muted mb-8">You need to be logged in to manage collections.</p>
                <Link href="/" className="btn-primary px-8 py-3">Sign In</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen max-w-7xl mx-auto px-4 py-8">
            {/* Nav */}
            <Link href="/dashboard" className="inline-flex items-center text-sm text-foreground-muted hover:text-primary mb-6 transition-colors">
                ← Back to Dashboard
            </Link>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 glass-card rounded-2xl">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">My Collections</h1>
                        <p className="text-foreground-muted mt-1">Organize and share your generated images</p>
                    </div>
                    <div className="hidden lg:block h-10 w-px bg-border" />
                    <GlobalSearch />
                </div>

                <div className="flex flex-1 max-w-md relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search collections or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm transition-all shadow-inner"
                    />
                </div>

                <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-primary/20"
                >
                    {isCreating ? <div className="spinner w-4 h-4 text-white" /> : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            <span>New Collection</span>
                        </>
                    )}
                </button>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-[4/3] rounded-xl bg-background-secondary animate-pulse" />
                    ))}
                </div>
            ) : collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-background-secondary/30 rounded-3xl border border-dashed border-border">
                    <div className="w-16 h-16 bg-background-secondary rounded-2xl flex items-center justify-center mb-6 text-4xl">
                        📁
                    </div>
                    <h2 className="text-xl font-bold mb-2">No collections yet</h2>
                    <p className="text-foreground-muted mb-6">Create your first collection to start organizing.</p>
                    <button onClick={handleCreate} className="btn-secondary">
                        Create Collection
                    </button>
                </div>
            ) : filteredCollections.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <div className="text-5xl mb-4 opacity-50">🔍</div>
                    <h2 className="text-xl font-bold mb-2">No matches found</h2>
                    <p className="text-foreground-muted mb-6">Try a different search term or tag.</p>
                    <button onClick={() => setSearchQuery('')} className="text-primary font-bold hover:underline">Clear search</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredCollections.map(collection => (
                        <CollectionCard
                            key={collection.id}
                            collection={collection}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onTogglePrivacy={handleTogglePrivacy}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CollectionsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
            <CollectionsContent />
        </Suspense>
    );
}
