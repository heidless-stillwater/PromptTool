'use client';

import { Collection } from '@/lib/types';
import { useState } from 'react';

interface CollectionSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (collectionId: string) => void;
    collections: Collection[];
    isProcessing: boolean;
    title?: string;
}

export default function CollectionSelectModal({
    isOpen,
    onClose,
    onSelect,
    collections,
    isProcessing,
    title = "Add to Collection"
}: CollectionSelectModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md glass-card p-6 shadow-2xl border-primary/20 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="relative mb-4">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search collections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {filteredCollections.length === 0 ? (
                        <div className="text-center py-8 text-foreground-muted">
                            <p className="text-sm">No collections found.</p>
                        </div>
                    ) : (
                        filteredCollections.map(col => (
                            <button
                                key={col.id}
                                onClick={() => onSelect(col.id)}
                                disabled={isProcessing}
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-background-secondary flex items-center justify-center group-hover:bg-primary/20">
                                        📁
                                    </div>
                                    <span className="font-medium">{col.name}</span>
                                </div>
                                <span className="text-xs text-foreground-muted bg-background-secondary px-2 py-0.5 rounded-full">
                                    {col.imageCount || 0}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="btn-secondary px-4 py-2 text-sm"
                    >
                        Cancel
                    </button>
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                        <div className="spinner" />
                    </div>
                )}
            </div>
        </div>
    );
}
