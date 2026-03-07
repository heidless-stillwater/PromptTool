'use client';

import { useGallery } from './useGallery';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GallerySidebar from '@/components/gallery/GallerySidebar';
import GalleryToolbar from '@/components/gallery/GalleryToolbar';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import ImageDetailModal from '@/components/gallery/ImageDetailModal';
import ImageGroupModal from '@/components/gallery/ImageGroupModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icons';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';

function GalleryContent() {
    const {
        user,
        profile,
        credits,
        effectiveRole,
        isAdmin,
        isSu,
        signOut,
        switchRole,
        setAudienceMode,
        loading: authLoading
    } = useAuth();
    const gallery = useGallery();
    const searchParams = useSearchParams();
    const router = useRouter();

    const availableCredits = credits?.balance || 0;

    const {
        fetchImages,
        fetchCollections,
        images,
        loadingImages,
        selectedGroup,
        selectedImage,
        confirmationState,
        confirmDelete,
        cancelDelete
    } = gallery;

    useEffect(() => {
        if (user) {
            fetchImages();
            fetchCollections();
        }
    }, [user, fetchImages, fetchCollections]);

    // Handle deep-linking to a specific variation set
    useEffect(() => {
        const setId = searchParams.get('set');
        if (setId && images.length > 0 && !selectedGroup) {
            const group = images.filter(img => img.promptSetID === setId);
            if (group.length > 0) {
                gallery.setSelectedGroup(group);
            }
        }
    }, [searchParams, images, selectedGroup, gallery]);

    // Handle deep-linking to a specific image
    useEffect(() => {
        const imageId = searchParams.get('imageId');
        if (imageId && images.length > 0 && !selectedImage) {
            const image = images.find(img => img.id === imageId);
            if (image) {
                gallery.setSelectedImage(image);
            }
        }
    }, [searchParams, images, selectedImage, gallery]);

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#020203]"><Icons.spinner className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020203]">
                <p>Please log in to view your gallery.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020203] text-white">
            <DashboardHeader
                user={user}
                profile={profile}
                credits={credits}
                availableCredits={availableCredits}
                isAdminOrSu={isAdmin || isSu}
                effectiveRole={effectiveRole}
                switchRole={switchRole}
                setAudienceMode={setAudienceMode}
                signOut={signOut}
            />

            <div className="absolute inset-x-0 top-[73px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_60%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.05),transparent_60%)] pointer-events-none" />

            <div className="max-w-[1920px] mx-auto px-6 md:px-10 py-10 relative z-10">
                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 md:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.4)] flex flex-col lg:flex-row gap-12">
                    {/* Collection Sidebar */}
                    <GallerySidebar
                        collections={gallery.collections}
                        selectedCollectionId={gallery.selectedCollectionId}
                        onSelectCollection={gallery.setSelectedCollectionId}
                        onCreateCollection={() => gallery.setShowCreateCollection(true)}
                    />

                    <main className="flex-1 min-w-0">
                        <div className="flex flex-col gap-10">
                            {/* Inner Page Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-6 mb-4">
                                        <h1 className="text-3xl font-black uppercase tracking-[0.4em] text-white">
                                            {gallery.viewMode === 'personal' ? 'Vault' :
                                                gallery.viewMode === 'admin' ? 'Operations Feed' : 'Neural Commons'}
                                        </h1>
                                        <div className="h-6 w-px bg-white/10" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                                            {gallery.filteredImages.length} Artifacts
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                                        Architectural storage for high-fidelity generated intelligence
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {gallery.viewMode === 'personal' && (
                                        <button
                                            id="new-image-set-btn"
                                            onClick={() => router.push('/generate')}
                                            className="group relative inline-flex items-center justify-center gap-4 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(99,102,241,0.2)] hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap bg-primary"
                                        >
                                            <Icons.zap size={16} className="text-white group-hover:rotate-12 transition-transform" />
                                            Initialize Sequence
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Toolbar */}
                            <GalleryToolbar
                                viewMode={gallery.viewMode}
                                setViewMode={gallery.setViewMode}
                                isSu={gallery.isSu}
                                isGrouped={gallery.isGrouped}
                                onToggleGrouped={() => gallery.setIsGrouped(!gallery.isGrouped)}
                                showHoverOverlay={gallery.showHoverOverlay}
                                onToggleHoverOverlay={() => gallery.setShowHoverOverlay(!gallery.showHoverOverlay)}
                                selectionMode={gallery.selectionMode}
                                onToggleSelectionMode={() => gallery.setSelectionMode(!gallery.selectionMode)}
                                onClearSelection={() => gallery.setSelectedImageIds(new Set())}
                                filterTag={gallery.filterTag}
                                onFilterTagChange={gallery.setFilterTag}
                                filterExemplar={gallery.filterExemplar}
                                onFilterExemplarChange={gallery.setFilterExemplar}
                                filterQuality={gallery.filterQuality}
                                onFilterQualityChange={gallery.setFilterQuality}
                                filterAspectRatio={gallery.filterAspectRatio}
                                onFilterAspectRatioChange={gallery.setFilterAspectRatio}
                                collections={gallery.collections}
                                showAdvancedFilters={gallery.showAdvancedFilters}
                                onToggleAdvancedFilters={() => gallery.setShowAdvancedFilters(!gallery.showAdvancedFilters)}
                                filterSeed={gallery.filterSeed}
                                onFilterSeedChange={gallery.setFilterSeed}
                                filterGuidanceMin={gallery.filterGuidanceMin}
                                onFilterGuidanceMinChange={gallery.setFilterGuidanceMin}
                                filterGuidanceMax={gallery.filterGuidanceMax}
                                onFilterGuidanceMaxChange={gallery.setFilterGuidanceMax}
                                filterHasNegativePrompt={gallery.filterHasNegativePrompt}
                                onFilterHasNegativePromptChange={gallery.setFilterHasNegativePrompt}
                                onClearAdvancedFilters={() => {
                                    gallery.setFilterSeed('');
                                    gallery.setFilterGuidanceMin('');
                                    gallery.setFilterGuidanceMax('');
                                    gallery.setFilterHasNegativePrompt('all');
                                }}
                            />

                            {/* Batch Action Bar */}
                            {gallery.selectionMode && gallery.selectedImageIds.size > 0 && (
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-500">
                                    <Card className="flex items-center gap-6 px-6 py-4 shadow-2xl border-primary/30 bg-background/95 backdrop-blur-md ring-1 ring-white/5" variant="glass">
                                        <div className="flex items-center gap-3 pr-6 border-r border-border/50">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 animate-in zoom-in duration-300">
                                                {gallery.selectedImageIds.size}
                                            </div>
                                            <span className="text-sm font-black uppercase tracking-widest text-foreground opacity-80">Selected</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    const allIds = new Set(gallery.images.map(img => img.id));
                                                    gallery.setSelectedImageIds(allIds);
                                                }}
                                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-background-secondary hover:bg-background-secondary/80"
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => gallery.setSelectedImageIds(new Set())}
                                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-background-secondary hover:bg-background-secondary/80"
                                            >
                                                Clear
                                            </Button>
                                            <div className="w-px h-6 bg-border/50 mx-1" />
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={gallery.handleBatchDelete}
                                                disabled={gallery.batchDeleting}
                                                isLoading={gallery.batchDeleting}
                                                className="!bg-error hover:!bg-error-hover h-9 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-error/20 border-0"
                                            >
                                                <Icons.delete size={14} className="mr-2" />
                                                Delete
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Grid */}
                            <GalleryGrid
                                images={gallery.images}
                                filteredImages={gallery.filteredImages}
                                loadingImages={gallery.loadingImages}
                                loadingMore={gallery.loadingMore}
                                hasMore={gallery.hasMore}
                                isGrouped={gallery.isGrouped}
                                showHoverOverlay={gallery.showHoverOverlay}
                                groupImagesByPromptSet={gallery.groupImagesByPromptSet}
                                onLoadMore={() => gallery.fetchImages(true)}
                                selectionMode={gallery.selectionMode}
                                selectedImageIds={gallery.selectedImageIds}
                                deletingId={gallery.deletingId}
                                onImageSelect={gallery.setSelectedImage}
                                onGroupSelect={gallery.setSelectedGroup}
                                onToggleImageSelection={(id: string) => {
                                    gallery.setSelectedImageIds(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(id)) newSet.delete(id);
                                        else newSet.add(id);
                                        return newSet;
                                    });
                                }}
                                onToggleGroupSelection={(ids: string[]) => {
                                    gallery.setSelectedImageIds(prev => {
                                        const newSet = new Set(prev);
                                        const allSelected = ids.every(id => newSet.has(id));
                                        if (allSelected) ids.forEach(id => newSet.delete(id));
                                        else ids.forEach(id => newSet.add(id));
                                        return newSet;
                                    });
                                }}
                                onDeleteImage={gallery.handleDelete}
                                onClearFilters={() => {
                                    gallery.setSearchQuery('');
                                    gallery.setFilterQuality('all');
                                    gallery.setFilterAspectRatio('all');
                                    gallery.setFilterTag('all');
                                    gallery.setSelectedCollectionId(null);
                                    gallery.setFilterSeed('');
                                    gallery.setFilterGuidanceMin('');
                                    gallery.setFilterGuidanceMax('');
                                    gallery.setFilterHasNegativePrompt('all');
                                }}
                            />
                        </div>
                    </main>
                </div>

            </div>

            {/* Modals outside z-10 context to ensure they stay on top of sticky header */}
            <AnimatePresence>
                {selectedImage && (
                    <ImageDetailModal
                        selectedImage={selectedImage}
                        onClose={() => gallery.setSelectedImage(null)}
                        onNext={gallery.handleNextImage}
                        onPrev={gallery.handlePrevImage}
                        collections={gallery.collections}
                        onUpdate={gallery.handleUpdateImage}
                        onDelete={gallery.handleDelete}
                        deletingId={gallery.deletingId}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedGroup && !selectedImage && (
                    <ImageGroupModal
                        selectedGroup={selectedGroup}
                        onClose={() => {
                            gallery.setSelectedGroup(null);
                            if (searchParams.get('set')) {
                                router.replace('/gallery', { scroll: false });
                            }
                        }}
                        onImageSelect={gallery.setSelectedImage}
                        collections={gallery.collections}
                        onBatchToggleCollection={gallery.handleBatchToggleCollection}
                        showCreateCollection={gallery.showCreateCollection}
                        setShowCreateCollection={gallery.setShowCreateCollection}
                        newCollectionName={gallery.newCollectionName}
                        setNewCollectionName={gallery.setNewCollectionName}
                        onCreateCollection={gallery.handleCreateCollection}
                        creatingCollection={gallery.creatingCollection}
                        collectionError={gallery.collectionError}
                        setCollectionError={gallery.setCollectionError}
                        onDeleteImages={gallery.deleteImages}
                        onUpdatePromptSetName={(name) => gallery.handleUpdatePromptSetName(selectedGroup, name)}
                    />
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmationState}
                title={confirmationState?.type === 'batch' ? 'Delete Images' : 'Delete Image'}
                message={confirmationState?.type === 'batch'
                    ? `Are you sure you want to delete ${gallery.selectedImageIds.size} images? This action cannot be undone.`
                    : 'Are you sure you want to delete this image? This action cannot be undone.'}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                type="danger"
                isLoading={gallery.deletingId !== null || gallery.batchDeleting}
            />

            {/* Unpublish Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!gallery.unpublishConfirmImage}
                title="Remove from Community Hub"
                message="Are you sure you want to remove this image from the Community Hub? This will delete all associated votes and comments."
                confirmLabel="Remove from Hub"
                cancelLabel="Keep it"
                onConfirm={gallery.confirmUnpublish}
                onCancel={() => gallery.setUnpublishConfirmImage(null)}
                type="danger"
                isLoading={gallery.publishingId !== null}
            />

        </div>
    );
}

export default function GalleryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#020203]">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <GalleryContent />
        </Suspense>
    );
}
