'use client';

import { useGallery } from './useGallery';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import Link from 'next/link';
import GlobalSearch from '@/components/GlobalSearch';
import GallerySidebar from '@/components/gallery/GallerySidebar';
import GalleryToolbar from '@/components/gallery/GalleryToolbar';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import ImageDetailModal from '@/components/gallery/ImageDetailModal';
import ImageGroupModal from '@/components/gallery/ImageGroupModal';

export default function GalleryPage() {
    const { user, loading: authLoading } = useAuth();
    const gallery = useGallery();

    const {
        fetchImages,
        fetchCollections,
        images,
        loadingImages,
        selectedGroup,
        selectedImage
    } = gallery;

    useEffect(() => {
        if (user) {
            fetchImages();
            fetchCollections();
        }
    }, [user, fetchImages, fetchCollections]);

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Please log in to view your gallery.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 md:px-8">
            <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row gap-8">
                {/* Collection Sidebar */}
                <GallerySidebar
                    collections={gallery.collections}
                    selectedCollectionId={gallery.selectedCollectionId}
                    onSelectCollection={gallery.setSelectedCollectionId}
                    onCreateCollection={() => gallery.setShowCreateCollection(true)}
                />

                <main className="flex-1 min-w-0">
                    <div className="flex flex-col gap-6">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-primary transition-colors mb-4 group">
                                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Dashboard
                                </Link>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                    Your Gallery
                                </h1>
                                <p className="text-foreground-muted mt-1">
                                    Manage and organize your generated images
                                </p>
                            </div>
                            <div className="w-full md:w-auto">
                                <GlobalSearch />
                            </div>
                        </div>

                        {/* Toolbar */}
                        <GalleryToolbar
                            searchQuery={gallery.searchQuery}
                            onSearchChange={gallery.setSearchQuery}
                            isGrouped={gallery.isGrouped}
                            onToggleGrouped={() => gallery.setIsGrouped(!gallery.isGrouped)}
                            selectionMode={gallery.selectionMode}
                            onToggleSelectionMode={() => gallery.setSelectionMode(!gallery.selectionMode)}
                            onClearSelection={() => gallery.setSelectedImageIds(new Set())}
                            filterTag={gallery.filterTag}
                            onFilterTagChange={gallery.setFilterTag}
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
                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-background border border-border rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
                                <span className="font-bold text-sm">
                                    {gallery.selectedImageIds.size} selected
                                </span>
                                <div className="h-4 w-px bg-border" />
                                <button
                                    onClick={gallery.handleBatchDelete}
                                    disabled={gallery.batchDeleting}
                                    className="text-error hover:text-error/80 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {gallery.batchDeleting ? <div className="spinner-xs" /> : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    )}
                                    Delete
                                </button>
                                <div className="h-4 w-px bg-border" />
                                <button
                                    onClick={() => gallery.setSelectedImageIds(new Set())}
                                    className="text-foreground-muted hover:text-foreground text-sm font-bold"
                                >
                                    Cancel
                                </button>
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
                            groupImagesByPromptSet={gallery.groupImagesByPromptSet}
                            onLoadMore={() => gallery.fetchImages(true)}
                            selectionMode={gallery.selectionMode}
                            selectedImageIds={gallery.selectedImageIds}
                            deletingId={gallery.deletingId}
                            onImageSelect={gallery.setSelectedImage}
                            onGroupSelect={gallery.setSelectedGroup}
                            onToggleImageSelection={(id) => {
                                const newSet = new Set(gallery.selectedImageIds);
                                if (newSet.has(id)) newSet.delete(id);
                                else newSet.add(id);
                                gallery.setSelectedImageIds(newSet);
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

            {/* Modals */}
            {selectedImage && (
                <ImageDetailModal
                    selectedImage={selectedImage}
                    onClose={() => gallery.setSelectedImage(null)}
                    onNext={gallery.handleNextImage}
                    onPrev={gallery.handlePrevImage}
                    collections={gallery.collections}
                    onToggleCollection={gallery.handleToggleCollection}
                    isEditingPromptSetID={gallery.isEditingPromptSetID}
                    setIsEditingPromptSetID={gallery.setIsEditingPromptSetID}
                    editingPromptSetID={gallery.editingPromptSetID}
                    setEditingPromptSetID={gallery.setEditingPromptSetID}
                    isSavingPromptSetID={gallery.isSavingPromptSetID}
                    onUpdatePromptSetID={gallery.handleUpdatePromptSetID}
                    newImageTag={gallery.newImageTag}
                    setNewImageTag={gallery.setNewImageTag}
                    isUpdatingTags={gallery.isUpdatingTags}
                    onAddTag={gallery.handleAddImageTag}
                    onRemoveTag={gallery.handleRemoveImageTag}
                    onLeagueToggle={gallery.handleLeagueToggle}
                    publishingId={gallery.publishingId}
                    onDownload={gallery.handleDownload}
                    onDelete={gallery.handleDelete}
                    deletingId={gallery.deletingId}
                />
            )}

            {selectedGroup && !selectedImage && (
                <ImageGroupModal
                    selectedGroup={selectedGroup}
                    onClose={() => gallery.setSelectedGroup(null)}
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
                />
            )}
        </div>
    );
}
