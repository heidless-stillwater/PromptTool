'use client';

import Link from 'next/link';
import { GeneratedImage } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { useRef } from 'react';

interface GalleryProps {
    images: GeneratedImage[];
}

function GalleryItem({ image }: { image: GeneratedImage }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isVid = !!(image.videoUrl || image.settings?.modality === 'video');

    const handleMouseEnter = () => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => { });
        }
    };

    const handleMouseLeave = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <Link
            href={`/generate?ref=${image.id}`}
            className="flex-shrink-0 w-64 group snap-start"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden relative mb-3 border border-white/10 shadow-sm group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/50 transition-all duration-500 transform group-hover:-translate-y-1">
                {isVid ? (
                    <div className="w-full h-full relative overflow-hidden">
                        <video
                            ref={videoRef}
                            src={`${image.videoUrl || image.imageUrl}#t=0.01`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        />
                        <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white p-2 rounded-xl shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                            <Icons.video size={16} className="text-white" />
                        </div>
                    </div>
                ) : (
                    <img
                        src={image.imageUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                    <p className="text-white text-xs font-medium line-clamp-3 italic mb-3 leading-relaxed">
                        &quot;{image.prompt}&quot;
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/30 text-[9px] font-black text-primary uppercase tracking-widest">
                            Remix DNA
                        </div>
                    </div>
                </div>

                <div className="absolute top-3 left-3 z-10 bg-primary/80 backdrop-blur-md text-white p-1.5 rounded-lg shadow-lg border border-white/10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-300">
                    <Icons.history size={12} className="text-white" />
                </div>
            </div>
            <div className="px-1">
                <h3 className="text-[10px] uppercase tracking-widest font-black truncate text-white/90 group-hover:text-primary transition-colors">
                    Your Masterpiece
                </h3>
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-1">
                    {isVid ? 'Recent Motion' : 'Recent Creation'}
                </p>
            </div>
        </Link>
    );
}

export default function Gallery({ images }: GalleryProps) {
    if (images.length === 0) return null;

    return (
        <div className="mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                        <Icons.image size={20} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white/90">Your Gallery</h2>
                        <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-1">Recent Successes</p>
                    </div>
                </div>
                <Link href="/gallery">
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-primary font-black text-[10px] uppercase tracking-widest group border border-white/5 hover:border-primary/30 rounded-xl px-4">
                        View Full Gallery
                        <Icons.arrowRight size={14} className="ml-2 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                    </Button>
                </Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x -mx-4 px-4 mask-fade-right">
                {images.slice(0, 10).map((image) => (
                    <GalleryItem key={image.id} image={image} />
                ))}
            </div>
        </div>
    );
}
