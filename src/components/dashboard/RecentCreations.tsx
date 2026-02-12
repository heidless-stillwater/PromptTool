'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GeneratedImage } from '@/lib/types';
import ShareButtons from '@/components/ShareButtons';

interface RecentCreationsProps {
    images: GeneratedImage[];
    loading: boolean;
    isGrouped: boolean;
    setIsGrouped: (val: boolean) => void;
    selectionMode: boolean;
    toggleSelectionMode: () => void;
    selectedIds: Set<string>;
    toggleImageSelection: (id: string, e?: React.MouseEvent) => void;
    toggleImageGroupSelection: (ids: string[], e?: React.MouseEvent) => void;
    groupImagesByPromptSet: (images: GeneratedImage[]) => Record<string, GeneratedImage[]>;
}

export default function RecentCreations({
    images,
    loading,
    isGrouped,
    setIsGrouped,
    selectionMode,
    toggleSelectionMode,
    selectedIds,
    toggleImageSelection,
    toggleImageGroupSelection,
    groupImagesByPromptSet
}: RecentCreationsProps) {
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="spinner" />
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="card text-center py-16">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-2">No images yet</h3>
                <p className="text-foreground-muted mb-6">Create your first AI-generated masterpiece!</p>
                <Link href="/generate" className="btn-primary inline-block">
                    Start Creating
                </Link>
            </div>
        );
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Recent Creations</h2>
                    <div className="flex bg-background-secondary rounded-lg p-1 border border-border/50">
                        <button
                            onClick={toggleSelectionMode}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${selectionMode
                                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                : 'text-foreground-muted hover:text-foreground'}`}
                        >
                            Select
                        </button>
                        <div className="w-px h-4 bg-border mx-1 self-center" />
                        <button
                            onClick={() => setIsGrouped(false)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${!isGrouped
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-foreground-muted hover:text-foreground'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setIsGrouped(true)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${isGrouped
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-foreground-muted hover:text-foreground'}`}
                        >
                            Grouped
                        </button>
                    </div>
                </div>
                <Link href="/gallery" className="text-primary hover:text-primary-hover transition-colors font-medium">
                    View All →
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {isGrouped ? (
                    Object.entries(groupImagesByPromptSet(images)).map(([key, groupImages]) => {
                        const mainImage = groupImages[0];
                        const isStack = groupImages.length > 1;
                        const groupIds = groupImages.map(img => img.id);
                        const isAnySelected = groupIds.some(id => selectedIds.has(id));
                        const isAllSelected = groupIds.every(id => selectedIds.has(id));

                        return (
                            <div
                                key={key}
                                onClick={() => selectionMode ? toggleImageGroupSelection(groupIds) : router.push('/gallery')}
                                className={`card group cursor-pointer overflow-hidden p-0 relative transition-all ${isStack ? 'hover:-translate-y-1' : ''} ${isAnySelected ? 'ring-2 ring-accent' : ''}`}
                            >
                                {selectionMode && (
                                    <div className="absolute top-2 left-2 z-20">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isAllSelected ? 'bg-accent border-accent' : isAnySelected ? 'bg-accent/40 border-accent' : 'bg-black/20 border-white/50'}`}>
                                            {isAnySelected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {isStack && (
                                    <>
                                        <div className="absolute top-1 left-1 right-1 h-full bg-background-secondary border border-border rounded-2xl -z-10 translate-y-2 opacity-50" />
                                        <div className="absolute top-1 left-2 right-2 h-full bg-background-tertiary border border-border rounded-2xl -z-20 translate-y-4 opacity-30" />
                                        <div className="absolute top-2 right-2 z-10 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                            {groupImages.length} images
                                        </div>
                                    </>
                                )}
                                <div className="aspect-[4/3] bg-background-secondary overflow-hidden">
                                    <img
                                        src={mainImage.imageUrl}
                                        alt={mainImage.prompt.slice(0, 50)}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="p-4">
                                    <p className="text-sm line-clamp-2 mb-2">{mainImage.prompt}</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-foreground-muted font-sans">
                                            {mainImage.settings.quality} • {mainImage.settings.aspectRatio}
                                        </p>
                                        {!selectionMode && <ShareButtons imageUrl={mainImage.imageUrl} prompt={mainImage.prompt} className="scale-75 origin-right" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    images.map((image) => (
                        <div
                            key={image.id}
                            onClick={() => selectionMode ? toggleImageSelection(image.id) : router.push('/gallery')}
                            className={`card group cursor-pointer overflow-hidden p-0 relative transition-all ${selectedIds.has(image.id) ? 'ring-2 ring-accent' : ''}`}
                        >
                            {selectionMode && (
                                <div className="absolute top-2 left-2 z-20">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(image.id) ? 'bg-accent border-accent' : 'bg-black/20 border-white/50'}`}>
                                        {selectedIds.has(image.id) && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="aspect-[4/3] bg-background-secondary overflow-hidden">
                                <img
                                    src={image.imageUrl}
                                    alt={image.prompt.slice(0, 50)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <div className="p-4">
                                <p className="text-sm line-clamp-2 mb-2">{image.prompt}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-foreground-muted font-sans">
                                        {image.settings.quality} • {image.settings.aspectRatio}
                                    </p>
                                    {!selectionMode && <ShareButtons imageUrl={image.imageUrl} prompt={image.prompt} className="scale-75 origin-right" />}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
