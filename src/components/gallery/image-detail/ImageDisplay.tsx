import { GeneratedImage } from '@/lib/types';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface ImageDisplayProps {
    image: GeneratedImage;
    onPrev: () => void;
    onNext: () => void;
    onEdit: () => void;
    onPublishToggle: () => void;
    onDownload: () => void;
    onDelete: () => void;
    publishingId: string | null;
    deletingId: string | null;
}

export default function ImageDisplay({
    image,
    onPrev,
    onNext,
    onEdit,
    onPublishToggle,
    onDownload,
    onDelete,
    publishingId,
    deletingId
}: ImageDisplayProps) {
    const [error, setError] = useState(false);
    const lastNativeToggle = useRef(0);

    return (
        <div className="flex-[2] bg-black/40 flex flex-col items-center justify-center p-8 relative group min-h-0 text-white">
            {/* Community badge */}
            {image.publishedToCommunity && (
                <div className="absolute top-8 left-8 z-10 bg-yellow-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg pointer-events-none">
                    🏆 Published to Community Hub
                </div>
            )}

            {/* Navigation Buttons Overlay */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-20 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full transition-all pointer-events-auto shadow-lg border border-white/10 group/nav"
                    title="Previous Image (Arrow Left)"
                >
                    <svg className="w-6 h-6 group-hover/nav:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full transition-all pointer-events-auto shadow-lg border border-white/10 group/nav"
                    title="Next Image (Arrow Right)"
                >
                    <svg className="w-6 h-6 group-hover/nav:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19l7-7-7-7" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 min-h-0 min-w-0 w-full flex items-center justify-center relative">
                {error ? (
                    <div className="flex flex-col items-center justify-center text-foreground-muted">
                        <svg className="w-20 h-20 opacity-20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-black uppercase tracking-widest opacity-40">Media Unavailable</span>
                    </div>
                ) : (image.videoUrl || image.settings?.modality === 'video') ? (
                    <video
                        key={image.id + '-video'}
                        src={image.videoUrl || image.imageUrl}
                        className="max-w-full max-h-full rounded-lg shadow-xl cursor-pointer"
                        controls
                        loop
                        muted
                        playsInline
                        preload="auto"
                        onPlay={() => { lastNativeToggle.current = Date.now(); }}
                        onPause={() => { lastNativeToggle.current = Date.now(); }}
                        onClick={(e) => {
                            const video = e.currentTarget;
                            const rect = video.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;

                            // Ignore clicks in the bottom 60px (control bar area)
                            if (rect.height - clickY < 60) return;

                            // Ignore clicks if a native play/pause event just fired (e.g. center play button)
                            if (Date.now() - lastNativeToggle.current < 200) return;

                            if (video.paused) {
                                video.play().catch(() => { });
                            } else {
                                video.pause();
                            }
                        }}
                        onError={() => setError(true)}
                    />
                ) : (
                    <img
                        src={image.imageUrl}
                        alt={image.prompt}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                        onError={(e) => {
                            console.error('Image load error for URL:', image.imageUrl);
                            setError(true);
                        }}
                    />
                )}
            </div>

            <div className="mt-8 shrink-0 flex flex-wrap items-center justify-center gap-3 max-w-3xl w-full">
                <Button
                    variant="secondary"
                    onClick={onEdit}
                    className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border-white/5 whitespace-nowrap"
                >
                    <span className="text-sm">✏️</span>
                    Edit Image
                </Button>
                <Button
                    onClick={onPublishToggle}
                    disabled={publishingId === image.id}
                    isLoading={publishingId === image.id}
                    className={cn(
                        "flex-[1.5] py-2 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        image.publishedToCommunity
                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20'
                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
                    )}
                >
                    {!publishingId && <span className="text-sm">🏆</span>}
                    {image.publishedToCommunity ? 'Published to Community' : 'Publish to Community'}
                </Button>
                <Button
                    variant="secondary"
                    onClick={onDownload}
                    className="flex-[1.5] text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border-white/5 whitespace-nowrap"
                >
                    <Icons.download size={14} />
                    Download
                </Button>
                <Button
                    variant="danger"
                    onClick={onDelete}
                    disabled={deletingId === image.id}
                    isLoading={deletingId === image.id}
                    className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 flex items-center justify-center gap-2 opacity-80 hover:opacity-100 whitespace-nowrap"
                >
                    {deletingId === image.id ? 'Deleting...' : 'Delete'}
                </Button>
            </div>
        </div>
    );
}

