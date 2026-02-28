'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GeneratedImage } from '@/lib/types';
import ShareButtons from '@/components/ShareButtons';
import ImageCard from '@/components/ImageCard';
import { Button } from '@/components/ui/Button';

import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

import { SkeletonGrid } from '@/components/ui/Skeleton';

interface RecentCreationsProps {
    title?: string;
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
    dense?: boolean;
}

export default function RecentCreations({
    title = "Recent Creations",
    images,
    loading,
    isGrouped,
    setIsGrouped,
    selectionMode,
    toggleSelectionMode,
    selectedIds,
    toggleImageSelection,
    toggleImageGroupSelection,
    groupImagesByPromptSet,
    dense = false
}: RecentCreationsProps) {
    const router = useRouter();

    if (loading) {
        return <SkeletonGrid count={4} columns={3} />;
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-2 text-white">No images yet</h3>
                <p className="text-white/50 mb-6">Create your first AI-generated masterpiece!</p>
                <Link href="/generate">
                    <Button variant="primary">
                        Start Creating
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black uppercase tracking-widest text-white/90">{title}</h2>
                    <div className="flex bg-black/40 rounded-[14px] p-1 border border-white/5 shadow-inner">
                        <Button
                            variant={selectionMode ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={toggleSelectionMode}
                            className={cn(
                                "rounded-xl text-[10px] h-7 font-black tracking-widest uppercase transition-all duration-300",
                                selectionMode ? "bg-accent/20 text-accent shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            Select
                        </Button>
                        <div className="w-px h-4 bg-white/10 mx-1 self-center" />
                        <Button
                            variant={!isGrouped ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setIsGrouped(false)}
                            className={cn(
                                "rounded-xl text-[10px] h-7 font-black tracking-widest uppercase transition-all duration-300",
                                !isGrouped ? "bg-primary/20 text-primary shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            <Icons.grid size={12} className="mr-1" />
                            Grid
                        </Button>
                        <Button
                            variant={isGrouped ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setIsGrouped(true)}
                            className={cn(
                                "rounded-xl text-[10px] h-7 font-black tracking-widest uppercase transition-all duration-300",
                                isGrouped ? "bg-primary/20 text-primary shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            <Icons.stack size={12} className="mr-1" />
                            Grouped
                        </Button>
                    </div>
                </div>
                <Link href="/gallery">
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-primary font-black text-[10px] uppercase tracking-widest group border border-white/5 hover:border-primary/30 rounded-xl px-4">
                        Gallery
                        <Icons.arrowRight size={14} className="ml-2 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                    </Button>
                </Link>
            </div>

            <div className={cn(
                "grid gap-4",
                dense ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}>
                {isGrouped ? (
                    Object.entries(groupImagesByPromptSet(images)).map(([key, groupImages], index) => {
                        const firstImage = groupImages[0];
                        const groupIds = groupImages.map(img => img.id);
                        const isAnySelected = groupIds.some(id => selectedIds.has(id));

                        return (
                            <ImageCard
                                key={key}
                                image={firstImage}
                                count={groupImages.length}
                                variant={dense ? 'gallery' : 'dashboard'}
                                dense={dense}
                                selectionMode={selectionMode}
                                isSelected={isAnySelected}
                                index={index}
                                onClick={() => {
                                    if (selectionMode) {
                                        toggleImageGroupSelection(groupIds);
                                    } else {
                                        router.push(`/gallery?set=${firstImage.promptSetID || firstImage.id}`);
                                    }
                                }}
                                showFooter={!dense}
                            />
                        );
                    })
                ) : (
                    images.map((image, index) => (
                        <ImageCard
                            key={image.id}
                            image={image}
                            variant={dense ? 'gallery' : 'dashboard'}
                            dense={dense}
                            selectionMode={selectionMode}
                            isSelected={selectedIds.has(image.id)}
                            index={index}
                            onClick={() => {
                                if (selectionMode) {
                                    toggleImageSelection(image.id);
                                } else {
                                    router.push(`/gallery?imageId=${image.id}`);
                                }
                            }}
                            showFooter={!dense}
                        />
                    ))
                )}
            </div>
        </section >
    );
}
