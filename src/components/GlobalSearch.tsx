'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { GeneratedImage, Collection } from '@/lib/types';

export default function GlobalSearch() {
    const { user } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<{
        images: GeneratedImage[];
        collections: Collection[];
    }>({ images: [], collections: [] });
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (val: string) => {
        if (!user || val.length < 2) {
            setResults({ images: [], collections: [] });
            return;
        }

        setIsLoading(true);
        const term = val.toLowerCase().trim();

        try {
            // Search Collections - simple fetch and filter for now as Firestore doesn't support easy case-insensitive contains
            // We fetch latest 50 and filter client-side for better UX without external search index
            const colRef = collection(db, 'users', user.uid, 'collections');
            const colSnap = await getDocs(query(colRef, orderBy('createdAt', 'desc'), limit(50)));
            const allCollections = colSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collection));

            const filteredCollections = allCollections.filter(c =>
                c.name.toLowerCase().includes(term) ||
                c.tags?.some(tag => tag.toLowerCase().includes(term))
            ).slice(0, 5);

            // Search Images 
            const imgRef = collection(db, 'users', user.uid, 'images');
            const imgSnap = await getDocs(query(imgRef, orderBy('createdAt', 'desc'), limit(100)));
            const allImages = imgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedImage));

            const filteredImages = allImages.filter(img =>
                img.prompt.toLowerCase().includes(term) ||
                img.tags?.some(tag => tag.toLowerCase().includes(term))
            ).slice(0, 5);

            setResults({
                collections: filteredCollections,
                images: filteredImages
            });
        } catch (error) {
            console.error('Global search error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) performSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="relative flex-1 max-w-md mx-4" ref={containerRef}>
            <div className="relative group">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-primary transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    type="text"
                    placeholder="Search images, collections, tags..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm text-foreground placeholder:text-foreground-muted transition-all"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && (searchQuery.length >= 2) && (
                <div className="absolute top-full mt-2 w-full glass-card bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-2">
                        {/* Collections Section */}
                        {results.collections.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest px-3 py-2">Collections</h3>
                                <div className="space-y-1">
                                    {results.collections.map(col => (
                                        <button
                                            key={col.id}
                                            onClick={() => {
                                                router.push(`/collections/${col.id}`);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3 group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                {col.coverImageUrl ? (
                                                    <img src={col.coverImageUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{col.name}</div>
                                                <div className="text-[10px] text-foreground-muted">{col.imageCount} images</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Images Section */}
                        {results.images.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest px-3 py-2">Images</h3>
                                <div className="grid grid-cols-1 gap-1">
                                    {results.images.map(img => (
                                        <button
                                            key={img.id}
                                            onClick={() => {
                                                router.push(`/gallery?selected=${img.id}`);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-3 group"
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-background-secondary flex-shrink-0">
                                                <img src={img.imageUrl} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">{img.prompt}</div>
                                                <div className="text-[10px] text-foreground-muted mt-1 uppercase font-semibold">{img.settings.quality} • {img.settings.aspectRatio}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.collections.length === 0 && results.images.length === 0 && !isLoading && (
                            <div className="py-8 text-center">
                                <div className="text-3xl mb-2 opacity-30">🔍</div>
                                <div className="text-sm text-foreground-muted">No results found for &quot;{searchQuery}&quot;</div>
                            </div>
                        )}
                    </div>

                    <div className="p-2 bg-background-secondary/50 border-t border-border">
                        <button
                            onClick={() => {
                                router.push(`/gallery?q=${encodeURIComponent(searchQuery)}`);
                                setIsOpen(false);
                                setSearchQuery('');
                            }}
                            className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                            See all results in Gallery →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
