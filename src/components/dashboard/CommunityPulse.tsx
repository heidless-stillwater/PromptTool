'use client';

import Link from 'next/link';
import { CommunityEntry } from '@/lib/types';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useRef } from 'react';

interface CommunityPulseProps {
    entries: CommunityEntry[];
}

function PulseItem({ entry }: { entry: CommunityEntry }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isVid = !!(entry.videoUrl || entry.settings?.modality === 'video');

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
            href={`/community?entry=${entry.id}`}
            className="flex-shrink-0 w-72 group snap-start"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="aspect-video rounded-2xl overflow-hidden relative mb-3 border border-white/10 shadow-sm group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/50 transition-all duration-300">
                {isVid ? (
                    <div className="w-full h-full relative overflow-hidden">
                        <video
                            ref={videoRef}
                            src={`${entry.videoUrl || entry.imageUrl}#t=0.01`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        />
                        <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-lg shadow-lg border border-white/10 group-hover:scale-110 transition-transform">
                            <Icons.video size={14} className="text-white" />
                        </div>
                    </div>
                ) : (
                    <img
                        src={entry.imageUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="flex items-center gap-2 w-full">
                        {entry.authorPhotoURL && entry.authorPhotoURL !== 'null' ? (
                            <img src={entry.authorPhotoURL} alt={entry.authorName || 'User'} className="w-6 h-6 rounded-full border border-white/20" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/40 flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                                {(entry.authorName || 'A').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="text-white text-xs font-bold truncate">by {entry.authorName}</span>
                    </div>
                </div>
            </div>
            <p className="text-[10px] font-bold text-white/50 line-clamp-1 group-hover:text-white transition-colors px-1 uppercase tracking-widest mt-2">
                &quot;{entry.prompt}&quot;
            </p>
        </Link>
    );
}

export default function CommunityPulse({ entries }: CommunityPulseProps) {
    if (entries.length === 0) return null;

    return (
        <div className="mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Icons.zap size={20} className="text-orange-500 fill-orange-500 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white/90">Community Pulse</h2>
                        <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-1">Trending Creations</p>
                    </div>
                </div>
                <Link href="/community">
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-primary font-black text-[10px] uppercase tracking-widest group border border-white/5 hover:border-primary/30 rounded-xl px-4">
                        Live Community
                        <Icons.arrowRight size={14} className="ml-2 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                    </Button>
                </Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x -mx-4 px-4 mask-fade-right">
                {entries.map((entry) => (
                    <PulseItem key={entry.id} entry={entry} />
                ))}
            </div>
        </div>
    );
}
