'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';

import LeagueHeader from '@/components/league/LeagueHeader';
import LeagueGrid from '@/components/league/LeagueGrid';
import LeagueEntryModal from '@/components/league/LeagueEntryModal';
import { useLeague } from './useLeague';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import QuickLinks from '@/components/league/QuickLinks';
import LeaguePulseStats from '@/components/league/LeaguePulseStats';
import { SkeletonGrid, SkeletonHeader } from '@/components/ui/Skeleton';

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
            router.push('/');
        }
    }, [league.user, league.loadingEntries, league.profile, router]);

    const { user, profile } = league;

    if (!user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <Card className="sticky top-0 z-50 rounded-none border-x-0 border-t-0 border-b border-border bg-black/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold gradient-text">
                        AI Image Studio
                    </Link>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Button
                            variant="secondary"
                            onClick={() => router.push('/league/leaderboard')}
                            className="text-sm px-4 py-2 flex items-center gap-2 border-yellow-400/30 hover:border-yellow-400 transition-colors"
                        >
                            <Icons.trophy size={16} />
                            Hall of Fame
                        </Button>
                        <Button onClick={() => router.push('/generate')}>
                            <Icons.plus size={16} className="mr-2" />
                            Generate New
                        </Button>
                        <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                            <Icons.arrowLeft size={16} className="mr-2" />
                            Dashboard
                        </Button>
                    </div>
                </div>
            </Card>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Global Live Stats */}
                <LeaguePulseStats />

                {/* Quick Links Bar */}
                <QuickLinks
                    activeSort={league.sortMode}
                    onSortChange={league.setSortMode}
                    thumbnails={league.quickLinkThumbnails}
                />

                {/* Page Title & Sorting */}
                <LeagueHeader
                    sortMode={league.sortMode}
                    onSortChange={league.setSortMode}
                    viewMode={league.viewMode}
                    onViewModeChange={league.setViewMode}
                    isGrouped={league.isGrouped}
                    onToggleGrouped={league.handleToggleGrouped}
                    isGroupedByUser={league.isGroupedByUser}
                    onToggleGroupedByUser={league.handleToggleGroupedByUser}
                    filterUserName={league.filterUserName}
                    onClearFilter={() => league.handleFilterUser(null, null)}
                />

                {/* Entries Grid */}
                <LeagueGrid
                    entries={league.entries}
                    viewMode={league.viewMode}
                    isGrouped={league.isGrouped}
                    isGroupedByUser={league.isGroupedByUser}
                    loadingEntries={league.loadingEntries}
                    loadingMore={league.loadingMore}
                    hasMore={league.hasMore}
                    onLoadMore={() => league.fetchEntries(true)}
                    userId={user.uid}
                    onVote={league.handleVote}
                    votingEntryId={league.votingEntryId}
                    onSelect={league.setSelectedEntry}
                    onReact={league.handleReactUpdate}
                    onFilterUser={league.handleFilterUser}
                    onShare={league.handleShare}
                    reactingEmoji={league.reactingEmoji}
                    sortMode={league.sortMode}
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
                    reactingEmoji={league.reactingEmoji}
                    onReport={league.handleReport}
                    collections={league.collections}
                    onToggleCollection={league.handleToggleCollection}
                    onUnpublish={league.handleUnpublish}
                    isUnpublishing={league.unpublishing}
                    onFilterUser={league.handleFilterUser}
                    onShare={league.handleShare}
                />
            )}
        </div>
    );
}

export default function LeaguePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <SkeletonHeader />
                    <SkeletonGrid count={6} columns={3} />
                </div>
            </div>
        }>
            <LeagueContent />
        </Suspense>
    );
}
