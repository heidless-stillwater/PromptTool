import { GeneratedImage, Collection } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import { useState } from 'react';
import { useToast } from '@/components/Toast';


interface ImageDetailModalProps {
    selectedImage: GeneratedImage;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    collections: Collection[];
    onToggleCollection: (imageId: string, collectionId: string) => void;
    isEditingPromptSetID: boolean;
    setIsEditingPromptSetID: (value: boolean) => void;
    editingPromptSetID: string;
    setEditingPromptSetID: (value: string) => void;
    isSavingPromptSetID: boolean;
    onUpdatePromptSetID: () => void;
    newImageTag: string;
    setNewImageTag: (value: string) => void;
    isUpdatingTags: boolean;
    onAddTag: () => void;
    onRemoveTag: (tag: string) => void;
    onLeagueToggle: (image: GeneratedImage) => void;
    publishingId: string | null;
    onDownload: (image: GeneratedImage, format?: 'png' | 'jpeg') => void;
    onDelete: (imageId: string) => void;
    deletingId: string | null;
}

export default function ImageDetailModal({
    selectedImage,
    onClose,
    onNext,
    onPrev,
    collections,
    onToggleCollection,
    isEditingPromptSetID,
    setIsEditingPromptSetID,
    editingPromptSetID,
    setEditingPromptSetID,
    isSavingPromptSetID,
    onUpdatePromptSetID,
    newImageTag,
    setNewImageTag,
    isUpdatingTags,
    onAddTag,
    onRemoveTag,
    onLeagueToggle,
    publishingId,
    onDownload,
    onDelete,
    deletingId
}: ImageDetailModalProps) {
    const { showToast } = useToast();

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(selectedImage.prompt);
        showToast('Prompt copied to clipboard', 'success');
    };

    const handleCopySeed = () => {
        if (selectedImage.settings?.seed) {
            navigator.clipboard.writeText(String(selectedImage.settings.seed));
            showToast('Seed copied to clipboard', 'success');
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Navigation Buttons */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full transition-all pointer-events-auto shadow-lg border border-white/10 group"
                    title="Previous Image (Arrow Left)"
                >
                    <svg className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full transition-all pointer-events-auto shadow-lg border border-white/10 group"
                    title="Next Image (Arrow Right)"
                >
                    <svg className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19l7-7-7-7" />
                    </svg>
                </button>
            </div>

            <div
                className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col md:flex-row min-h-0 flex-1">
                    {/* Image Display */}
                    <div className="flex-1 bg-background-secondary flex items-center justify-center p-4 overflow-hidden relative group">
                        <img
                            src={selectedImage.imageUrl}
                            alt={selectedImage.prompt}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                        />
                        {/* League badge */}
                        {selectedImage.publishedToLeague && (
                            <div className="absolute top-4 left-4 z-10 bg-yellow-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg pointer-events-none">
                                🏆 Published to League
                            </div>
                        )}
                    </div>

                    {/* Details Panel */}
                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border flex flex-col min-h-0">
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex justify-between items-start mb-4 sticky top-0 bg-background z-10 -mx-6 px-6 pb-2">
                                <h3 className="font-semibold">Image Details</h3>
                                <button
                                    onClick={onClose}
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

                                {/* Collections */}
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
                                                        onChange={() => onToggleCollection(selectedImage.id, col.id)}
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

                                {/* Prompt Set ID */}
                                <div className="pt-2 border-t border-border/50">
                                    <label className="text-xs text-foreground-muted uppercase tracking-wide flex items-center justify-between">
                                        Prompt Set ID
                                        {!isEditingPromptSetID && (
                                            <button
                                                onClick={() => {
                                                    setEditingPromptSetID(selectedImage.promptSetID || '');
                                                    setIsEditingPromptSetID(true);
                                                }}
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
                                                    onClick={onUpdatePromptSetID}
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

                                {/* Tags */}
                                <div className="pt-2 border-t border-border/50">
                                    <label className="text-xs text-foreground-muted uppercase tracking-wide flex items-center justify-between mb-2">
                                        Tags
                                        {isUpdatingTags && <div className="spinner-xs" />}
                                    </label>

                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {(selectedImage.tags || []).map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full border border-primary/20 group/tag"
                                            >
                                                #{tag}
                                                <button
                                                    onClick={() => onRemoveTag(tag)}
                                                    className="hover:text-red-500 transition-colors"
                                                    title="Remove tag"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                        {(selectedImage.tags || []).length === 0 && (
                                            <span className="text-xs text-foreground-muted italic">No tags added</span>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={newImageTag}
                                            onChange={(e) => setNewImageTag(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
                                            placeholder="Add a tag..."
                                            className="w-full bg-background-secondary border border-border rounded-lg pl-3 pr-10 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                        />
                                        <button
                                            onClick={onAddTag}
                                            disabled={!newImageTag.trim() || isUpdatingTags}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary-hover disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-foreground-muted uppercase tracking-wide">Created</label>
                                    <p className="text-sm mt-1">{formatDate(selectedImage.createdAt)}</p>
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-border mt-auto grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleCopyPrompt}
                                        className="btn-secondary text-xs py-2 flex items-center justify-center gap-2"
                                    >
                                        Copy Prompt
                                    </button>
                                    <button
                                        onClick={handleCopySeed}
                                        disabled={!selectedImage.settings?.seed}
                                        className="btn-secondary text-xs py-2 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        Copy Seed
                                    </button>
                                    <button
                                        onClick={() => onLeagueToggle(selectedImage)}
                                        disabled={publishingId === selectedImage.id}
                                        className={`col-span-2 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${selectedImage.publishedToLeague
                                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                                            : 'bg-background-secondary hover:bg-background-tertiary text-foreground'
                                            }`}
                                    >
                                        {publishingId === selectedImage.id ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-lg">🏆</span>
                                        )}
                                        {selectedImage.publishedToLeague ? 'Published to League' : 'Publish to Team League'}
                                    </button>
                                    <button
                                        onClick={() => onDownload(selectedImage)}
                                        className="col-span-2 btn-primary text-xs py-2 flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Image
                                    </button>
                                    <button
                                        onClick={() => onDelete(selectedImage.id)}
                                        disabled={deletingId === selectedImage.id}
                                        className="col-span-2 btn-danger text-xs py-2 flex items-center justify-center gap-2 opacity-80 hover:opacity-100"
                                    >
                                        {deletingId === selectedImage.id ? 'Deleting...' : 'Delete Image'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
