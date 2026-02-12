import { GeneratedImage } from '@/lib/types';
import Link from 'next/link';
import GalleryImageCard from './GalleryImageCard';

interface GalleryGridProps {
    images: GeneratedImage[];
    filteredImages: GeneratedImage[];
    loadingImages: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    isGrouped: boolean;
    groupImagesByPromptSet: (images: GeneratedImage[]) => Record<string, GeneratedImage[]>;
    onLoadMore: () => void;
    selectionMode: boolean;
    selectedImageIds: Set<string>;
    deletingId: string | null;
    onImageSelect: (image: GeneratedImage) => void;
    onGroupSelect: (group: GeneratedImage[]) => void;
    onToggleImageSelection: (imageId: string) => void;
    onDeleteImage: (imageId: string) => void;
    onClearFilters: () => void;
}

export default function GalleryGrid({
    images,
    filteredImages,
    loadingImages,
    loadingMore,
    hasMore,
    isGrouped,
    groupImagesByPromptSet,
    onLoadMore,
    selectionMode,
    selectedImageIds,
    deletingId,
    onImageSelect,
    onGroupSelect,
    onToggleImageSelection,
    onDeleteImage,
    onClearFilters
}: GalleryGridProps) {
    if (loadingImages) {
        return (
            <div className="flex justify-center py-12">
                <div className="spinner" />
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-16 glass-card rounded-2xl">
                <div className="text-6xl mb-4 opacity-30">🎨</div>
                <h2 className="text-xl font-semibold mb-2">No images yet</h2>
                <p className="text-foreground-muted mb-6">
                    Start creating your first AI-generated masterpiece!
                </p>
                <Link href="/generate" className="btn-primary px-6 py-3">
                    Generate Your First Image
                </Link>
            </div>
        );
    }

    if (filteredImages.length === 0) {
        return (
            <div className="text-center py-16 glass-card rounded-2xl">
                <div className="text-4xl mb-4 opacity-50">🔍</div>
                <h2 className="text-lg font-semibold mb-2">No matching images</h2>
                <p className="text-foreground-muted">Try adjusting your filters or search terms.</p>
                <button
                    onClick={onClearFilters}
                    className="text-primary hover:underline mt-4 font-bold"
                >
                    Clear all filters
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {isGrouped ? (
                    Object.entries(groupImagesByPromptSet(filteredImages)).map(([key, groupImages]) => {
                        const firstImage = groupImages[0];
                        const isSingle = groupImages.length === 1;

                        return (
                            <GalleryImageCard
                                key={key}
                                image={firstImage}
                                groupImages={groupImages}
                                isGroupLeader={true}
                                isSelected={groupImages.some(img => selectedImageIds.has(img.id))}
                                selectionMode={selectionMode}
                                deletingId={deletingId}
                                onSelect={() => isSingle ? onImageSelect(firstImage) : onGroupSelect(groupImages)}
                                onToggleSelection={() => groupImages.forEach(img => onToggleImageSelection(img.id))}
                                onDelete={(e) => {
                                    e.stopPropagation();
                                    onDeleteImage(firstImage.id);
                                }}
                            />
                        );
                    })
                ) : (
                    filteredImages.map((image) => (
                        <GalleryImageCard
                            key={image.id}
                            image={image}
                            isSelected={selectedImageIds.has(image.id)}
                            selectionMode={selectionMode}
                            deletingId={deletingId}
                            onSelect={() => onImageSelect(image)}
                            onToggleSelection={() => onToggleImageSelection(image.id)}
                            onDelete={(e) => {
                                e.stopPropagation();
                                onDeleteImage(image.id);
                            }}
                        />
                    ))
                )}
            </div>

            {hasMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="btn-secondary px-8 py-3 w-full md:w-auto"
                    >
                        {loadingMore ? (
                            <div className="flex items-center gap-2 justify-center">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            'Load More Images'
                        )}
                    </button>
                </div>
            )}
        </>
    );
}
