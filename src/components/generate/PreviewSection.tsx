'use client';

import { GeneratedImage } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ShareButtons from '@/components/ShareButtons';
import { cn } from '@/lib/utils';

interface PreviewSectionProps {
    generating: boolean;
    generatedImages: GeneratedImage[];
    selectedImageIndex: number;
    setSelectedImageIndex: (idx: number) => void;
    editedImage: string | null;
    setEditedImage: (img: string | null) => void;
    modality: string;
    aspectRatio: string;
    generationProgress: { current: number; total: number; message: string } | null;
    onShowTextEditor: () => void;
    onDownload: (format: 'png' | 'jpeg' | 'mp4') => void;
}

export default function PreviewSection({
    generating,
    generatedImages,
    selectedImageIndex,
    setSelectedImageIndex,
    editedImage,
    setEditedImage,
    modality,
    aspectRatio,
    generationProgress,
    onShowTextEditor,
    onDownload
}: PreviewSectionProps) {
    const currentImg = generatedImages[selectedImageIndex];
    const isVideo = modality === 'video' || currentImg?.settings?.modality === 'video' || !!currentImg?.videoUrl;

    return (
        <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
            <Card className="p-5 flex flex-col" variant="glass">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest">Master Preview</h3>
                    <div className="flex items-center gap-2">
                        {generatedImages.length > 0 && !generating && (
                            <span className="text-[10px] font-black uppercase py-1 px-2 bg-background-secondary rounded-lg border border-border">
                                {selectedImageIndex + 1} of {generatedImages.length}
                            </span>
                        )}
                    </div>
                </div>

                <div
                    className="relative bg-background-secondary rounded-2xl overflow-hidden flex items-center justify-center border border-border shadow-inner group/preview transition-all duration-500"
                    style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                >
                    {generating ? (
                        <div className="text-center w-full px-12 animate-in fade-in duration-700">
                            <div className="relative w-20 h-20 mx-auto mb-8">
                                <Icons.spinner size={80} className="text-primary animate-spin opacity-20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Icons.zap size={32} className="text-primary fill-primary animate-pulse" />
                                </div>
                            </div>
                            <p className="font-black text-xl mb-3 tracking-tighter italic">
                                {generationProgress ? `Crystallizing Image ${generationProgress.current}...` : 'Brewing Magic...'}
                            </p>

                            <div className="w-full bg-background-secondary border border-border h-2 rounded-full overflow-hidden mb-4 shadow-sm">
                                <div
                                    className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                    style={{ width: `${generationProgress ? (generationProgress.current / generationProgress.total) * 100 : 8}%` }}
                                />
                            </div>

                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-foreground-muted animate-pulse">
                                {generationProgress?.message || 'Contacting Neural Engines...'}
                            </p>
                        </div>
                    ) : generatedImages.length > 0 ? (
                        <>
                            {isVideo && (currentImg?.videoUrl || editedImage) ? (
                                <video
                                    src={editedImage || currentImg?.videoUrl}
                                    controls
                                    autoPlay
                                    loop
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <img
                                    src={editedImage || currentImg?.imageUrl}
                                    alt="Generated Output"
                                    className="w-full h-full object-contain animate-in zoom-in-95 duration-500"
                                />
                            )}

                            {/* Hover Overlay Actions */}
                            {!generating && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                    <Button variant="secondary" size="icon" onClick={() => onDownload('png')} className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 border-white/20 text-white backdrop-blur-md">
                                        <Icons.download size={20} />
                                    </Button>
                                    <Button variant="secondary" size="icon" onClick={onShowTextEditor} className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 border-white/20 text-white backdrop-blur-md">
                                        <Icons.settings size={20} />
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center p-12 opacity-40 group-hover/preview:opacity-60 transition-opacity">
                            <div className="w-24 h-24 rounded-full bg-background-secondary flex items-center justify-center mx-auto mb-6 border border-dashed border-border">
                                <Icons.image size={48} className="text-foreground-muted" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                                Your creations will manifest here
                            </p>
                        </div>
                    )}
                </div>

                {/* Batch Thumbnail Grid */}
                {generatedImages.length > 1 && !generating && (
                    <div className="flex gap-2.5 mt-6 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        {generatedImages.map((img, idx) => (
                            <button
                                key={img.id}
                                onClick={() => {
                                    setSelectedImageIndex(idx);
                                    setEditedImage(null);
                                }}
                                className={cn(
                                    "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all snap-start shadow-sm",
                                    selectedImageIndex === idx
                                        ? "border-primary ring-4 ring-primary/10 scale-105"
                                        : "border-transparent opacity-60 hover:opacity-100 grayscale hover:grayscale-0"
                                )}
                            >
                                <img src={img.imageUrl} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Detailed Action Panel */}
                {generatedImages.length > 0 && !generating && (
                    <div className="space-y-4 mt-6 animate-in slide-in-from-bottom-4 duration-500">
                        {modality === 'image' && (
                            <Button
                                variant="primary"
                                onClick={onShowTextEditor}
                                className="w-full h-12 font-black uppercase tracking-widest gap-3 shadow-lg shadow-primary/20"
                            >
                                <Icons.settings size={18} />
                                {editedImage ? 'Refine Text Layers' : 'Enrich with Text'}
                            </Button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => onDownload('png')}
                                className="h-11 font-black uppercase tracking-widest text-[10px]"
                            >
                                <Icons.download size={14} className="mr-2" />
                                PNG
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => onDownload(modality === 'video' ? 'mp4' : 'jpeg')}
                                className="h-11 font-black uppercase tracking-widest text-[10px]"
                            >
                                <Icons.download size={14} className="mr-2" />
                                {modality === 'video' ? 'MP4' : 'JPEG'}
                            </Button>
                        </div>

                        {editedImage && (
                            <button
                                onClick={() => setEditedImage(null)}
                                className="w-full text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:text-primary transition-colors py-2"
                            >
                                Reset to Pure Generation
                            </button>
                        )}

                        <div className="pt-6 mt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Broadcast Creation</span>
                                <div className="h-px flex-1 bg-border/30 ml-4" />
                            </div>
                            <div className="flex justify-center">
                                <ShareButtons
                                    imageUrl={editedImage || (modality === 'video' ? (generatedImages[selectedImageIndex].videoUrl || generatedImages[selectedImageIndex].imageUrl) : generatedImages[selectedImageIndex].imageUrl)}
                                    prompt={currentImg?.prompt || ''}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
