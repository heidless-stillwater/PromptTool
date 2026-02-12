'use client';

import { useState } from 'react';

interface BulkTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (tags: string[]) => void;
    isProcessing: boolean;
}

export default function BulkTagModal({
    isOpen,
    onClose,
    onApply,
    isProcessing
}: BulkTagModalProps) {
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    if (!isOpen) return null;

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSubmit = () => {
        if (tags.length > 0) {
            onApply(tags);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md glass-card p-6 shadow-2xl border-primary/20 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Bulk Tag Images</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-background-secondary rounded-lg transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-foreground-muted">
                        Enter tags to add to all selected images.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 bg-background-secondary rounded-lg border border-border">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
                            >
                                #{tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        ))}
                        {tags.length === 0 && (
                            <span className="text-xs text-foreground-muted italic py-1">No tags added yet</span>
                        )}
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Type a tag and press Enter..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-4 pr-12 py-2 bg-background-secondary border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            autoFocus
                        />
                        <button
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary-hover disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 btn-secondary py-2 text-sm font-bold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={tags.length === 0 || isProcessing}
                        className="flex-1 btn-primary py-2 text-sm font-bold disabled:opacity-50"
                    >
                        {isProcessing ? 'Applying...' : `Tag ${tags.length} labels`}
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
