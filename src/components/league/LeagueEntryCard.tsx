
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LeagueEntry, BADGES } from '@/lib/types';
import ReactionPicker from '@/components/ReactionPicker';
import ShareButtons from '@/components/ShareButtons';
import { formatTimeAgo } from '@/lib/date-utils';
import Tooltip from '@/components/Tooltip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';

interface LeagueEntryCardProps {
    entry: LeagueEntry;
    userId?: string;
    onVote: (entryId: string) => void;
    isVoting: boolean;
    onSelect: (entry: LeagueEntry) => void;
    onReact: (entryId: string, emoji: string, reacted: boolean) => void;
}

export default function LeagueEntryCard({
    entry,
    userId,
    onVote,
    isVoting,
    onSelect,
    onReact
}: LeagueEntryCardProps) {
    const [error, setError] = useState(false);
    const hasVoted = userId ? entry.votes?.[userId] === true : false;
    const isVid = !!(entry.videoUrl || entry.settings?.modality === 'video');

    return (
        <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5" variant="glass">
            {/* Image / Video */}
            <div
                className="aspect-square relative cursor-pointer overflow-hidden"
                onClick={() => onSelect(entry)}
                onMouseEnter={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video && video.paused) video.play().catch(() => { });
                }}
                onMouseLeave={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) { video.pause(); video.currentTime = 0; }
                }}
            >
                {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-background-secondary p-4 text-foreground-muted">
                        <Icons.error className="w-10 h-10 opacity-20 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Media Unavailable</span>
                    </div>
                ) : (() => {
                    const imgIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(entry.imageUrl || '');
                    const hasThumbnail = isVid && !imgIsVideo;
                    return isVid ? (
                        hasThumbnail ? (
                            <>
                                <img src={entry.imageUrl} alt={entry.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={() => setError(true)} />
                                <video src={entry.videoUrl || entry.imageUrl} className="absolute inset-0 w-full h-full object-cover z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-300" muted loop playsInline preload="metadata" onError={() => setError(true)} />
                            </>
                        ) : (
                            <video src={entry.videoUrl || entry.imageUrl} className="w-full h-full object-cover" muted loop playsInline preload="metadata" onError={() => setError(true)} />
                        )
                    ) : (
                        <img src={entry.imageUrl} alt={entry.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={() => setError(true)} />
                    );
                })()}

                {/* Duration / Video badge */}
                {(entry.videoUrl || entry.settings?.modality === 'video') && (
                    <div className="absolute bottom-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg shadow-lg border border-white/10 flex items-center gap-1.5 min-w-[40px] justify-center pointer-events-none">
                        {entry.duration ? (
                            <span className="text-[11px] font-bold font-mono">
                                0:{Math.round(entry.duration).toString().padStart(2, '0')}
                            </span>
                        ) : (
                            <Icons.sparkles className="w-3.5 h-3.5" />
                        )}
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm line-clamp-2">{entry.prompt}</p>
                    </div>
                </div>
            </div>

            {/* Card Footer */}
            <div className="p-4 space-y-3">
                {/* Author Row */}
                <Link
                    href={`/profile/${entry.originalUserId}`}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity group/author"
                    onClick={(e) => e.stopPropagation()}
                >
                    {entry.authorPhotoURL ? (
                        <img
                            src={entry.authorPhotoURL}
                            alt={entry.authorName}
                            className="w-7 h-7 rounded-full border border-border group-hover/author:border-primary/50 transition-colors"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-transparent group-hover/author:border-primary/50 transition-colors">
                            {entry.authorName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm font-medium truncate flex-1 group-hover/author:text-primary transition-colors">{entry.authorName}</span>
                    <div className="flex gap-1">
                        {(entry.authorBadges || []).map(badgeId => (
                            <Tooltip key={badgeId} content={BADGES[badgeId]?.label || 'Award'}>
                                <span className="text-xs">
                                    {BADGES[badgeId]?.icon}
                                </span>
                            </Tooltip>
                        ))}
                    </div>
                    <span className="text-xs text-foreground-muted">{formatTimeAgo(entry.publishedAt)}</span>
                </Link>

                {/* Actions Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tooltip content={hasVoted ? 'Remove your vote' : 'Vote for this creation'}>
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onVote(entry.id);
                                }}
                                isLoading={isVoting}
                                size="sm"
                                variant={hasVoted ? 'primary' : 'outline'}
                                className="gap-1.5 font-bold"
                            >
                                <Icons.heart className={hasVoted ? 'fill-current' : ''} size={16} />
                                <span>{entry.voteCount}</span>
                            </Button>
                        </Tooltip>

                        <Tooltip content="View comments & details">
                            <Button
                                onClick={() => onSelect(entry)}
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-foreground-muted hover:text-foreground"
                            >
                                <Icons.comment size={16} />
                                <span>{entry.commentCount}</span>
                            </Button>
                        </Tooltip>
                    </div>

                    {/* Share */}
                    <ShareButtons imageUrl={entry.imageUrl} prompt={entry.prompt} className="scale-75 origin-right" />
                </div>

                {/* Reactions Row */}
                <div className="pt-2 border-t border-border/50">
                    <ReactionPicker
                        entryId={entry.id}
                        reactions={entry.reactions || {}}
                        onReact={(emoji, reacted) => onReact(entry.id, emoji, reacted)}
                    />
                </div>
            </div>
        </Card>
    );
}
