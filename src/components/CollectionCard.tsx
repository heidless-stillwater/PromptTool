'use client';

import { Collection } from '@/lib/types';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CollectionCardProps {
    collection: Collection;
    onDelete?: (id: string) => void;
    onRename?: (id: string, newName: string) => void;
    onTogglePrivacy?: (id: string, currentPrivacy: 'public' | 'private') => void;
}

export default function CollectionCard({ collection, onDelete, onRename, onTogglePrivacy }: CollectionCardProps) {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(collection.name);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (renameValue.trim() && renameValue !== collection.name) {
            onRename?.(collection.id, renameValue.trim());
        }
        setIsRenaming(false);
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this collection? Images will not be deleted.')) {
            onDelete?.(collection.id);
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="card group relative p-0 hover:border-primary/50 transition-all">
            {/* Clickable Area to Navigate */}
            <Link
                href={`/collections/${collection.id}`}
                className="block aspect-[4/3] bg-background-secondary relative overflow-hidden rounded-t-2xl"
            >
                {collection.coverImageUrl ? (
                    <img
                        src={collection.coverImageUrl}
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground-muted bg-background-secondary">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                )}

                {/* Privacy Badge */}
                <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase backdrop-blur-md shadow-sm ${collection.privacy === 'public'
                        ? 'bg-success/20 text-success border border-success/30'
                        : 'bg-black/50 text-white border border-white/20'
                        }`}>
                        {collection.privacy === 'public' ? 'Public' : 'Private'}
                    </span>
                </div>
            </Link>

            {/* Info Section */}
            <div className="p-4 relative">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 mr-8">
                        {isRenaming ? (
                            <form onSubmit={handleRenameSubmit} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    autoFocus
                                    onBlur={() => setIsRenaming(false)}
                                    className="w-full bg-background border border-primary rounded px-1 py-0.5 text-sm font-bold ml-[-5px]"
                                />
                            </form>
                        ) : (
                            <Link href={`/collections/${collection.id}`} className="block">
                                <h3 className="font-bold truncate hover:text-primary transition-colors" title={collection.name}>
                                    {collection.name}
                                </h3>
                            </Link>
                        )}
                        <p className="text-xs text-foreground-muted mt-1">
                            {collection.imageCount} image{collection.imageCount !== 1 ? 's' : ''}
                        </p>

                        {/* Tags Display */}
                        {collection.tags && collection.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                                {collection.tags.slice(0, 3).map(tag => (
                                    <button
                                        key={tag}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            router.push(`/gallery?tag=${tag}`);
                                        }}
                                        className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-pointer"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                                {collection.tags.length > 3 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-background-secondary text-foreground-muted border border-border">
                                        +{collection.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Menu Button */}
                    <div className="absolute top-4 right-2" ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className="p-1.5 hover:bg-background-secondary rounded-lg text-foreground-muted hover:text-foreground transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-background-tertiary border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRenaming(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-background-secondary flex items-center gap-2"
                                >
                                    <span>✏️</span> Rename
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePrivacy?.(collection.id, collection.privacy);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-background-secondary flex items-center gap-2"
                                >
                                    <span>{collection.privacy === 'public' ? '🔒 Make Private' : '🌍 Make Public'}</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/collections/${collection.id}`);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-background-secondary flex items-center gap-2"
                                >
                                    <span>🏷️</span> Edit Tags
                                </button>
                                <div className="h-px bg-border my-1" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete();
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-error/10 text-error flex items-center gap-2"
                                >
                                    <span>🗑️</span> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
