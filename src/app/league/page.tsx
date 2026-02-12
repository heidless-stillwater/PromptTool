'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';

import LeagueHeader from '@/components/league/LeagueHeader';
import LeagueGrid from '@/components/league/LeagueGrid';
import LeagueEntryModal from '@/components/league/LeagueEntryModal';
import { useLeague } from './useLeague';

import { Suspense } from 'react';

function LeagueContent() {
    const league = useLeague();
    const router = useRouter();

    // Redirect if not logged in
    useEffect(() => {
        if (!league.user && !league.loadingEntries && !league.profile) { // Checking mostly loading state or user presence
            // We'll rely on useLeague's internal checks or the auth context directly if needed, 
            // but useLeague exposes user. 
            // Actually, useLeague implementation doesn't handle redirect, so we keep it here or check user.
        }
    }, [league.user, router]); // Basic check

    // Better to handle auth redirect in a standard way or rely on middleware if available. 
    // For now, mirroring original logic:
    const { user, profile } = league;

    if (!user || !profile) {
        // Show loading or redirect
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

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
                        <Link href="/league/leaderboard" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-yellow-400/30 hover:border-yellow-400 transition-colors">
                            <span>🏆</span> Hall of Fame
                        </Link>
                        <Link href="/generate" className="btn-primary text-sm px-4 py-2">
                            + Generate New
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">
                            ← Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Page Title & Sorting */}
                <LeagueHeader
                    sortMode={league.sortMode}
                    onSortChange={league.setSortMode}
                />

                {/* Entries Grid */}
                <LeagueGrid
                    entries={league.entries}
                    loadingEntries={league.loadingEntries}
                    loadingMore={league.loadingMore}
                    hasMore={league.hasMore}
                    onLoadMore={() => league.fetchEntries(true)}
                    userId={user.uid}
                    onVote={league.handleVote}
                    votingEntryId={league.votingEntryId}
                    onSelect={league.setSelectedEntry}
                    onReact={league.handleReactUpdate}
                    error={league.queryError}
                />
            </main>

            {/* Entry Detail Modal */}
            {league.selectedEntry && (
                <LeagueEntryModal
                    entry={league.selectedEntry}
                    onClose={() => league.setSelectedEntry(null)}
                    user={user}
                    userRole={profile.role}
                    onVote={league.handleVote}
                    isVoting={league.votingEntryId === league.selectedEntry.id}
                    isFollowing={league.isFollowing}
                    onToggleFollow={league.handleToggleFollow}
                    followLoading={league.followLoading}
                    comments={league.comments}
                    loadingComments={league.loadingComments}
                    onAddComment={league.handleAddComment}
                    onDeleteComment={league.handleDeleteComment}
                    onReact={league.handleReactUpdate}
                    onReport={league.handleReport}
                />
            )}
        </div>
    );
}

export default function LeaguePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
            <LeagueContent />
        </Suspense>
    );
}
