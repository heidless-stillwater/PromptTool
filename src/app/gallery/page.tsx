'use client';

import { useGallery } from './useGallery';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { Suspense } from 'react';

function GalleryContent() {
    const { user, loading: authLoading } = useAuth();
    const gallery = useGallery();
    const searchParams = useSearchParams();
    const router = useRouter();

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
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all group px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-primary/30"
                                    >
                                        <Icons.arrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                                        Dashboard
                                    </Link>
                                    <Link
                                        href="/community"
                                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all group px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-primary/30 shadow-lg shadow-primary/5"
                                    >
                                        <Icons.users size={12} className="text-primary/70" />
                                        Community Hub
                                    </Link>
                                </div>
                                <div className="flex items-center gap-4">
                                    <h1 className="text-4xl font-black tracking-tighter text-white">
                                        {gallery.viewMode === 'personal' ? 'YOUR GALLERY' :
                                            gallery.viewMode === 'admin' ? 'ADMIN FEED' : 'GLOBAL FEED'}
                                    </h1>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-black">
                                        {gallery.filteredImages.length} ITEMS
                                    </Badge>
                                </div>
                                <p className="text-zinc-400 text-sm font-medium uppercase tracking-[0.2em] opacity-60">
                                    Manage and organize your generated masterpieces
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                                <div className="w-full sm:w-80">
                                    <GlobalSearch />
                                </div>
                                {gallery.viewMode === 'personal' && (
                                    <button
                                        id="new-image-set-btn"
                                        onClick={() => router.push('/generate')}
                                        className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-white overflow-hidden transition-all duration-300 shadow-lg hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap"
                                        style={{
                                            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
                                        }}
                                    >
                                        {/* shimmer */}
                                        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                            style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)', backgroundSize: '200% 100%' }}
                                        />
                                        <Icons.plus size={14} className="flex-shrink-0" />
                                        New Image Set
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
            <div className="min-h-screen flex items-center justify-center">
                <Icons.spinner className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <GalleryContent />
        </Suspense>
    );
}
