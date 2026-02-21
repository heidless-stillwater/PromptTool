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
import ConfirmationModal from '@/components/ConfirmationModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';

export default function GalleryPage() {
    const { user, loading: authLoading } = useAuth();
    const gallery = useGallery();

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

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Icons.spinner className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Please log in to view your gallery.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 md:px-8 bg-black text-white">
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all mb-4 group px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-primary/30"
                                >
                                    <Icons.arrowRight size={12} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                                    Back to Dashboard
                                </Link>
                                <div className="flex items-center gap-4">
                                    <h1 className="text-4xl font-black tracking-tighter text-white">
                                        YOUR GALLERY
                                    </h1>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-black">
                                        {gallery.filteredImages.length} ITEMS
                                    </Badge>
                                </div>
                                <p className="text-zinc-400 text-sm font-medium uppercase tracking-[0.2em] opacity-60">
                                    Manage and organize your generated masterpieces
                                </p>
                            </div>
                            <div className="w-full md:w-80">
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
                    onUpdate={gallery.handleUpdateImage}
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
        </div>
    );
}
