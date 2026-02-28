import { GeneratedImage, Collection } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import React, { useRef, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SmartVideo from '@/components/SmartVideo';
import SmartImage from '@/components/SmartImage';
import { Icons } from '@/components/ui/Icons';
import { useToast } from '@/components/Toast';
import Tooltip from '@/components/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
interface ImageGroupModalProps {
    selectedGroup: GeneratedImage[];
    onClose: () => void;
    onImageSelect: (image: GeneratedImage) => void;
    collections: Collection[];
    onBatchToggleCollection: (images: GeneratedImage[], collectionId: string) => void;
    showCreateCollection: boolean;
    setShowCreateCollection: (value: boolean) => void;
    newCollectionName: string;
    setNewCollectionName: (value: string) => void;
    onCreateCollection: () => void;
    creatingCollection: boolean;
    collectionError: string;
    setCollectionError: (value: string) => void;
}

export default function ImageGroupModal({
    selectedGroup,
    onClose,
    onImageSelect,
    collections,
    onBatchToggleCollection,
    showCreateCollection,
    setShowCreateCollection,
    newCollectionName,
    setNewCollectionName,
    onCreateCollection,
    creatingCollection,
    collectionError,
    setCollectionError
}: ImageGroupModalProps) {
    const router = useRouter();
    const pathname = usePathname() || '';
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
    const [gridSize, setGridSize] = useState<'sm' | 'md' | 'lg'>('md');
    const [copied, setCopied] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (showCreateCollection && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showCreateCollection]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCollectionDropdownOpen(false);
                setShowCreateCollection(false);
            }
        };

        if (isCollectionDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCollectionDropdownOpen, setShowCreateCollection]);

    if (!selectedGroup || selectedGroup.length === 0) return null;

    const firstImage = selectedGroup[0];

    const commonCollectionIds = collections.filter(col =>
        selectedGroup.every(img =>
            (img.collectionIds || (img.collectionId ? [img.collectionId] : [])).includes(col.id)
        )
    ).map(c => c.id);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[1010]"
            >
                <Icons.close size={24} />
            </button>

            <div
                className="bg-black/50 border border-white/5 rounded-3xl w-full h-full flex flex-col overflow-hidden relative max-w-7xl mx-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-transparent z-10 gap-4 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-primary">Image Variations</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <p className="text-sm text-foreground-muted">
                                {selectedGroup.length} images • {formatDate(firstImage.createdAt)}
                            </p>
                            {collections.filter(c => commonCollectionIds.includes(c.id)).map(col => (
                                <span key={col.id} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                                    {col.name}
                                </span>
                            ))}
                            {firstImage.isExemplar && (
                                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded-full border border-yellow-500/30 flex items-center gap-1">
                                    <Icons.exemplar size={12} className="fill-current" />
                                    Exemplar
                                </span>
                            )}
                            {firstImage.publishedToCommunity && (
                                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded-full border border-yellow-500/20 flex items-center gap-1">
                                    🏆 Community
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 shadow-inner">
                            <button
                                onClick={() => setGridSize('sm')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    gridSize === 'sm' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                title="Compact View"
                            >
                                <Icons.grid size={14} className="opacity-70" />
                            </button>
                            <button
                                onClick={() => setGridSize('md')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    gridSize === 'md' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                title="Standard View"
                            >
                                <Icons.grid size={18} />
                            </button>
                            <button
                                onClick={() => setGridSize('lg')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    gridSize === 'lg' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                title="Large View"
                            >
                                <Icons.image size={20} />
                            </button>
                        </div>

                        <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCollectionDropdownOpen(!isCollectionDropdownOpen)}
                                className="px-3 py-1.5 bg-background-secondary hover:bg-background-tertiary rounded-lg text-xs font-bold transition-colors border border-border flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Manage Collections
                            </button>

                            {isCollectionDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-[#12121a] border border-border rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 border-b border-border bg-black/40">
                                        <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider block px-2 mb-1">
                                            Add group to...
                                        </span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                        {collections.map(col => {
                                            const isSelected = commonCollectionIds.includes(col.id);
                                            return (
                                                <label
                                                    key={col.id}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-background-secondary'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-foreground-muted'}`}>
                                                        {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <span className="text-sm truncate flex-1">{col.name}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={() => onBatchToggleCollection(selectedGroup, col.id)}
                                                    />
                                                </label>
                                            );
                                        })}
                                        {collections.length === 0 && !showCreateCollection && (
                                            <div className="p-4 text-center text-xs text-foreground-muted italic">
                                                No collections yet
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-2 border-t border-border bg-black/20">
                                        {!showCreateCollection ? (
                                            <button
                                                onClick={() => setShowCreateCollection(true)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors font-bold"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Create New Collection
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={newCollectionName}
                                                    onChange={(e) => {
                                                        setNewCollectionName(e.target.value);
                                                        if (collectionError) setCollectionError('');
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') onCreateCollection();
                                                        if (e.key === 'Escape') {
                                                            setShowCreateCollection(false);
                                                            setNewCollectionName('');
                                                        }
                                                    }}
                                                    placeholder="Collection name..."
                                                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-foreground-muted"
                                                />
                                                {collectionError && (
                                                    <p className="text-[10px] text-error px-1">{collectionError}</p>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={onCreateCollection}
                                                        disabled={creatingCollection || !newCollectionName.trim()}
                                                        className="flex-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                                                    >
                                                        {creatingCollection ? '...' : 'Create'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowCreateCollection(false);
                                                            setNewCollectionName('');
                                                        }}
                                                        className="px-2 bg-background-tertiary text-foreground text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg hover:bg-background-secondary transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {pathname.includes('/generate') && (
                            <button
                                onClick={onClose}
                                className="hidden md:flex px-3 py-1.5 bg-background-secondary hover:bg-background-tertiary rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-border items-center gap-2 text-foreground-muted hover:text-foreground"
                            >
                                <Icons.arrowLeft size={14} />
                                Return to Generator
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (pathname.includes('/gallery')) {
                                    onClose();
                                } else {
                                    const targetId = firstImage.promptSetID || firstImage.id;
                                    router.push(`/gallery?set=${targetId}`);
                                }
                            }}
                            className="hidden md:flex px-3 py-1.5 bg-background-secondary hover:bg-background-tertiary rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-border items-center gap-2 text-foreground-muted hover:text-foreground"
                        >
                            <Icons.grid size={14} />
                            Return to Gallery
                        </button>

                        <button
                            onClick={() => {
                                const sid = firstImage.promptSetID || firstImage.settings?.promptSetID;
                                router.push(`/generate?ref=${firstImage.id}${sid ? `&sid=${sid}` : ''}&tab=current`);
                            }}
                            className="px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center gap-2 group"
                        >
                            <Icons.wand size={14} className="group-hover:rotate-12 transition-transform" />
                            Generate new variations
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <Tooltip content="Click to generate new variations with this prompt" className="w-full block mb-6" position="bottom">
                        <div
                            onClick={() => {
                                const sid = firstImage.promptSetID || firstImage.settings?.promptSetID;
                                router.push(`/generate?ref=${firstImage.id}${sid ? `&sid=${sid}` : ''}&tab=current`);
                            }}
                            className="flex gap-4 p-3 bg-background-secondary rounded-lg border border-border/50 group cursor-pointer hover:border-primary/40 hover:bg-background-tertiary transition-all relative overflow-hidden shadow-sm hover:shadow-md"
                        >
                            {/* Subtle highlight effect on hover */}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.03] transition-colors pointer-events-none" />

                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border/50 shadow-sm relative z-10">
                                {firstImage.videoUrl || firstImage.settings?.modality === 'video' ? (
                                    <>
                                        {/(\.(mp4|webm|mov)(\?|$))/i.test(firstImage.imageUrl || '') ? (
                                            <video
                                                src={`${firstImage.imageUrl}#t=0.1`}
                                                className="w-full h-full object-cover"
                                                preload="metadata"
                                                muted
                                                playsInline
                                            />
                                        ) : (
                                            <SmartImage
                                                src={firstImage.imageUrl}
                                                alt="Group Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <SmartVideo
                                            src={firstImage.videoUrl || firstImage.imageUrl}
                                            className="absolute inset-0 w-full h-full object-cover z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                            loop
                                            muted
                                            preload="metadata"
                                            onMouseEnter={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => { }); }}
                                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                        />
                                    </>
                                ) : (
                                    <img
                                        src={firstImage.imageUrl}
                                        alt="Group Preview"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {firstImage.isExemplar && (
                                    <div className="absolute top-1 right-1 z-30 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-full p-0.5 shadow-lg border border-amber-300/30">
                                        <Icons.exemplar size={10} className="fill-current" />
                                    </div>
                                )}
                                {(firstImage.videoUrl || firstImage.settings?.modality === 'video') && (
                                    <div className="absolute bottom-1 left-1 z-30 bg-black/60 backdrop-blur-sm p-1 rounded-lg text-white shadow-lg border border-white/10 pointer-events-none transition-opacity">
                                        <Icons.video size={10} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 group/prompt relative z-10">
                                <p className="text-sm text-foreground font-mono line-clamp-3 leading-relaxed pr-10">
                                    {firstImage.prompt}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(firstImage.prompt);
                                        setCopied(true);
                                        showToast('Prompt copied to clipboard', 'success');
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="absolute right-0 top-0 p-2 hover:bg-background-secondary rounded-lg text-foreground-muted hover:text-primary transition-all flex items-center gap-2 group/copy z-20"
                                    title="Copy full prompt"
                                >
                                    {copied ? (
                                        <>
                                            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Copied!</span>
                                            <Icons.check className="w-4 h-4 text-emerald-500" />
                                        </>
                                    ) : (
                                        <Icons.copy className="w-4 h-4" />
                                    )}
                                </button>

                                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                                        <Icons.wand size={10} />
                                        Generate new variations
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Tooltip>

                    <div className={cn(
                        "grid gap-4 transition-all duration-500",
                        gridSize === 'sm' ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" :
                            gridSize === 'md' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" :
                                "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                    )}>
                        {selectedGroup.map((image) => {
                            const isVideo = !!(image.videoUrl || image.settings?.modality === 'video');
                            return (
                                <div
                                    key={image.id}
                                    onClick={() => onImageSelect(image)}
                                    className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-background-secondary"
                                >
                                    {isVideo ? (
                                        <>
                                            {/(\.(mp4|webm|mov)(\?|$))/i.test(image.imageUrl || '') ? (
                                                <video
                                                    src={`${image.imageUrl}#t=0.1`}
                                                    className="w-full h-full object-cover"
                                                    preload="metadata"
                                                    muted
                                                    playsInline
                                                />
                                            ) : (
                                                <SmartImage
                                                    src={image.imageUrl}
                                                    alt={image.prompt}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            )}
                                            <SmartVideo
                                                src={image.videoUrl || image.imageUrl}
                                                className="absolute inset-0 w-full h-full object-cover z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                loop
                                                muted
                                                preload="metadata"
                                                onMouseEnter={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => { }); }}
                                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                        </>
                                    ) : (
                                        <img
                                            src={image.imageUrl}
                                            alt={image.prompt}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    )}

                                    {image.sourceImageId && (
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-accent/90 text-white text-[10px] font-bold rounded uppercase z-30">
                                            Variation
                                        </div>
                                    )}
                                    {image.publishedToCommunity && (
                                        <div className="absolute bottom-2 right-2 z-30 bg-yellow-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-sm w-fit">
                                            🏆 Community
                                        </div>
                                    )}
                                    {image.isExemplar && (
                                        <div className="absolute top-2 right-2 z-30 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-lg flex items-center gap-1 border border-amber-300/30">
                                            <Icons.exemplar size={10} />
                                            Exemplar
                                        </div>
                                    )}
                                    {isVideo && (
                                        <div className="absolute bottom-2 left-2 z-30 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg text-white shadow-lg border border-white/10 pointer-events-none group-hover:opacity-0 transition-opacity">
                                            <Icons.video size={14} className="text-white" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-40">
                                        <span className="text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                                            View Details
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
