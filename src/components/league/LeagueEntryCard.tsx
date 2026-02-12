
'use client';

import Link from 'next/link';
import { LeagueEntry, BADGES } from '@/lib/types';
import ReactionPicker from '@/components/ReactionPicker';
import ShareButtons from '@/components/ShareButtons';
import { formatTimeAgo } from '@/lib/date-utils';

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
    const hasVoted = userId ? entry.votes?.[userId] === true : false;

    return (
        <div className="glass-card rounded-2xl overflow-hidden group hover:ring-2 hover:ring-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5">
            {/* Image */}
            <div
                className="aspect-square relative cursor-pointer overflow-hidden"
                onClick={() => onSelect(entry)}
            >
                <img
                    src={entry.imageUrl}
                    alt={entry.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
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
                            <span key={badgeId} title={BADGES[badgeId]?.label} className="text-xs">
                                {BADGES[badgeId]?.icon}
                            </span>
                        ))}
                    </div>
                    <span className="text-xs text-foreground-muted">{formatTimeAgo(entry.publishedAt)}</span>
                </Link>

                {/* Actions Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Vote Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onVote(entry.id);
                            }}
                            disabled={isVoting}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${hasVoted
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover'
                                : 'bg-background-secondary hover:bg-primary/10 text-foreground-muted hover:text-primary border border-border hover:border-primary/50'
                                }`}
                        >
                            {isVoting ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            )}
                            <span>{entry.voteCount}</span>
                        </button>

                        {/* Comment Count */}
                        <button
                            onClick={() => onSelect(entry)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-background-secondary hover:bg-background-secondary/80 text-foreground-muted hover:text-foreground border border-border transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{entry.commentCount}</span>
                        </button>
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
        </div>
    );
}
