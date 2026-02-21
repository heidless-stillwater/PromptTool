'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LeagueEntry, BADGES, LeagueComment } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import ReactionPicker from '@/components/ReactionPicker';
import ShareButtons from '@/components/ShareButtons';
import ConfirmationModal from '@/components/ConfirmationModal';
import CommentSection from './CommentSection';
import Tooltip from '@/components/Tooltip';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface LeagueEntryModalProps {
    entry: LeagueEntry;
    onClose: () => void;
    user: any;
    userRole?: string;
    onVote: (id: string) => void;
    isVoting: boolean;
    isFollowing: boolean;
    onToggleFollow: () => void;
    followLoading: boolean;
    comments: LeagueComment[];
    loadingComments: boolean;
    onAddComment: (text: string) => Promise<void>;
    onDeleteComment: (id: string) => Promise<void>;
    onReact: (id: string, emoji: string, reacted: boolean) => void;
    onReport: (id: string) => Promise<void>;
}

export default function LeagueEntryModal({
    entry,
    onClose,
    user,
    userRole,
    onVote,
    isVoting,
    isFollowing,
    onToggleFollow,
    followLoading,
    comments,
    loadingComments,
    onAddComment,
    onDeleteComment,
    onReact,
    onReport
}: LeagueEntryModalProps) {
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [error, setError] = useState(false);

    const handleConfirmReport = async () => {
        setIsReporting(true);
        try {
            await onReport(entry.id);
            setShowReportModal(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsReporting(false);
        }
    };

    const hasVoted = user && entry.votes?.[user.uid];

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                    {/* Image / Video */}
                    <div className="flex-1 bg-background-secondary flex items-center justify-center p-4 overflow-hidden min-h-[300px] relative">
                        {(() => {
                            if (error) {
                                return (
                                    <div className="flex flex-col items-center justify-center text-foreground-muted">
                                        <Icons.error className="w-16 h-16 opacity-20 mb-3" />
                                        <span className="text-xs font-black uppercase tracking-widest opacity-40">Media Unavailable</span>
                                    </div>
                                );
                            }
                            const isVid = !!(entry.videoUrl || entry.settings?.modality === 'video');
                            if (isVid) {
                                return (
                                    <video
                                        src={entry.videoUrl || entry.imageUrl}
                                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                        controls
                                        loop
                                        muted
                                        playsInline
                                        preload="auto"
                                        onError={() => setError(true)}
                                    />
                                );
                            }
                            return (
                                <img
                                    src={entry.imageUrl}
                                    alt={entry.prompt}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                    onError={() => setError(true)}
                                />
                            );
                        })()}
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border flex flex-col min-h-0 bg-background/50">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex justify-between items-start bg-card/50">
                            <Link
                                href={`/profile/${entry.originalUserId}`}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity group/modal-author"
                            >
                                {entry.authorPhotoURL && entry.authorPhotoURL !== 'null' ? (
                                    <img
                                        src={entry.authorPhotoURL}
                                        alt={entry.authorName || 'User'}
                                        className="w-10 h-10 rounded-full border-2 border-primary shadow-sm"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20 group-hover/modal-author:border-primary transition-colors">
                                        {(entry.authorName || 'A').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold group-hover/modal-author:text-primary transition-colors">{entry.authorName}</p>
                                        <div className="flex gap-1">
                                            {(entry.authorBadges || []).map(badgeId => (
                                                <Tooltip key={badgeId} content={BADGES[badgeId]?.label || 'Award'}>
                                                    <span className="text-sm">
                                                        {BADGES[badgeId]?.icon}
                                                    </span>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground-muted">{formatDate(entry.publishedAt)}</p>
                                </div>
                            </Link>

                            <div className="flex items-center gap-2">
                                {user && user.uid !== entry.originalUserId && (
                                    <Tooltip content={isFollowing ? 'Unfollow' : 'Follow'} position="bottom">
                                        <Button
                                            onClick={onToggleFollow}
                                            isLoading={followLoading}
                                            size="sm"
                                            variant={isFollowing ? 'secondary' : 'primary'}
                                            className="uppercase text-[10px] tracking-widest px-3 py-1 font-black"
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Button>
                                    </Tooltip>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="p-1 hover:bg-background-secondary rounded-lg"
                                >
                                    <Icons.close size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {/* Prompt */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-black">Prompt</label>
                                <p className="text-sm leading-relaxed text-foreground/90">{entry.prompt}</p>
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-black">Quality</label>
                                    <p className="text-sm font-medium capitalize">{entry.settings.quality}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-black">Aspect</label>
                                    <p className="text-sm font-medium">{entry.settings.aspectRatio}</p>
                                </div>
                            </div>

                            {/* Vote + Share Actions */}
                            <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                                <div className="flex items-center gap-3">
                                    <Tooltip content={hasVoted ? 'Remove vote' : 'Vote'} className="flex-1">
                                        <Button
                                            onClick={() => onVote(entry.id)}
                                            isLoading={isVoting}
                                            variant={hasVoted ? 'primary' : 'outline'}
                                            className="w-full gap-2 font-bold"
                                        >
                                            <Icons.heart className={cn("w-5 h-5", hasVoted && "fill-current")} />
                                            <span>{entry.voteCount} {entry.voteCount === 1 ? 'vote' : 'votes'}</span>
                                        </Button>
                                    </Tooltip>

                                    <Tooltip content="Create variation" className="flex-1">
                                        <Button
                                            onClick={() => {
                                                window.location.href = `/generate?ref=${entry.id}`;
                                            }}
                                            variant="outline"
                                            className="w-full gap-2 font-bold text-foreground-muted hover:text-primary transition-colors"
                                        >
                                            <Icons.variation className="w-5 h-5" />
                                            <span>Variation</span>
                                        </Button>
                                    </Tooltip>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <ReactionPicker
                                            entryId={entry.id}
                                            reactions={entry.reactions || {}}
                                            onReact={(emoji, reacted) => onReact(entry.id, emoji, reacted)}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <ShareButtons entryId={entry.id} imageUrl={entry.imageUrl} prompt={entry.prompt} />

                                        <Tooltip content="Report" position="left">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowReportModal(true)}
                                                className="text-foreground-muted hover:text-error hover:bg-error/10 transition-colors group/report"
                                            >
                                                <Icons.report className="w-5 h-5 group-hover/report:scale-110 transition-transform" />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="pt-4 border-t border-border/50">
                                <CommentSection
                                    entryId={entry.id}
                                    comments={comments}
                                    loading={loadingComments}
                                    user={user}
                                    userRole={userRole}
                                    onAddComment={onAddComment}
                                    onDeleteComment={onDeleteComment}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showReportModal}
                title="Report Content"
                message="Are you sure you want to report this content for moderation? This action will notify our staff to review the entry."
                confirmLabel="Report"
                onConfirm={handleConfirmReport}
                onCancel={() => setShowReportModal(false)}
                isLoading={isReporting}
                type="warning"
            />
        </div>
    );
}
