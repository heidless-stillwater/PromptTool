import React, { useEffect, useMemo } from 'react';
import { GeneratedImage, CommunityEntry } from '@/lib/types';
import { useGallery } from '@/app/gallery/useGallery';
import { useCommunity } from '@/app/community/useCommunity';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import SmartImage from '@/components/SmartImage';
import SmartVideo from '@/components/SmartVideo';

interface GallerySelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: GeneratedImage) => void;
    mode?: 'personal' | 'community';
}

export function GallerySelectionModal({ isOpen, onClose, onSelect, mode = 'personal' }: GallerySelectionModalProps) {
    // Hooks - though we only use one depending on mode
    const personalGallery = useGallery();
    const communityGallery = useCommunity();

    const isCommunity = mode === 'community';

    // Normalize data based on mode
    const items = useMemo(() => {
        if (isCommunity) {
            return communityGallery.entries.map(entry => {
                const isVideo = !!(entry.videoUrl || entry.settings?.modality === 'video');
                const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(entry.imageUrl || '');
                const hasThumbnail = isVideo && !imgIsVideo;
                return {
                    id: entry.id,
                    imageUrl: entry.imageUrl,
                    videoUrl: entry.videoUrl,
                    duration: entry.duration,
                    prompt: entry.prompt,
                    settings: entry.settings,
                    isVideo,
                    hasThumbnail,
                    originalEntry: entry
                };
            });
        }
        return personalGallery.images.map(img => {
            const isVideo = !!(img.videoUrl || img.settings?.modality === 'video');
            const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(img.imageUrl || '');
            const hasThumbnail = isVideo && !imgIsVideo;
            return {
                id: img.id,
                imageUrl: img.imageUrl,
                videoUrl: img.videoUrl,
                duration: img.duration,
                prompt: img.prompt,
                settings: img.settings,
                isVideo: isVideo,
                hasThumbnail,
                originalEntry: img
            };
        });
    }, [isCommunity, communityGallery.entries, personalGallery.images]);

    const loading = isCommunity ? communityGallery.loadingEntries : personalGallery.loadingImages;
    const hasMore = isCommunity ? communityGallery.hasMore : personalGallery.hasMore;
    const fetchMore = () => isCommunity ? communityGallery.fetchEntries(true) : personalGallery.fetchImages(true);

    const [hasFetched, setHasFetched] = React.useState(false);

    useEffect(() => {
        if (isOpen && !hasFetched) {
            if (isCommunity) {
                // community logic - useCommunity already triggers initial fetch via useQuery
            } else {
                personalGallery.fetchImages();
            }
            setHasFetched(true);
        }
    }, [isOpen, hasFetched, isCommunity, personalGallery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background-secondary/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {isCommunity ? (
                                <Icons.globe size={20} className="text-primary" />
                            ) : (
                                <Icons.image size={20} className="text-primary" />
                            )}
                            {isCommunity ? "Browse Community Synthesis" : "Select Reference Image"}
                        </h2>
                        <p className="text-sm text-foreground-muted mt-1">
                            {isCommunity
                                ? "Choose a masterpiece from the collective to use as a starting point."
                                : "Choose an image from your gallery to use as a starting point."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-foreground-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Icons.close size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading && items.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
                            {isCommunity ? <Icons.globe size={48} className="mb-4 opacity-20" /> : <Icons.image size={48} className="mb-4 opacity-20" />}
                            <p>{isCommunity ? "No community entries found." : "Your gallery is empty."}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {items.map((img) => (
                                <div
                                    key={img.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-background-secondary"
                                    onClick={() => {
                                        onSelect(img.originalEntry as GeneratedImage);
                                        onClose();
                                    }}
                                >
                                    {img.isVideo ? (
                                        img.hasThumbnail ? (
                                            <>
                                                <SmartImage
                                                    src={img.imageUrl}
                                                    alt={img.prompt}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    fallbackSize="md"
                                                />
                                                <SmartVideo
                                                    src={img.videoUrl || img.imageUrl}
                                                    className="absolute inset-0 w-full h-full object-cover z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                    loop
                                                    muted
                                                    preload="metadata"
                                                    onMouseEnter={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => { }); }}
                                                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                />
                                                {/* Video Duration Badge */}
                                                <div className="absolute bottom-2 right-2 z-30 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg shadow-lg border border-white/10 flex items-center gap-1.5 min-w-[40px] justify-center pointer-events-none">
                                                    {img.duration ? (
                                                        <span className="text-[11px] font-bold font-mono">
                                                            0:{Math.round(img.duration).toString().padStart(2, '0')}
                                                        </span>
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <SmartVideo
                                                    src={img.videoUrl || img.imageUrl}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    loop
                                                    muted
                                                    preload="metadata"
                                                    onMouseEnter={(e) => { if (e.currentTarget.paused) e.currentTarget.play().catch(() => { }); }}
                                                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                />
                                                {/* Video Duration Badge */}
                                                <div className="absolute bottom-2 right-2 z-30 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg shadow-lg border border-white/10 flex items-center gap-1.5 min-w-[40px] justify-center pointer-events-none">
                                                    {img.duration ? (
                                                        <span className="text-[11px] font-bold font-mono">
                                                            0:{Math.round(img.duration).toString().padStart(2, '0')}
                                                        </span>
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </>
                                        )
                                    ) : (
                                        <SmartImage
                                            src={img.imageUrl}
                                            alt={img.prompt}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            fallbackSize="md"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 z-20 pointer-events-none">
                                        <p className="text-xs text-white line-clamp-2 font-medium">
                                            {img.prompt}
                                        </p>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                                        <div className="bg-primary/90 text-white p-1.5 rounded-md backdrop-blur-sm">
                                            <Icons.plus size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Load More Trigger */}
                    {hasMore && items.length > 0 && !loading && (
                        <div className="py-8 flex justify-center">
                            <Button variant="outline" onClick={fetchMore}>
                                Load More
                            </Button>
                        </div>
                    )}
                    {loading && items.length > 0 && (
                        <div className="py-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
