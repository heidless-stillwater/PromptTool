'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { Icons } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// Sub-components
import { useState } from 'react';
import ProfileHero from '@/components/profile/ProfileHero';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfilePortfolio from '@/components/profile/ProfilePortfolio';
import FollowListModal from '@/components/profile/FollowListModal';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/lib/auth-context';

export default function ProfileClient() {
    const auth = useAuth();
    const {
        user: authUser,
        profile: authProfile,
        credits: authCredits,
        effectiveRole: authEffectiveRole,
        switchRole: authSwitchRole,
        setAudienceMode: authSetAudienceMode,
        signOut: authSignOut,
        isAdmin: authIsAdmin,
        isSu: authIsSu
    } = auth;

    const availableCredits = authCredits?.balance || 0;

    const profile = useProfile();
    const {
        author, images, communityEntries, communityEntryMap, loading, authLoading, queryError, stats,
        isFollowingProfile, followLoadingProfile, selectedEntry,
        currentUser, viewMode, setViewMode, isGrouped, setIsGrouped, showOnlyCommunity, setShowOnlyCommunity,
        handleToggleFollowProfile, formatDate,
        setSelectedEntry,
        comments, loadingComments, votingEntryId,
        isFollowingEntry, followLoadingEntry, reactingEmoji,
        handleVote, handleReactUpdate, handleAddComment, handleDeleteComment, handleReport,
        handleToggleFollowEntry, handleUnpublish, handleToggleCollection, handleCreateCollection,
        unpublishing, userRole,
        collections, viewerCollectionIds, loadingViewerCollections
    } = profile;

    const [followModal, setFollowModal] = useState<{ open: boolean, type: 'followers' | 'following' }>({
        open: false,
        type: 'followers'
    });

    const handleStatClick = (type: 'followers' | 'following') => {
        setFollowModal({ open: true, type });
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Icons.spinner className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Loading Creator Profile</p>
                </div>
            </div>
        );
    }

    if (!author) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <DashboardHeader
                user={authUser}
                profile={authProfile}
                credits={authCredits}
                availableCredits={availableCredits}
                isAdminOrSu={authIsAdmin || authIsSu}
                effectiveRole={authEffectiveRole}
                switchRole={authSwitchRole}
                setAudienceMode={authSetAudienceMode}
                signOut={authSignOut}
            />

            <main className="max-w-5xl mx-auto px-4 py-12">
                <ProfileHero
                    author={author}
                    currentUser={currentUser}
                    isFollowing={isFollowingProfile}
                    followLoading={followLoadingProfile}
                    onToggleFollow={handleToggleFollowProfile}
                    formatDate={formatDate}
                />

                <div className="bg-background-secondary/50 rounded-[2.5rem] p-10 mb-12 border border-border/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted">Creator Impact</h3>
                    </div>
                    <ProfileStats
                        influence={stats.totalVotes}
                        creations={stats.totalEntries}
                        followers={author.followerCount || 0}
                        following={author.followingCount || 0}
                        onStatClick={handleStatClick}
                    />
                </div>

                <ProfilePortfolio
                    images={images}
                    communityEntries={communityEntries}
                    communityEntryMap={communityEntryMap}
                    currentUser={currentUser}
                    userRole={userRole}
                    selectedEntry={selectedEntry}
                    setSelectedEntry={setSelectedEntry}
                    queryError={queryError}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    isGrouped={isGrouped}
                    onToggleGrouped={() => setIsGrouped(g => !g)}
                    showOnlyCommunity={showOnlyCommunity}
                    onToggleOnlyCommunity={() => setShowOnlyCommunity(s => !s)}

                    // Interaction props
                    comments={comments}
                    loadingComments={loadingComments}
                    votingEntryId={votingEntryId}
                    isFollowingEntry={isFollowingEntry}
                    followLoadingEntry={followLoadingEntry}
                    onVote={handleVote}
                    onReact={handleReactUpdate}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onToggleFollowEntry={handleToggleFollowEntry}
                    onReport={handleReport}
                    onUnpublishEntry={handleUnpublish}
                    isUnpublishingEntry={unpublishing}
                    reactingEmoji={reactingEmoji}
                    collections={collections}
                    viewerCollectionIds={viewerCollectionIds}
                    loadingViewerCollections={loadingViewerCollections}
                    onToggleCollection={handleToggleCollection}
                    onCreateCollection={handleCreateCollection}
                />
            </main>

            <FollowListModal
                isOpen={followModal.open}
                onClose={() => setFollowModal(prev => ({ ...prev, open: false }))}
                userId={author.uid}
                type={followModal.type}
                title={followModal.type === 'followers' ? 'Followers' : 'Following'}
            />
        </div>
    );
}
