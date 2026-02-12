
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LeagueEntry, BADGES, LeagueComment } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import ReactionPicker from '@/components/ReactionPicker';
import ShareButtons from '@/components/ShareButtons';
import ConfirmationModal from '@/components/ConfirmationModal';
import CommentSection from './CommentSection';

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
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                    {/* Image */}
                    <div className="flex-1 bg-background-secondary flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
                        <img
                            src={entry.imageUrl}
                            alt={entry.prompt}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                        />
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border flex flex-col min-h-0">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex justify-between items-start">
                            <Link
                                href={`/profile/${entry.originalUserId}`}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity group/modal-author"
                            >
                                {entry.authorPhotoURL ? (
                                    <img
                                        src={entry.authorPhotoURL}
                                        alt={entry.authorName}
                                        className="w-10 h-10 rounded-full border-2 border-primary"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20 group-hover/modal-author:border-primary transition-colors">
                                        {entry.authorName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold group-hover/modal-author:text-primary transition-colors">{entry.authorName}</p>
                                        <div className="flex gap-1">
                                            {(entry.authorBadges || []).map(badgeId => (
                                                <span key={badgeId} title={BADGES[badgeId]?.label} className="text-sm">
                                                    {BADGES[badgeId]?.icon}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-foreground-muted">{formatDate(entry.publishedAt)}</p>
                                </div>
                            </Link>

                            <div className="flex items-center gap-2">
                                {user && user.uid !== entry.originalUserId && (
                                    <button
                                        onClick={onToggleFollow}
                                        disabled={followLoading}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isFollowing
                                            ? 'bg-background-secondary text-foreground-muted hover:text-error hover:bg-error/10 border border-border hover:border-error/30'
                                            : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95'
                                            }`}
                                    >
                                        {followLoading ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : isFollowing ? (
                                            'Following'
                                        ) : (
                                            'Follow'
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-background-secondary rounded-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {/* Prompt */}
                            <div>
                                <label className="text-xs text-foreground-muted uppercase tracking-wide">Prompt</label>
                                <p className="text-sm mt-1">{entry.prompt}</p>
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-foreground-muted uppercase tracking-wide">Quality</label>
                                    <p className="text-sm mt-1 capitalize">{entry.settings.quality}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-foreground-muted uppercase tracking-wide">Aspect</label>
                                    <p className="text-sm mt-1">{entry.settings.aspectRatio}</p>
                                </div>
                            </div>

                            {/* Vote + Share Actions */}
                            <div className="flex items-center gap-3 pt-2 border-t border-border">
                                <button
                                    onClick={() => onVote(entry.id)}
                                    disabled={isVoting}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 justify-center ${hasVoted
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover'
                                        : 'bg-background-secondary hover:bg-primary/10 text-foreground-muted hover:text-primary border border-border hover:border-primary/50'
                                        }`}
                                >
                                    {isVoting ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    )}
                                    <span>{entry.voteCount} {entry.voteCount === 1 ? 'vote' : 'votes'}</span>
                                </button>

                                <div className="py-2 border-t border-border">
                                    <ReactionPicker
                                        entryId={entry.id}
                                        reactions={entry.reactions || {}}
                                        onReact={(emoji, reacted) => onReact(entry.id, emoji, reacted)}
                                    />
                                </div>

                                <ShareButtons imageUrl={entry.imageUrl} prompt={entry.prompt} />

                                {/* Report Button */}
                                {user && user.uid !== entry.originalUserId && (
                                    <button
                                        onClick={() => setShowReportModal(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-foreground-muted hover:text-error hover:bg-error/10 border border-border hover:border-error/30 transition-all group/report"
                                        title="Report content"
                                    >
                                        <svg className="w-5 h-5 group-hover/report:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9" />
                                        </svg>
                                        <span className="text-xs font-bold">Report</span>
                                    </button>
                                )}
                            </div>

                            {/* Comments Section */}
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
