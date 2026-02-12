import { GeneratedImage } from '@/lib/types';

interface GalleryImageCardProps {
    image: GeneratedImage;
    groupImages?: GeneratedImage[];
    isGroupLeader?: boolean;
    isSelected: boolean;
    selectionMode: boolean;
    deletingId: string | null;
    onSelect: () => void;
    onToggleSelection: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

export default function GalleryImageCard({
    image,
    groupImages,
    isGroupLeader = false,
    isSelected,
    selectionMode,
    deletingId,
    onSelect,
    onToggleSelection,
    onDelete,
}: GalleryImageCardProps) {
    const isDeleting = deletingId === image.id;
    const count = groupImages?.length || 1;

    return (
        <div
            className="group relative rounded-xl overflow-hidden bg-background-secondary cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-lg"
            onClick={selectionMode ? onToggleSelection : onSelect}
        >
            {/* Selection checkbox */}
            {selectionMode && (
                <div className="absolute top-2 left-2 z-20">
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-white/60 bg-black/30'}`}>
                        {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                    </div>
                </div>
            )}

            {/* Stack effect for multiple images */}
            {isGroupLeader && count > 1 && (
                <div className="absolute top-0 right-0 p-2 z-10">
                    <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        {count}
                    </div>
                </div>
            )}

            <div className="aspect-square relative">
                {/* Background stack layers if multiple */}
                {isGroupLeader && count > 1 && (
                    <>
                        <div className="absolute inset-0 bg-background-secondary translate-x-1 translate-y-1 rounded-xl border border-white/10" />
                        <div className="absolute inset-0 bg-background-secondary translate-x-2 translate-y-2 rounded-xl border border-white/10" />
                    </>
                )}

                <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover relative z-0 rounded-xl"
                    loading="lazy"
                />

                {/* League badge */}
                {image.publishedToLeague && (
                    <div className="absolute top-2 left-2 z-10 bg-yellow-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                        🏆 League
                    </div>
                )}

                {/* Variation label */}
                {!isGroupLeader && image.sourceImageId && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-accent/90 text-white text-[10px] font-bold rounded uppercase">
                        Variation
                    </div>
                )}
            </div>

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-xl">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm line-clamp-2">
                        {image.prompt}
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                        {isGroupLeader && count > 1 ? `${count} Variations` : `${image.settings.quality} • ${image.settings.aspectRatio}`}
                    </p>
                </div>
            </div>

            {/* Delete button (only show if not multiple, or handle logic for multiple elsewhere) */}
            {(!isGroupLeader || count === 1) && (
                <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-error/80 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                    {isDeleting ? (
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
}
