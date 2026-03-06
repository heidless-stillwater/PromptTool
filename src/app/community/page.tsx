'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import CommunityGrid from '@/components/community/CommunityGrid';
import CommunityEntryModal from '@/components/community/CommunityEntryModal';
import CommunityGroupModal from '@/components/community/CommunityGroupModal';
import { AnimatePresence } from 'framer-motion';
import { useCommunity } from './useCommunity';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Icons } from '@/components/ui/Icons';
import CommunityHeader from '@/components/community/CommunityHeader';
import { useAuth } from '@/lib/auth-context';
import CommunityQuickLinks from '@/components/community/CommunityQuickLinks';
import CommunityPulseStats from '@/components/community/CommunityPulseStats';
import { SkeletonGrid, SkeletonHeader } from '@/components/ui/Skeleton';
import { useSettings } from '@/lib/context/SettingsContext';
import ManageCollectionsModal from '@/components/community/ManageCollectionsModal';

import { Suspense, useState } from 'react';

function CommunityContent() {
    const community = useCommunity();
    const router = useRouter();
    const { userLevel } = useSettings();
    const [isManageCollectionsOpen, setIsManageCollectionsOpen] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!community.user && !community.loadingEntries && !community.profile) { // Checking mostly loading state or user presence
            // We'll rely on useCommunity's internal checks or the auth context directly if needed, 
            // but useCommunity exposes user. 
            // Actually, useCommunity implementation doesn't handle redirect, so we keep it here or check user.
            router.push('/');
        }
    }, [community.user, community.loadingEntries, community.profile, router]);

    const {
        user, profile, credits, effectiveRole,
        switchRole, setAudienceMode, signOut,
        isAdmin, isSu
    } = useAuth();

    const canManageCollections = userLevel === 'master' || isAdmin || isSu;

    const availableCredits = credits?.balance || 0;

    if (!user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <DashboardHeader
                user={user}
                profile={profile}
                credits={credits}
                availableCredits={availableCredits || 0}
                isAdminOrSu={isAdmin || isSu}
                effectiveRole={effectiveRole}
                switchRole={switchRole}
                setAudienceMode={setAudienceMode}
                signOut={signOut}
            />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Global Live Stats */}
                <CommunityPulseStats />

                {/* Quick Links Bar */}
                <CommunityQuickLinks
                    activeSort={community.sortMode}
                    onSortChange={community.setSortMode}
                    thumbnails={community.quickLinkThumbnails}
                />

                {/* Page Title & Sorting */}
                <CommunityHeader
                    sortMode={community.sortMode}
                    onSortChange={community.setSortMode}
                    viewMode={community.viewMode}
                    onViewModeChange={community.setViewMode}
                    isGrouped={community.isGrouped}
                    onToggleGrouped={community.handleToggleGrouped}
                    isGroupedByUser={community.isGroupedByUser}
                    onToggleGroupedByUser={community.handleToggleGroupedByUser}
                    isGroupedByCollection={community.isGroupedByCollection}
                    onToggleGroupedByCollection={community.handleToggleGroupedByCollection}
                    filterUserName={community.filterUserName}
                    filterCollectionName={community.filterCollectionName}
                    onClearFilter={() => {
                        community.handleFilterUser(null, null);
                        community.handleFilterCollection(null, null);
                    }}
                    collections={community.collections}
                    onFilterCollection={community.handleFilterCollection}
                    onManageCollections={() => setIsManageCollectionsOpen(true)}
                    canManageCollections={canManageCollections}
                />

                {/* Entries Grid */}
                <CommunityGrid
                    entries={community.entries}
                    viewMode={community.viewMode}
                    isGrouped={community.isGrouped}
                    isGroupedByUser={community.isGroupedByUser}
                    isGroupedByCollection={community.isGroupedByCollection}
                    loadingEntries={community.loadingEntries}
                    loadingMore={community.loadingMore}
                    hasMore={community.hasMore}
                    onLoadMore={() => community.fetchEntries(true)}
                    userId={user.uid}
                    onVote={community.handleVote}
                    votingEntryId={community.votingEntryId}
                    onSelect={community.setSelectedEntry}
                    onReact={community.handleReactUpdate}
                    onFilterUser={community.handleFilterUser}
                    onFilterCollection={community.handleFilterCollection}
                    onShare={community.handleShare}
                    onSelectBatch={community.setSelectedGroup}
                    reactingEmoji={community.reactingEmoji}
                    sortMode={community.sortMode}
                    error={community.queryError}
                />
            </main>

            {/* Entry Detail Modal */}
            <AnimatePresence>
                {community.selectedEntry && (
                    <CommunityEntryModal
                        entry={community.selectedEntry}
                        onClose={() => community.setSelectedEntry(null)}
                        user={user}
                        userRole={profile.role}
                        onVote={community.handleVote}
                        isVoting={community.votingEntryId === community.selectedEntry.id}
                        isFollowing={community.isFollowing}
                        onToggleFollow={community.handleToggleFollow}
                        followLoading={community.followLoading}
                        comments={community.comments}
                        loadingComments={community.loadingComments}
                        onAddComment={community.handleAddComment}
                        onDeleteComment={community.handleDeleteComment}
                        onReact={community.handleReactUpdate}
                        reactingEmoji={community.reactingEmoji}
                        onReport={community.handleReport}
                        collections={community.collections}
                        onToggleCollection={community.handleToggleCollection}
                        onCreateCollection={community.handleCreateCollection}
                        onUnpublish={async () => community.handleUnpublishRequest()}
                        isUnpublishing={community.unpublishing}
                        onFilterUser={community.handleFilterUser}
                        onShare={community.handleShare}
                        viewerCollectionIds={community.viewerCollectionIds}
                        loadingViewerCollections={community.loadingViewerCollections}
                        onAddTag={community.handleAddTag}
                        onRemoveTag={community.handleRemoveTag}
                        onUpdatePromptSetID={community.handleUpdatePromptSetID}
                        isAdmin={community.isAdmin}
                        onToggleExemplar={community.handleToggleExemplar}
                    />
                )}
            </AnimatePresence>

            {/* Collection Management Modal */}
            <AnimatePresence>
                {isManageCollectionsOpen && (
                    <ManageCollectionsModal
                        isOpen={isManageCollectionsOpen}
                        onClose={() => setIsManageCollectionsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Batch Group Modal */}
            <AnimatePresence>
                {community.selectedGroup && (
                    <CommunityGroupModal
                        selectedGroup={community.selectedGroup}
                        onClose={() => community.setSelectedGroup(null)}
                        onEntrySelect={(entry) => {
                            community.setSelectedGroup(null);
                            community.setSelectedEntry(entry.id);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Unpublish Confirmation Modal */}
            <ConfirmationModal
                isOpen={community.showUnpublishConfirm}
                title="Remove from Community Hub"
                message="Are you sure you want to remove this entry from the Community Hub? This will permanently delete all associated votes and comments."
                confirmLabel="Remove Entry"
                cancelLabel="Keep it"
                onConfirm={community.handleUnpublish}
                onCancel={() => community.setShowUnpublishConfirm(false)}
                type="danger"
                isLoading={community.unpublishing}
            />
        </div>
    );
}

export default function CommunityPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <SkeletonHeader />
                    <SkeletonGrid count={6} columns={3} />
                </div>
            </div>
        }>
            <CommunityContent />
        </Suspense>
    );
}
