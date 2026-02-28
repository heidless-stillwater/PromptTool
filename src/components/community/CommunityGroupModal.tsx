import { CommunityEntry } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import React, { useState } from 'react';
import { Icons } from '@/components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import SmartImage from '@/components/SmartImage';
import SmartVideo from '@/components/SmartVideo';

interface CommunityGroupModalProps {
    selectedGroup: CommunityEntry[];
    onClose: () => void;
    onEntrySelect: (entry: CommunityEntry) => void;
}

export default function CommunityGroupModal({
    selectedGroup,
    onClose,
    onEntrySelect
}: CommunityGroupModalProps) {
    const [gridSize, setGridSize] = useState<'sm' | 'md' | 'lg'>('md');
    const [copied, setCopied] = useState(false);

    if (!selectedGroup || selectedGroup.length === 0) return null;

    const firstEntry = selectedGroup[0];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[1010]"
            >
                <Icons.close size={24} />
            </button>

            <div
                className="bg-black/50 border border-white/5 rounded-3xl w-full h-full flex flex-col overflow-hidden relative max-w-7xl mx-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-transparent z-10 gap-4 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-primary">Batch Showcase</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <p className="text-sm text-foreground-muted">
                                {selectedGroup.length} entries • {formatDate(firstEntry.publishedAt)}
                            </p>
                            {firstEntry.isExemplar && (
                                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded-full border border-yellow-500/30 flex items-center gap-1">
                                    <Icons.exemplar size={12} className="fill-current" />
                                    Exemplar Batch
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 shadow-inner">
                            <button
                                onClick={() => setGridSize('sm')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    gridSize === 'sm' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                title="Compact View"
                            >
                                <Icons.grid size={14} className="opacity-70" />
                            </button>
                            <button
                                onClick={() => setGridSize('md')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    gridSize === 'md' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                title="Standard View"
                            >
                                <Icons.grid size={18} />
                            </button>
                            <button
                                onClick={() => setGridSize('lg')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    gridSize === 'lg' ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                title="Large View"
                            >
                                <Icons.image size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {/* Prompt Header Card */}
                    <div className="mb-8 p-6 bg-background-secondary/50 rounded-2xl border border-white/5 flex gap-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                            <SmartImage src={firstEntry.imageUrl} alt="Batch Preview" className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Shared Batch Prompt</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(firstEntry.prompt);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                                >
                                    {copied ? <Icons.check size={14} className="text-emerald-500" /> : <Icons.copy size={14} />}
                                </button>
                            </div>
                            <p className="text-sm font-medium text-white/80 line-clamp-2 leading-relaxed">
                                {firstEntry.prompt}
                            </p>
                        </div>
                    </div>

                    <div className={cn(
                        "grid gap-6 transition-all duration-500",
                        gridSize === 'sm' ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" :
                            gridSize === 'md' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" :
                                "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
                    )}>
                        {selectedGroup.map((entry) => {
                            const isVideo = !!entry.videoUrl;
                            return (
                                <motion.div
                                    key={entry.id}
                                    layoutId={`community-group-${entry.id}`}
                                    onClick={() => onEntrySelect(entry)}
                                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-[#050505] border border-white/5 hover:border-primary/50 transition-all shadow-xl hover:shadow-primary/10"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity z-10" />

                                    {isVideo ? (
                                        <SmartVideo
                                            src={entry.videoUrl || entry.imageUrl}
                                            poster={entry.imageUrl}
                                            className="w-full h-full object-cover"
                                            loop
                                            muted
                                            autoPlay
                                        />
                                    ) : (
                                        <SmartImage
                                            src={entry.imageUrl}
                                            alt={entry.prompt}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    )}

                                    {/* Stats overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex items-center justify-between pointer-events-none translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/90">
                                                <Icons.heart size={12} className="text-primary fill-primary" />
                                                {entry.voteCount || 0}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/90">
                                                <Icons.comment size={12} className="text-accent" />
                                                {entry.commentCount || 0}
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-primary/20 backdrop-blur-md px-2 py-1 rounded-lg border border-primary/30 text-primary">
                                            View Details
                                        </span>
                                    </div>

                                    {/* Entry Badges */}
                                    <div className="absolute top-3 left-3 z-30 flex flex-col gap-2">
                                        {entry.isExemplar && (
                                            <div className="bg-amber-500 text-black p-1 rounded-lg shadow-lg">
                                                <Icons.exemplar size={12} />
                                            </div>
                                        )}
                                        {isVideo && (
                                            <div className="bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 text-white">
                                                <Icons.video size={12} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
