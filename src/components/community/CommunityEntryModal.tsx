'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CommunityEntry, BADGES, CommunityComment } from '@/lib/types';
import { formatDate } from '@/lib/date-utils';
import ReactionPicker from '@/components/ReactionPicker';
import ShareButtons from '@/components/ShareButtons';
import ConfirmationModal from '@/components/ConfirmationModal';
import CommentSection from './CommentSection';
import Tooltip from '@/components/Tooltip';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import CollectionSelector from '@/components/gallery/image-detail/CollectionSelector';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/Toast';
import TagManager from '@/components/gallery/image-detail/TagManager';
import { modalSlideUp, backdropFade } from '@/lib/animations';

interface CommunityEntryModalProps {
    entry: CommunityEntry;
    onClose: () => void;
    user: any;
    userRole?: string;
    onVote: (id: string) => void;
    isVoting: boolean;
    isFollowing: boolean;
    onToggleFollow: () => void;
    followLoading: boolean;
    comments: CommunityComment[];
    loadingComments: boolean;
    onAddComment: (text: string) => Promise<void>;
    onDeleteComment: (id: string) => Promise<void>;
    onReact: (id: string, emoji: string) => void;
    reactingEmoji?: string | null;
    onReport: (id: string) => Promise<void>;
    collections?: any[];
    onToggleCollection?: (collectionId: string) => Promise<void>;
    onCreateCollection?: (name: string) => Promise<any>;
    onUnpublish?: () => Promise<void>;
    isUnpublishing?: boolean;
    onFilterUser?: (userId: string, userName: string) => void;
    onShare?: (entryId: string) => void;
    viewerCollectionIds?: string[];
    loadingViewerCollections?: boolean;
    onAddTag?: (tag: string) => Promise<void>;
    onRemoveTag?: (tag: string) => Promise<void>;
    onUpdatePromptSetID?: (newId: string) => Promise<void>;
    isAdmin?: boolean;
    onToggleExemplar?: () => Promise<void>;
}

export default function CommunityEntryModal({
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
    reactingEmoji,
    onReport,
    collections,
    onToggleCollection,
    onCreateCollection,
    onUnpublish,
    isUnpublishing,
    onFilterUser,
    onShare,
    viewerCollectionIds = [],
    loadingViewerCollections = false,
    onAddTag,
    onRemoveTag,
    onUpdatePromptSetID,
    isAdmin,
    onToggleExemplar
}: CommunityEntryModalProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isSharing, setIsSharing] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [error, setError] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [isUpdatingPromptSetID, setIsUpdatingPromptSetID] = useState(false);
    const [isEditingBatch, setIsEditingBatch] = useState(false);
    const [batchValue, setBatchValue] = useState('');

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
        <motion.div
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            variants={backdropFade}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white z-[1010]"
            >
                <Icons.close size={24} />
            </button>

            <motion.div
                className="bg-black/50 border border-white/5 rounded-3xl w-full h-full flex flex-col overflow-hidden relative max-w-7xl mx-auto shadow-2xl"
                variants={modalSlideUp}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col lg:flex-row min-h-0 flex-1">
                    {/* Image / Video */}
                    <div className="flex-1 bg-[#050505] flex items-center justify-center p-4 overflow-hidden min-h-[400px] relative">
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
                    <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col min-h-0 bg-black/20 backdrop-blur-md">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex flex-col gap-4 bg-transparent">
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

                            <div className="flex items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                    {onFilterUser && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                onFilterUser(entry.originalUserId, entry.authorName);
                                                onClose();
                                            }}
                                            className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 border border-primary/10 transition-all gap-2"
                                        >
                                            <Icons.filter size={14} />
                                            Filter
                                        </Button>
                                    )}
                                </div>

                                {user && user.uid !== entry.originalUserId && (
                                    <Button
                                        onClick={onToggleFollow}
                                        isLoading={followLoading}
                                        size="sm"
                                        variant={isFollowing ? 'secondary' : 'primary'}
                                        className="h-9 uppercase text-[10px] tracking-widest px-4 font-black shadow-lg shadow-primary/10"
                                    >
                                        {isFollowing ? 'Following' : 'Follow Creator'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Unpublish Warning for Creator/Admin */}
                        {(user && (user.uid === entry.originalUserId || userRole === 'admin' || userRole === 'su')) && onUnpublish && (
                            <div className="px-6 py-3 bg-red-500/5 border-b border-red-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-red-500/70">
                                    <Icons.zap size={13} className="text-red-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authority Controls</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onUnpublish}
                                    isLoading={isUnpublishing}
                                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10 transition-all"
                                >
                                    <Icons.delete size={12} className="mr-2" />
                                    Purge Entry
                                </Button>
                            </div>
                        )}

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            {/* Prompt Card */}
                            <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 space-y-4 group/prompt relative overflow-hidden">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/prompt:opacity-100 transition-opacity pointer-events-none" />

                                <div className="space-y-2 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-primary uppercase tracking-[0.2em] font-black">Shared Prompt</label>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(entry.prompt);
                                                showToast('Prompt copied to clipboard', 'success');
                                            }}
                                            className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                                        >
                                            <Icons.copy size={14} />
                                        </button>
                                    </div>
                                    <p className="text-sm leading-relaxed text-white/90 font-medium">{entry.prompt}</p>
                                </div>

                                <Button
                                    onClick={() => {
                                        const sid = entry.promptSetID || entry.settings?.promptSetID;
                                        router.push(`/generate?ref=${entry.id}${sid ? `&sid=${sid}` : ''}`);
                                    }}
                                    variant="primary"
                                    size="sm"
                                    className="w-full gap-2 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 h-10 relative z-10"
                                >
                                    <Icons.wand className="w-4 h-4" />
                                    <span>Remix this Image</span>
                                </Button>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                                    <label className="text-[9px] text-white/40 uppercase tracking-widest font-black">Engine Quality</label>
                                    <p className="text-xs font-bold text-white/80 capitalize">{entry.settings.quality}</p>
                                </div>
                                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                                    <label className="text-[9px] text-white/40 uppercase tracking-widest font-black">Spatial Aspect</label>
                                    <p className="text-xs font-bold text-white/80">{entry.settings.aspectRatio}</p>
                                </div>
                                {entry.promptSetID || (user && user.uid === entry.originalUserId && onUpdatePromptSetID) ? (
                                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-2 col-span-2 group/batch">
                                        <label className="text-[9px] text-white/40 uppercase tracking-widest font-black flex items-center justify-between">
                                            Batch Signature
                                            {user && user.uid === entry.originalUserId && onUpdatePromptSetID && !isEditingBatch && (
                                                <button
                                                    onClick={() => {
                                                        setBatchValue(entry.promptSetID || '');
                                                        setIsEditingBatch(true);
                                                    }}
                                                    className="opacity-0 group-hover/batch:opacity-100 text-primary transition-opacity text-[8px]"
                                                >
                                                    Modify
                                                </button>
                                            )}
                                        </label>
                                        {isEditingBatch ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={batchValue}
                                                    onChange={(e) => setBatchValue(e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-primary text-white"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={async () => {
                                                        setIsUpdatingPromptSetID(true);
                                                        try {
                                                            await onUpdatePromptSetID?.(batchValue);
                                                            setIsEditingBatch(false);
                                                        } finally {
                                                            setIsUpdatingPromptSetID(false);
                                                        }
                                                    }}
                                                    disabled={isUpdatingPromptSetID}
                                                    className="text-[10px] font-bold text-primary hover:text-primary-hover disabled:opacity-50"
                                                >
                                                    {isUpdatingPromptSetID ? '...' : 'Save'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-mono text-white/50 truncate flex-1">
                                                    {entry.promptSetID || 'Individual Generation'}
                                                </p>
                                                {entry.promptSetID && (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(entry.promptSetID!);
                                                            showToast('Batch ID copied', 'success');
                                                        }}
                                                        className="text-white/20 hover:text-primary transition-colors"
                                                    >
                                                        <Icons.copy size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {entry.attributionName && (
                                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1 col-span-2 group/attribution">
                                        <label className="text-[9px] text-white/40 uppercase tracking-widest font-black flex items-center gap-2">
                                            <Icons.user size={10} className="text-primary/50" />
                                            Original Inspiration
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            {entry.attributionUrl ? (
                                                <a
                                                    href={entry.attributionUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-1.5"
                                                >
                                                    {entry.attributionName}
                                                    <Icons.external size={12} />
                                                </a>
                                            ) : (
                                                <p className="text-[11px] text-white/80 font-bold">{entry.attributionName}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {entry.originatorName && (
                                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1 col-span-2 group/originator">
                                        <label className="text-[9px] text-white/40 uppercase tracking-widest font-black flex items-center gap-2">
                                            <Icons.user size={10} className="text-primary/50" />
                                            Originator
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            {entry.originatorUrl ? (
                                                <a
                                                    href={entry.originatorUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-1.5"
                                                >
                                                    {entry.originatorName}
                                                    <Icons.external size={12} />
                                                </a>
                                            ) : (
                                                <p className="text-[11px] text-white/80 font-bold">{entry.originatorName}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Collections Section */}
                            {user && collections && onToggleCollection && onCreateCollection ? (
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Icons.stack size={14} className="text-foreground-muted" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                                                {user.uid === entry.originalUserId ? 'Your Entry Collections' : 'Save to Collection'}
                                            </span>
                                        </div>
                                        {loadingViewerCollections && (
                                            <Icons.spinner size={12} className="animate-spin text-primary" />
                                        )}
                                    </div>

                                    <CollectionSelector
                                        collections={collections}
                                        selectedIds={user.uid === entry.originalUserId ? (entry.collectionIds || []) : viewerCollectionIds}
                                        onToggle={onToggleCollection}
                                        onCreate={onCreateCollection}
                                    />
                                </div>
                            ) : (entry.collectionNames && entry.collectionNames.length > 0) ? (
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-black block">Author&apos;s Collections</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry.collectionNames.map(name => (
                                            <Badge key={name} variant="outline" className="text-[10px] py-0 px-2 h-5 border-primary/20 bg-primary/5 text-primary">
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* Tags */}
                            {(entry.tags && entry.tags.length > 0) || (user && user.uid === entry.originalUserId && onAddTag) ? (
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    {user && user.uid === entry.originalUserId && onAddTag && onRemoveTag ? (
                                        <TagManager
                                            tags={entry.tags || []}
                                            newTag={newTag}
                                            isUpdating={isUpdatingTags}
                                            onAdd={async () => {
                                                if (!newTag.trim()) return;
                                                setIsUpdatingTags(true);
                                                try {
                                                    await onAddTag(newTag.trim());
                                                    setNewTag('');
                                                } finally {
                                                    setIsUpdatingTags(false);
                                                }
                                            }}
                                            onRemove={async (tag) => {
                                                setIsUpdatingTags(true);
                                                try {
                                                    await onRemoveTag(tag);
                                                } finally {
                                                    setIsUpdatingTags(false);
                                                }
                                            }}
                                            onChangeNewTag={setNewTag}
                                        />
                                    ) : (
                                        <>
                                            <label className="text-[10px] text-foreground-muted uppercase tracking-widest font-black block">Tags</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {entry.tags?.map(tag => (
                                                    <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2 h-5 bg-background-secondary border-border/50">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : null}

                            {/* Exemplar Badge — Admin Only */}
                            {isAdmin && onToggleExemplar && (
                                <div className="pt-2 border-t border-border/50">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={onToggleExemplar}
                                        className={`w-full justify-between h-9 text-[10px] uppercase font-black tracking-widest transition-all ${entry.isExemplar
                                            ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10"
                                            : "text-foreground-muted hover:bg-background-secondary"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icons.exemplar size={14} className={entry.isExemplar ? "fill-current" : ""} />
                                            <span>Exemplar</span>
                                        </div>
                                        {entry.isExemplar ? "Active" : "Off"}
                                    </Button>
                                </div>
                            )}

                            {/* Vote + Share Actions */}
                            <div className="flex flex-col gap-4 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <Tooltip content={hasVoted ? 'Remove vote' : 'Appreciate this generation'} className="flex-1">
                                        <Button
                                            onClick={() => onVote(entry.id)}
                                            isLoading={isVoting}
                                            variant={hasVoted ? 'primary' : 'outline'}
                                            className="w-full gap-2 font-black uppercase text-[11px] tracking-widest h-12 shadow-lg shadow-primary/5 transition-all active:scale-95"
                                        >
                                            <Icons.heart className={cn("w-5 h-5", hasVoted && "fill-current")} />
                                            <span>{entry.voteCount} Appreciations</span>
                                        </Button>
                                    </Tooltip>
                                    {(entry.variationCount || 0) > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary rounded-lg border border-secondary/20">
                                            <Icons.variation className="w-4 h-4" />
                                            <span className="text-sm font-bold">{entry.variationCount}</span>
                                            <span className="text-[10px] uppercase tracking-wider font-black opacity-60 ml-1">Variations</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <ReactionPicker
                                            entryId={entry.id}
                                            reactions={entry.reactions || {}}
                                            onReact={(emoji) => onReact(entry.id, emoji)}
                                            isReactingEmoji={reactingEmoji}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <ShareButtons
                                            entryId={entry.id}
                                            imageUrl={entry.imageUrl}
                                            prompt={entry.prompt}
                                            onShare={onShare}
                                        />

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
                            <div className="pt-6 border-t border-white/5">
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
            </motion.div>

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
        </motion.div >
    );
}
