
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LeagueComment, BADGES } from '@/lib/types';
import { formatTimeAgo } from '@/lib/date-utils';
import { useToast } from '@/components/Toast';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CommentSectionProps {
    entryId: string;
    comments: LeagueComment[];
    loading: boolean;
    user: any; // User type from firebase/auth
    userRole?: string;
    onAddComment: (text: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
}

export default function CommentSection({
    entryId,
    comments,
    loading,
    user,
    userRole,
    onAddComment,
    onDeleteComment
}: CommentSectionProps) {
    const router = useRouter();
    const { showToast } = useToast();

    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Mention state
    const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);

    // Handle submitting
    const handleSubmit = async () => {
        if (!newComment.trim() || submitting) return;
        setSubmitting(true);
        try {
            await onAddComment(newComment);
            setNewComment('');
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    // Mention logic
    useEffect(() => {
        const checkMentions = async () => {
            const lastAtIdx = newComment.lastIndexOf('@', cursorPos - 1);
            if (lastAtIdx === -1) {
                setShowSuggestions(false);
                return;
            }

            const queryText = newComment.substring(lastAtIdx + 1, cursorPos);
            const beforeAt = lastAtIdx === 0 ? '' : newComment[lastAtIdx - 1];

            if (queryText.includes(' ') || (beforeAt !== '' && !/\s/.test(beforeAt))) {
                setShowSuggestions(false);
                return;
            }

            if (queryText.length >= 1) {
                try {
                    const token = await user?.getIdToken();
                    if (!token) return;

                    const res = await fetch(`/api/user/search?q=${queryText}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (data.users?.length > 0) {
                        setMentionSuggestions(data.users);
                        setShowSuggestions(true);
                        setSuggestionIndex(0);
                    } else {
                        setShowSuggestions(false);
                    }
                } catch (err) {
                    console.error('Mention search failed:', err);
                    setShowSuggestions(false);
                }
            } else {
                setShowSuggestions(false);
            }
        };

        const timeoutId = setTimeout(checkMentions, 300);
        return () => clearTimeout(timeoutId);
    }, [newComment, cursorPos, user]);

    const handleSelectMention = (username: string) => {
        const lastAtIdx = newComment.lastIndexOf('@', cursorPos - 1);
        const before = newComment.substring(0, lastAtIdx);
        const after = newComment.substring(cursorPos);
        const updated = `${before}@${username} ${after}`;
        setNewComment(updated);
        setShowSuggestions(false);
    };

    const renderCommentText = (text: string) => {
        const mentionRegex = /@([a-z0-9_]{3,20})/g;
        const matches = Array.from(text.matchAll(mentionRegex));
        if (matches.length === 0) return text;

        const elements: (string | JSX.Element)[] = [];
        let currentPos = 0;

        matches.forEach((match, i) => {
            if (match.index! > currentPos) {
                elements.push(text.substring(currentPos, match.index));
            }
            const username = match[1];
            elements.push(
                <button
                    key={i}
                    className="text-primary font-bold hover:underline cursor-pointer focus:outline-none"
                    onClick={async () => {
                        try {
                            const usersRef = collection(db, 'users');
                            const q = query(usersRef, where('username', '==', username), limit(1));
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                                router.push(`/profile/${snap.docs[0].id}`);
                            } else {
                                showToast(`User @${username} not found`, 'error');
                            }
                        } catch (err) {
                            console.error('Mention navigation failed:', err);
                        }
                    }}
                >
                    @{username}
                </button>
            );
            currentPos = match.index! + match[0].length;
        });

        if (currentPos < text.length) {
            elements.push(text.substring(currentPos));
        }

        return <>{elements}</>;
    };

    return (
        <div className="pt-2 border-t border-border">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comments ({comments.length})
            </h4>

            {/* Add Comment */}
            <div className="relative mb-4">
                {showSuggestions && (
                    <div className="absolute bottom-full left-0 w-full bg-background-tertiary border border-border rounded-lg shadow-xl mb-1 overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {mentionSuggestions.map((suggestion, idx) => (
                            <button
                                key={suggestion.uid}
                                onClick={() => handleSelectMention(suggestion.username)}
                                onMouseEnter={() => setSuggestionIndex(idx)}
                                className={`w-full flex items-center gap-2 p-2 text-sm transition-colors ${idx === suggestionIndex ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10'
                                    }`}
                            >
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-background-secondary flex-shrink-0">
                                    {suggestion.photoURL ? (
                                        <img src={suggestion.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-foreground-muted">
                                            {suggestion.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold leading-tight">@{suggestion.username}</p>
                                    <p className="text-[10px] text-foreground-muted leading-tight">{suggestion.displayName}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => {
                            setNewComment(e.target.value);
                            setCursorPos(e.target.selectionStart || 0);
                        }}
                        onSelect={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
                        onClick={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
                        placeholder="Add a comment... (Type @ to mention)"
                        maxLength={500}
                        className="flex-1 bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-foreground-muted"
                        onKeyDown={(e) => {
                            if (showSuggestions) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSuggestionIndex(prev => (prev + 1) % mentionSuggestions.length);
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSuggestionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
                                } else if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    handleSelectMention(mentionSuggestions[suggestionIndex].username);
                                } else if (e.key === 'Escape') {
                                    setShowSuggestions(false);
                                }
                            } else if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !newComment.trim()}
                        className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Comments List */}
            {loading ? (
                <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-sm text-foreground-muted italic text-center py-4">
                    No comments yet. Be the first!
                </p>
            ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-2 group">
                            <Link
                                href={`/profile/${comment.userId}`}
                                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                            >
                                {comment.userPhotoURL ? (
                                    <img
                                        src={comment.userPhotoURL}
                                        alt={comment.userName}
                                        className="w-7 h-7 rounded-full border border-border"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {comment.userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </Link>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <Link
                                        href={`/profile/${comment.userId}`}
                                        className="text-sm font-bold hover:text-primary transition-colors flex items-center gap-1.5"
                                    >
                                        <span>{comment.userName}</span>
                                        <div className="flex gap-0.5">
                                            {(comment.userBadges || []).map(badgeId => (
                                                <span key={badgeId} title={BADGES[badgeId]?.label} className="text-[10px]">
                                                    {BADGES[badgeId]?.icon}
                                                </span>
                                            ))}
                                        </div>
                                    </Link>
                                    <span className="text-[10px] text-foreground-muted">{formatTimeAgo(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm text-foreground-muted mt-0.5 break-words">{renderCommentText(comment.text)}</p>
                            </div>
                            {/* Delete button for own comments or admin */}
                            {(comment.userId === user?.uid || userRole === 'admin' || userRole === 'su') && (
                                <button
                                    onClick={() => onDeleteComment(comment.id)}
                                    className="p-1 text-foreground-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title="Delete comment"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
