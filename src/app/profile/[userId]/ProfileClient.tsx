'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import NotificationBell from '@/components/NotificationBell';

// Sub-components
import ProfileHero from '@/components/profile/ProfileHero';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfilePortfolio from '@/components/profile/ProfilePortfolio';

export default function ProfileClient() {
    const {
        author, entries, loading, authLoading, queryError, stats,
        isFollowing, followLoading, selectedEntry, showReportModal, isReporting,
        currentUser, handleToggleFollow, handleConfirmReport, formatDate,
        setSelectedEntry, setShowReportModal
    } = useProfile();

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!author) return null;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Link href="/league" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                            <span>🏆</span> Community League
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-12">
                <ProfileHero
                    author={author}
                    currentUser={currentUser}
                    isFollowing={isFollowing}
                    followLoading={followLoading}
                    onToggleFollow={handleToggleFollow}
                    formatDate={formatDate}
                />

                <div className="bg-background-secondary/30 rounded-3xl p-8 mb-12 border border-border/50">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground-muted mb-6">Creator Impact</h3>
                    <ProfileStats
                        influence={stats.totalVotes}
                        creations={stats.totalEntries}
                        followers={author.followerCount || 0}
                        following={author.followingCount || 0}
                    />
                </div>

                <ProfilePortfolio
                    entries={entries}
                    currentUser={currentUser}
                    selectedEntry={selectedEntry}
                    setSelectedEntry={setSelectedEntry}
                    showReportModal={showReportModal}
                    setShowReportModal={setShowReportModal}
                    isReporting={isReporting}
                    onConfirmReport={handleConfirmReport}
                    queryError={queryError}
                />
            </main>
        </div>
    );
}
