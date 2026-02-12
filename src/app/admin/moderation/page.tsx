'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collectionGroup } from 'firebase/firestore';
import { LeagueEntry, UserProfile, LeagueComment } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ModerationDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const [reportedEntries, setReportedEntries] = useState<LeagueEntry[]>([]);
    const [reportedComments, setReportedComments] = useState<LeagueComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchReported = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const entriesRef = collection(db, 'leagueEntries');
            // Show items with reports first, highest counts first
            const q = query(
                entriesRef,
                where('reportCount', '>', 0),
                orderBy('reportCount', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const entries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LeagueEntry));

            setReportedEntries(entries);

            // Fetch Reported Comments
            const commentsQ = query(
                collectionGroup(db, 'comments'),
                where('reportCount', '>', 0),
                orderBy('reportCount', 'desc'),
                limit(50)
            );
            const commentsSnap = await getDocs(commentsQ);
            const comments = commentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LeagueComment));
            setReportedComments(comments);

        } catch (error: any) {
            console.error('[Moderation] Fetch error:', error);
            // If it's an index error, we might not see the error message but zero results
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || (profile?.role !== 'admin' && profile?.role !== 'su')) {
            router.push('/dashboard');
            return;
        }
        fetchReported();
    }, [user, profile, authLoading, router, fetchReported]);

    const handleAction = async (entryId: string, action: 'dismiss' | 'remove') => {
        if (!user || actioningId) return;

        const confirmMsg = action === 'remove'
            ? 'Are you sure you want to PERMANENTLY REMOVE this entry from the league? This will also deduct influence points from the author.'
            : 'Dismiss all reports for this entry?';

        if (!confirm(confirmMsg)) return;

        try {
            setActioningId(entryId);
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/league/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ entryId, action })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message, 'success');
            // Refresh local list
            setReportedEntries(prev => prev.filter(e => e.id !== entryId));
        } catch (error: any) {
            console.error('[Moderation] Action error:', error);
            showToast(error.message || 'Failed to perform action', 'error');
        } finally {
            setActioningId(null);
        }
    };

    const handleCommentAction = async (comment: LeagueComment, action: 'dismiss' | 'delete') => {
        if (!user || actioningId) return;

        const confirmMsg = action === 'delete'
            ? 'Permanently DELETE this comment?'
            : 'Dismiss reports regarding this comment?';

        if (!confirm(confirmMsg)) return;

        try {
            setActioningId(comment.id);
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/comment/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    entryId: comment.entryId,
                    commentId: comment.id,
                    action
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(data.message, 'success');
            setReportedComments(prev => prev.filter(c => c.id !== comment.id));
        } catch (error: any) {
            console.error('[Moderation] Comment Action error:', error);
            showToast(error.message || 'Failed to action comment', 'error');
        } finally {
            setActioningId(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-foreground-muted font-medium animate-pulse">Loading moderation queue...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/monitoring" className="text-xl font-bold gradient-text">
                            Staff Admin
                        </Link>
                        <span className="text-border">/</span>
                        <h1 className="text-sm font-black uppercase tracking-widest text-foreground-muted">Content Moderation</h1>
                    </div>
                    <Link href="/admin/monitoring" className="btn-secondary text-xs px-4 py-2">
                        Back to Admin
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-12">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">🛡️</span>
                        <h2 className="text-4xl font-black tracking-tight">Reported Content</h2>
                    </div>
                    <p className="text-foreground-muted text-lg">
                        Review flagged items and maintain the community guidelines.
                    </p>
                </div>

                {reportedEntries.length === 0 ? (
                    <div className="glass-card rounded-3xl p-16 text-center border-dashed border-2">
                        <div className="text-6xl mb-6">✅</div>
                        <h3 className="text-2xl font-bold mb-2 text-foreground">Moderation Queue Clear!</h3>
                        <p className="text-foreground-muted">There are no reported league entries to review right now.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {reportedEntries.map((entry) => (
                            <div key={entry.id} className="glass-card rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-lg hover:shadow-xl transition-shadow border-border/50 group">
                                {/* Image Preview */}
                                <div className="md:w-64 lg:w-80 aspect-square bg-background-secondary relative overflow-hidden flex-shrink-0">
                                    <img
                                        src={entry.imageUrl}
                                        alt={entry.prompt}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4 bg-error text-white px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        {entry.reportCount} Reports
                                    </div>
                                </div>

                                {/* Content Info */}
                                <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {entry.authorPhotoURL ? (
                                                    <img src={entry.authorPhotoURL} alt={entry.authorName || 'Author Avatar'} className="w-8 h-8 rounded-full border border-border" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                                        {entry.authorName.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-sm">{entry.authorName}</p>
                                                    <p className="text-[10px] text-foreground-muted uppercase tracking-tighter">Contributor</p>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/profile/${entry.originalUserId}`}
                                                target="_blank"
                                                className="text-primary hover:underline text-xs font-bold"
                                            >
                                                View Profile ↗
                                            </Link>
                                        </div>

                                        <div className="bg-background-secondary/50 rounded-2xl p-4 border border-border/30">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted block mb-2">Prompt</label>
                                            <p className="text-sm italic leading-relaxed text-foreground-muted line-clamp-3">&quot;{entry.prompt}&quot;</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border/50">
                                        <button
                                            onClick={() => handleAction(entry.id, 'dismiss')}
                                            disabled={actioningId === entry.id}
                                            className="flex-1 btn-secondary text-sm py-2.5 hover:bg-success/10 hover:text-success hover:border-success/30 disabled:opacity-50"
                                        >
                                            {actioningId === entry.id ? 'Processing...' : 'Dismiss Reports'}
                                        </button>
                                        <button
                                            onClick={() => handleAction(entry.id, 'remove')}
                                            disabled={actioningId === entry.id}
                                            className="flex-1 bg-error hover:bg-error-hover text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-error/20 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {actioningId === entry.id ? 'Processing...' : '🚫 Remove Entry'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Reported Comments Section */}
                <div className="mt-20 mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">💬</span>
                        <h2 className="text-3xl font-black tracking-tight">Reported Comments</h2>
                    </div>
                    <p className="text-foreground-muted">User comments flagged for review.</p>
                </div>

                {reportedComments.length === 0 ? (
                    <div className="glass-card rounded-3xl p-10 text-center border-dashed border-2 opacity-70">
                        <div className="text-4xl mb-4">✨</div>
                        <h3 className="text-xl font-bold mb-1 text-foreground">No Reported Comments</h3>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reportedComments.map((comment) => (
                            <div key={comment.id} className="glass-card p-6 flex flex-col md:flex-row gap-6 border-l-4 border-l-error bg-error/5">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold bg-error text-white px-2 py-0.5 rounded-full">{comment.reportCount} Reports</span>
                                            <span className="text-xs text-foreground-muted">
                                                ID: {comment.id}
                                            </span>
                                        </div>
                                        <Link href={`/league?entry=${comment.entryId}`} target="_blank" className="text-xs font-bold text-primary hover:underline">
                                            View Context ↗
                                        </Link>
                                    </div>
                                    <p className="text-lg font-medium p-4 bg-background/50 rounded-xl border border-border/50 italic">
                                        &quot;{comment.text}&quot;
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                                        <span>User ID: {comment.userId}</span>
                                        <span>•</span>
                                        <span>{comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleString() : 'Unknown date'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center gap-2 min-w-[150px]">
                                    <button
                                        onClick={() => handleCommentAction(comment, 'dismiss')}
                                        disabled={actioningId === comment.id}
                                        className="btn-secondary text-xs py-2 hover:bg-success/10 hover:text-success hover:border-success/30"
                                    >
                                        Dismiss All
                                    </button>
                                    <button
                                        onClick={() => handleCommentAction(comment, 'delete')}
                                        disabled={actioningId === comment.id}
                                        className="btn-primary bg-error hover:bg-error-hover text-xs py-2 shadow-none border-error/20"
                                    >
                                        Delete Comment
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
