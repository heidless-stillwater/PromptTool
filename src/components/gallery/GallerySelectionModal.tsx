import React, { useEffect } from 'react';
import { GeneratedImage } from '@/lib/types';
import { useGallery } from '@/app/gallery/useGallery';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';

interface GallerySelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: GeneratedImage) => void;
}

export function GallerySelectionModal({ isOpen, onClose, onSelect }: GallerySelectionModalProps) {
    const { images, loadingImages, fetchImages, hasMore } = useGallery();
    const [hasFetched, setHasFetched] = React.useState(false);

    useEffect(() => {
        if (isOpen && !hasFetched) {
            fetchImages();
            setHasFetched(true);
        }
    }, [isOpen, hasFetched, fetchImages]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background-secondary/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Icons.image size={20} className="text-primary" />
                            Select Reference Image
                        </h2>
                        <p className="text-sm text-foreground-muted mt-1">
                            Choose an image from your gallery to use as a starting point.
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
                    {loadingImages && images.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
                            <Icons.image size={48} className="mb-4 opacity-20" />
                            <p>Your gallery is empty.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((img) => (
                                <div
                                    key={img.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-background-secondary"
                                    onClick={() => {
                                        onSelect(img);
                                        onClose();
                                    }}
                                >
                                    <img
                                        src={img.imageUrl}
                                        alt={img.prompt}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                        <p className="text-xs text-white line-clamp-2 font-medium">
                                            {img.prompt}
                                        </p>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="bg-primary/90 text-white p-1.5 rounded-md backdrop-blur-sm">
                                            <Icons.plus size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Load More Trigger */}
                    {hasMore && images.length > 0 && !loadingImages && (
                        <div className="py-8 flex justify-center">
                            <Button variant="outline" onClick={() => fetchImages(true)}>
                                Load More
                            </Button>
                        </div>
                    )}
                    {loadingImages && images.length > 0 && (
                        <div className="py-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
