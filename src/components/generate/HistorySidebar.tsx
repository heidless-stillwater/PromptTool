'use client';

import { GeneratedImage } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    images: GeneratedImage[];
    loading: boolean;
    onRemix: (image: GeneratedImage) => void;
}

export default function HistorySidebar({
    isOpen,
    onClose,
    images,
    loading,
    onRemix
}: HistorySidebarProps) {
    return (
        <div className={cn(
            "fixed inset-0 z-[1000] transition-opacity duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}>
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />
            <div className={cn(
                "absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-[#050508] border-l border-white/5 transition-transform duration-500 ease-out flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Neural History</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-2">Chronological Cache</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/50 hover:text-white"
                    >
                        <Icons.close size={20} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading && images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-white/20 gap-4">
                            <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing Cache...</p>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="text-center py-24 px-8 border border-dashed border-white/5 rounded-[32px]">
                            <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/5">
                                <Icons.history className="w-8 h-8 text-white/10" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Vault Empty</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">Synchronized masterpieces will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {images.map((img) => (
                                <div
                                    key={img.id}
                                    className="group relative rounded-[24px] overflow-hidden border border-white/10 bg-white/[0.03] hover:border-primary/40 transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] cursor-pointer"
                                    onClick={() => onRemix(img)}
                                >
                                    <div className="aspect-square relative overflow-hidden bg-black group/media">
                                        {(() => {
                                            const isVideo = !!(img.settings?.modality === 'video' || img.videoUrl || /\.(mp4|webm|mov)(\?|$)/i.test(img.imageUrl));
                                            const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(img.imageUrl);
                                            const hasThumbnail = isVideo && !imgIsVideo;
                                            const videoSrc = (img.videoUrl || img.imageUrl);
                                            const videoSrcWithTime = videoSrc?.includes('#t=') ? videoSrc : `${videoSrc}#t=0.1`;

                                            if (isVideo) {
                                                if (hasThumbnail) {
                                                    return (
                                                        <>
                                                            <img
                                                                src={img.imageUrl}
                                                                alt=""
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110"
                                                            />
                                                            <video
                                                                src={videoSrcWithTime}
                                                                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/media:opacity-100 transition-opacity duration-300"
                                                                loop
                                                                muted
                                                                playsInline
                                                                preload="metadata"
                                                                onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
                                                            />
                                                        </>
                                                    );
                                                }
                                                return (
                                                    <video
                                                        src={videoSrcWithTime}
                                                        className="w-full h-full object-cover"
                                                        loop
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                        onMouseEnter={(e) => { e.currentTarget.play().catch(() => { }) }}
                                                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.1; }}
                                                    />
                                                );
                                            }
                                            return (
                                                <img
                                                    src={img.imageUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110"
                                                />
                                            );
                                        })()}
                                        {(img.settings?.modality === 'video' || img.videoUrl) && (
                                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-xl text-white shadow-lg border border-white/10 z-10 transition-transform group-hover:scale-110">
                                                <Icons.video size={12} className="text-white" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="w-full bg-primary text-white font-black uppercase tracking-widest text-[9px] h-10 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                                            >
                                                Load Snapshot
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/[0.02]">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary-light bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                                                {img.settings?.quality || 'Standard'}
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">
                                                {img.createdAt?.toDate?.() ? new Date(img.createdAt.toDate()).toLocaleDateString() : 'Active Session'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 line-clamp-2 leading-relaxed italic">
                                            &quot;{img.prompt}&quot;
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
